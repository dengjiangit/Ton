import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
  Alert,
  AlertIcon,
  Select,
  Divider,
  Flex,
  Spacer,
  Image,
  InputGroup,
  InputRightElement,
  useClipboard,
  SimpleGrid,
} from '@chakra-ui/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowBackIcon } from '@chakra-ui/icons'
import DiscordLogo from '../assets/discord-v2-svgrepo-com.svg'
import TelegramLogo from '../assets/telegram-logo-svgrepo-com.svg'
import TwitterLogo from '../assets/twitter-color-svgrepo-com.svg'
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { useTokenInfo } from '../hooks/useTokenInfo'
import { TokenInfo, TokenName } from '../components/TokenInfo'
import { WalletStatus } from '../components/WalletStatus'
import { validateRedPacketParams, generateShareLink, formatSOL } from '../utils'
import { QRCodeCanvas } from 'qrcode.react'
import { generateMerkleTree, MerkleLeaf } from '../utils/merkleUtils'
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import idl from '../constants/red_packet.json'
import { PublicKey, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js'
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createSyncNativeInstruction, getAccount } from '@solana/spl-token'
import { getTokenProgramId, isToken2022 } from '../utils/tokenProgram'
import { SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from '@solana/web3.js'
import { ComputeBudgetProgram } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { RED_PACKET_PROGRAM_ID, RED_PACKET_SEED, USER_STATE_SEED, CREATOR_STATE_SEED, SOL_MINT_ADDRESS, buildApiUrl, RPC_ENDPOINT } from '../config/constants'
import { ipfsService, IPFSWhitelistData } from '../services/ipfsService'
import ShareComponent from '../components/ShareComponent'
import '../styles/animations.css'

// Discriminator constants for new contract methods
// Updated contract split create_redpacket into two specialized methods
const CREATE_SOL_REDPACKET_DISCRIMINATOR = Buffer.from([151, 100, 202, 15, 74, 108, 135, 87])
const CREATE_TOKEN_REDPACKET_DISCRIMINATOR = Buffer.from([131, 37, 226, 57, 229, 238, 72, 66])

// Error code mapping table (updated based on new IDL)
const ERROR_MAP: Record<number, string> = {
  6000: 'Invalid red packet type',
  6001: 'Invalid Merkle root',
  6002: 'Red packet expired',
  6003: 'You have already claimed this red packet',
  6004: 'Invalid claim amount',
  6005: 'Insufficient funds in red packet',
  6006: 'Invalid Merkle proof',
  6007: 'Merkle proof too long',
  6008: 'Red packet not expired, cannot refund',
  6009: 'No permission for this operation',
  6010: 'No funds to refund',
  6011: 'Invalid number of red packets',
  6012: 'Total amount too low',
  6013: 'Expiry days must be between 1 and 30',
  6014: 'Invalid expiry time',
  6015: 'Too many expiry modifications',
  6016: 'No red packets left to claim',
  6017: 'Random number generation error',
  6018: 'Invalid red packet ID',
  6019: 'Invalid Mint address',
  6020: 'Invalid associated token account (ATA)',
  6021: 'Invalid account owner',
  6022: 'Insufficient funds in claimer account',
  6023: 'Counter overflow',
};

function encodeCreateRedpacketArgs(totalAmount: BN, packetCount: number, redPacketType: number, merkleRoot: Buffer | null, expiryDays: number | null, randomSeed: BN | null) {
  // total_amount(u64) + packet_count(u32) + red_packet_type(u8) + merkle_root(Option<[u8;32]>) + expiry_days(Option<i64>) + random_seed(Option<u64>)
  // 8 + 4 + 1 + (1 + 32) + (1 + 8) + (1 + 8) = 63 bytes (removed is_sol parameter)
  const buffer = Buffer.alloc(100); // Allocate a buffer large enough
  let offset = 0;

  // total_amount: u64
  buffer.writeBigUInt64LE(BigInt(totalAmount.toString()), offset);
  offset += 8;

  // packet_count: u32
  buffer.writeUInt32LE(packetCount, offset);
  offset += 4;

  // red_packet_type: u8
  buffer.writeUInt8(redPacketType, offset);
  offset += 1;

  // merkle_root: Option<[u8; 32]>
  if (merkleRoot && merkleRoot.length === 32) {
    buffer.writeUInt8(1, offset); // Some
    offset += 1;
    merkleRoot.copy(buffer, offset);
    offset += 32;
  } else {
    buffer.writeUInt8(0, offset); // None
    offset += 1;
  }

  // expiry_days: Option<i64>
  if (expiryDays !== null && expiryDays !== undefined) {
    buffer.writeUInt8(1, offset); // Some
    offset += 1;
    buffer.writeBigInt64LE(BigInt(expiryDays), offset);
    offset += 8;
  } else {
    buffer.writeUInt8(0, offset); // None
    offset += 1;
  }

  // random_seed: Option<u64>
  if (randomSeed !== null && randomSeed !== undefined) {
    buffer.writeUInt8(1, offset); // Some
    offset += 1;
    buffer.writeBigUInt64LE(BigInt(randomSeed.toString()), offset);
    offset += 8;
  } else {
    buffer.writeUInt8(0, offset); // None
    offset += 1;
  }

  return buffer.slice(0, offset);
}



export const CreateRedPacket: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  // AppKit wallet
  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('solana')

  const publicKey = useMemo(() => {
    if (!address) return null;
    try {
      return new PublicKey(address);
    } catch {
      return null;
    }
  }, [address]);

  const connected = isConnected && !!publicKey;

  // Debug wallet connection status (only log once when connected)
  useEffect(() => {
    if (connected) {
      console.log('Wallet connection status debug:');
      console.log('- address:', address);
      console.log('- isConnected:', isConnected);
      console.log('- publicKey:', publicKey?.toString());
      console.log('- connected:', connected);
      console.log('- walletProvider:', walletProvider);
      console.log('- walletProvider methods:', walletProvider ? Object.keys(walletProvider) : 'none');
    }
  }, [connected]); // Only trigger when connection status changes

  // Get the type parameter from URL to determine which mode to show
  const getInitialMode = (): 'redpacket' | 'whitelist' => {
    const urlParams = new URLSearchParams(location.search);
    const type = urlParams.get('type');
    return type === 'airdrop' ? 'whitelist' : 'redpacket';
  };

  // Create wallet object compatible with existing code
  const wallet = useMemo(() => {
    if (!publicKey || !walletProvider) return undefined;
    return {
      publicKey,
      signTransaction: async (tx: any) => {
        try {
          // Check if walletProvider has signTransaction method
          if (walletProvider && typeof (walletProvider as any).signTransaction === 'function') {
            const signedTx = await (walletProvider as any).signTransaction(tx);
            return signedTx;
          } else {
            console.error('walletProvider does not have signTransaction method');
            throw new Error('Wallet provider does not support transaction signing');
          }
        } catch (error) {
          console.error('AppKit transaction signing failed:', error);
          throw error;
        }
      },
      signAllTransactions: async (txs: any[]) => {
        try {
          // console.log('Using AppKit to sign multiple transactions...');
          // Check if walletProvider has signAllTransactions method
          if (walletProvider && typeof (walletProvider as any).signAllTransactions === 'function') {
            const signedTxs = await (walletProvider as any).signAllTransactions(txs);
            return signedTxs;
          } else {
            console.error('walletProvider does not have signAllTransactions method');
            throw new Error('Wallet provider does not support multiple transaction signing');
          }
        } catch (error) {
          console.error('AppKit multiple transaction signing failed:', error);
          throw error;
        }
      },
    };
  }, [publicKey, walletProvider]);

  // Temporarily comment out useRedPacket as it uses old wallet adapter
  // const { createRedPacket, loading, getBalance } = useRedPacket()
  const loading = false;

  // Create unified connection instance
  const connection = useMemo(() => new Connection(RPC_ENDPOINT, 'confirmed'), []);

  const [amount, setAmount] = useState('')
  const [count, setCount] = useState('')
  const [message, setMessage] = useState('Congratulations, good luck!')
  const [shareLink, setShareLink] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [balance, setBalance] = useState(0)
  const [mode, setMode] = useState<'redpacket' | 'whitelist'>(getInitialMode())
  const [whitelistText, setWhitelistText] = useState('')
  const [whitelistFileName, setWhitelistFileName] = useState('')
  const [randomAmount, setRandomAmount] = useState(true)
  const [maxPerPerson, setMaxPerPerson] = useState(0)
  const [expiry, setExpiry] = useState('3d')
  const [tokenAddress, setTokenAddress] = useState('')
  const [communityLink, setCommunityLink] = useState('')
  // Individual social media links
  const [twitterLink, setTwitterLink] = useState('')
  const [telegramLink, setTelegramLink] = useState('')
  const [discordLink, setDiscordLink] = useState('')

  // Get token information
  const { tokenInfo, loading: tokenLoading, error: tokenError, displayName } = useTokenInfo(
    tokenAddress.trim() || undefined
  )
  const { onCopy } = useClipboard(tokenAddress)
  const totalAddresses = 100
  const amountPerAddress = 100
  const totalAmount = 10000
  const estimatedFee = 0.015
  const [cid, setCid] = useState('')
  const [creating, setCreating] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [merkleRoot, setMerkleRoot] = useState<string>('')
  const [uploadingToIPFS, setUploadingToIPFS] = useState(false)
  const [ipfsCID, setIpfsCID] = useState('')
  const [lastTransactionSignature, setLastTransactionSignature] = useState<string>('')
  // const [simulationResult, setSimulationResult] = useState<any>(null)
  // const [pendingTransaction, setPendingTransaction] = useState<Transaction | null>(null)
  // Token 2022 detection state
  const [isToken2022Detected, setIsToken2022Detected] = useState(false)
  const [tokenTypeChecking, setTokenTypeChecking] = useState(false)
  // Step 2 submission loading state
  const [submittingStep2, setSubmittingStep2] = useState(false)
  // Share link
  const shareUrl = shareLink;





  // Get wallet balance
  useEffect(() => {
    if (connected && publicKey) {
      connection.getBalance(publicKey).then((balance: number) => {
        setBalance(balance / LAMPORTS_PER_SOL)
      })
    }
  }, [connected, publicKey, connection])

  // Real-time Token 2022 detection
  useEffect(() => {
    const checkTokenType = async () => {
      if (!tokenAddress || tokenAddress.trim() === '') {
        setIsToken2022Detected(false)
        setTokenTypeChecking(false)
        return
      }

      try {
        // Validate address format first
        new PublicKey(tokenAddress.trim())
      } catch {
        setIsToken2022Detected(false)
        setTokenTypeChecking(false)
        return
      }

      setTokenTypeChecking(true)

      try {
        // console.log('Real-time checking if token is Token 2022:', tokenAddress.trim())
        const isT2022 = await isToken2022(connection, tokenAddress.trim())
        setIsToken2022Detected(isT2022)

        if (isT2022) {
          // console.log('⚠️ Token 2022 detected:', tokenAddress.trim())
        } else {
          // console.log('✅ Standard SPL Token detected:', tokenAddress.trim())
        }
      } catch (error) {
        console.error('Failed to check token type in real-time:', error)
        setIsToken2022Detected(false)
      } finally {
        setTokenTypeChecking(false)
      }
    }

    // Debounce the check to avoid too many API calls
    const timeoutId = setTimeout(checkTokenType, 500)
    return () => clearTimeout(timeoutId)
  }, [tokenAddress, connection])

  // Count valid whitelist addresses and amount
  let whitelistAddresses: string[] = []
  let whitelistAmount = 0
  if (mode === 'whitelist' && whitelistText.trim()) {
    whitelistAddresses = whitelistText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.split(',').length >= 2)
    if (whitelistAddresses.length > 0) {
      const firstAmount = whitelistAddresses[0].split(',')[1].trim()
      whitelistAmount = parseFloat(firstAmount) || 0
    }
  }

  function parseWhitelistInput(input: string): MerkleLeaf[] {
    if (!input || !input.trim()) {
      return [];
    }

    try {
      // Determine if it's SOL and token decimals
      const isSol = !tokenAddress || tokenAddress.trim() === '';
      // If it's SPL token but tokenInfo hasn't loaded yet, use default value 9 to avoid errors
      let decimals = 9;
      let symbolName = 'SOL';

      if (isSol) {
        decimals = 9;
        symbolName = 'SOL';
      } else {
        // For SPL tokens, use real value if tokenInfo is loaded, otherwise use default value
        if (tokenInfo && typeof tokenInfo.decimals === 'number') {
          decimals = tokenInfo.decimals;
          symbolName = tokenInfo.symbol || 'Token';
        } else {
          // When tokenInfo is not loaded, use default value to avoid errors
          decimals = 9;
          symbolName = 'Token';
        }
      }

      const minAmount = 1 / Math.pow(10, decimals);

      return input
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map((line, index) => {
          const parts = line.split(',');
          if (parts.length < 2) {
            throw new Error(`Line ${index + 1} format error: need address,amount two parts`);
          }

          const [claimer, amount] = parts;
          const claimerTrimmed = claimer ? claimer.trim() : '';
          const amountStr = amount ? amount.trim() : '';

          // Validate address format
          if (!claimerTrimmed) {
            throw new Error(`Line ${index + 1} address cannot be empty`);
          }

          // Validate amount string
          if (!amountStr) {
            throw new Error(`Line ${index + 1} amount cannot be empty`);
          }

          const amountNum = Number(amountStr);

          // Validate amount
          if (isNaN(amountNum) || !isFinite(amountNum) || amountNum <= 0) {
            throw new Error(`Line ${index + 1} amount must be greater than 0, current value: ${amountStr}`);
          }

          // Check if amount is too small
          if (amountNum < minAmount) {
            throw new Error(`Line ${index + 1} amount too small, minimum value is ${minAmount} ${symbolName}`);
          }

          // Validate converted value
          const amountInSmallestUnit = Math.floor(amountNum * Math.pow(10, decimals));

          if (!isFinite(amountInSmallestUnit) || amountInSmallestUnit <= 0) {
            throw new Error(`Line ${index + 1} amount conversion failed: ${amountStr}`);
          }

          return {
            claimer: claimerTrimmed,
            amount: amountInSmallestUnit // Store as smallest unit
          };
        });
    } catch (error) {
      console.error('Failed to parse whitelist input:', error);
      throw error;
    }
  }

  const handleCreate = async () => {
    // console.log('=== handleCreate started ===');
    // console.log('mode:', mode);
    // console.log('whitelistText:', whitelistText);
    // console.log('merkleRoot state:', merkleRoot);

    // Prevent multiple submissions
    if (submittingStep2) {
      // console.log('Step 2 submission in progress, ignoring duplicate request');
      return;
    }

    setSubmittingStep2(true);

    try {
      // Enhanced parameter validation (refer to test code)
      if (mode === 'redpacket') {
        // Red packet mode validation
        const countNum = parseInt(count) || 0;
        const amountNum = parseFloat(amount) || 0;

        if (countNum <= 0 || countNum > 100000) {
          toast({
            title: 'Parameter validation failed',
            description: 'The number of red packets must be between 1 and 100,000',
            status: 'error',
            duration: 3000,
          })
          return
        }

        if (amountNum <= 0) {
          toast({
            title: 'Parameter validation failed',
            description: 'The total amount must be greater than 0',
            status: 'error',
            duration: 3000,
          })
          return
        }

        // Verify if total amount is sufficient for allocation
        const minTotalAmount = countNum * 0.000000001; // At least 1 lamport per share
        if (amountNum < minTotalAmount) {
          toast({
            title: 'Parameter validation failed',
            description: `Total amount insufficient for allocation to ${countNum} red packets. At least ${minTotalAmount.toFixed(9)} ${displayName} is required`,
            status: 'error',
            duration: 3000,
          })
          return
        }
      } else {
        // Whitelist mode validation
        let leaves: MerkleLeaf[];
        try {
          leaves = parseWhitelistInput(whitelistText);
        } catch (error: any) {
          toast({
            title: 'Whitelist format error',
            description: error.message || 'Please check whitelist format',
            status: 'error',
            duration: 5000
          });
          return;
        }

        if (leaves.length === 0) {
          toast({
            title: 'Whitelist cannot be empty',
            description: 'Please enter whitelist data',
            status: 'error',
            duration: 3000
          });
          return;
        }

        // Check whitelist size limit (must match contract limit)
        if (leaves.length > 100000) {
          toast({
            title: 'Whitelist size exceeds limit',
            description: `Maximum ${100000} addresses allowed, but found ${leaves.length} addresses`,
            status: 'error',
            duration: 5000,
          });
          return;
        }

        // Validate whitelist format
        for (let i = 0; i < leaves.length; i++) {
          const leaf = leaves[i];
          if (!leaf.claimer || leaf.amount <= 0) {
            toast({
              title: 'Whitelist format error',
              description: `Incorrect format in row ${i + 1}: ${whitelistText.split('\n')[i]}`,
              status: 'error',
              duration: 5000,
            });
            return;
          }

          // Validate address format
          try {
            new PublicKey(leaf.claimer);
          } catch (err) {
            toast({
              title: 'Whitelist address invalid',
              description: `Incorrect format in row ${i + 1}: ${leaf.claimer}`,
              status: 'error',
              duration: 5000,
            });
            return;
          }
        }

        try {
          const { root } = generateMerkleTree(leaves);
          const rootHex = root.toString('hex');
          setMerkleRoot(rootHex);
        } catch (error) {
          console.error('Failed to generate Merkle Root:', error);
          toast({
            title: 'Failed to process whitelist',
            description: 'Error generating Merkle tree',
            status: 'error',
            duration: 5000,
          });
          return;
        }
      }

      // Check if the token is Token 2022 (not supported)
      if (tokenAddress && tokenAddress.trim() !== '') {
        try {
          const isT2022 = await isToken2022(connection, tokenAddress.trim());
          if (isT2022) {
            toast({
              title: 'Token 2022 Not Supported',
              description: 'Sorry, the current version does not support Token 2022 (SPL Token 2022) tokens. Please use standard SPL Token instead.',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
            return;
          }
        } catch (error) {
          console.error('Failed to check token type:', error);
          toast({
            title: 'Token Detection Failed',
            description: 'Unable to detect token type, please check if the token address is correct.',
            status: 'error',
            duration: 3000,
          });
          return;
        }
      }

      // Save community links (if user has filled them)
      const hasAnyLink = twitterLink.trim() || telegramLink.trim() || discordLink.trim();

      if (hasAnyLink) {
        try {
          // Submit all community links at once
          const requestBody = {
            creator: publicKey?.toString() || '',
            discord_url: discordLink.trim() || '',
            mint: tokenAddress.trim() || SOL_MINT_ADDRESS, // 如果没有tokenAddress则使用SOL官方mint地址
            tg_url: telegramLink.trim() || '',
            x_url: twitterLink.trim() || '',
            contract_address: RED_PACKET_PROGRAM_ID.toString() // 添加合约地址参数
          };

          const response = await fetch(buildApiUrl('/api/community_link/save_community_link'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          const linkCount = [twitterLink.trim(), telegramLink.trim(), discordLink.trim()].filter(Boolean).length;
          toast({
            title: 'Community links saved',
            description: `Saved ${linkCount} community links`,
            status: 'success',
            duration: 3000,
          });
        } catch (error) {
          // Community link save failure does not block main flow, only show warning
          toast({
            title: 'Failed to save community links',
            description: 'But does not affect red packet creation',
            status: 'warning',
            duration: 3000,
          });
        }
      }

      // Validation passed, proceed to next step
      setCurrentStep(3);
    } catch (error) {
      // console.error('Error in step 2 submission:', error);
      // Error handling is already done in individual sections above
      // No need to show additional error toast here
    } finally {
      setSubmittingStep2(false);
    }
  }

  // Contract call method for step 2
  const handleContractCreate = async () => {
    if (!wallet || !publicKey) {
      toast({
        title: 'Please connect wallet',
        status: 'error',
        duration: 3000,
      })
      return
    }

    // Prevent duplicate submission check
    if (creating) {
      // console.log('Transaction in progress, ignoring duplicate request');
      return;
    }

    setCreating(true)

    try {
      // console.log('=== Starting red packet creation ===')

      // 1. Determine red packet parameters
      const isSol = !tokenAddress || tokenAddress.trim() === '';
      let totalAmountBN: BN;
      let packetCount: number;
      let redPacketType: number;
      let merkleRootBuffer: Buffer | null = null;
      let randomSeed: BN | null = null;

      if (mode === 'whitelist') {
        // Whitelist mode
        const leaves = parseWhitelistInput(whitelistText);
        const totalAmount = leaves.reduce((sum, leaf) => sum + leaf.amount, 0);
        totalAmountBN = new BN(totalAmount);
        packetCount = leaves.length;
        redPacketType = 2; // Whitelist type
        if (merkleRoot) {
          merkleRootBuffer = Buffer.from(merkleRoot, 'hex');
        }
      } else {
        // Normal mode
        const amountNum = parseFloat(amount) || 0;
        const countNum = parseInt(count) || 0;

        if (isSol) {
          totalAmountBN = new BN(Math.floor(amountNum * LAMPORTS_PER_SOL));
        } else {
          const tokenDecimals = tokenInfo?.decimals || 9;
          totalAmountBN = new BN(Math.floor(amountNum * Math.pow(10, tokenDecimals)));
        }
        packetCount = countNum;
        redPacketType = randomAmount ? 1 : 0; // 0=fixed amount, 1=random amount
        if (randomAmount) {
          randomSeed = new BN(Math.floor(Math.random() * 1000000));
        }
      }

      const expiryDays = parseInt(expiry.replace('d', ''));


      // console.log('Red packet parameters:', {
      //   totalAmount: totalAmountBN.toString(),
      //   packetCount,
      //   redPacketType,
      //   isSol,
      //   expiryDays,
      // });

      // 2. Calculate PDA addresses
      const [creatorStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from(CREATOR_STATE_SEED), publicKey.toBuffer()],
        RED_PACKET_PROGRAM_ID
      );

      // 3. Check and initialize creator_state account
      let creatorStateInfo = await connection.getAccountInfo(creatorStatePda);
      if (!creatorStateInfo) {
        // console.log('Initializing creator_state account...');

        const initIx = new TransactionInstruction({
          keys: [
            { pubkey: creatorStatePda, isSigner: false, isWritable: true },
            { pubkey: publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          programId: RED_PACKET_PROGRAM_ID,
          data: Buffer.from([133, 18, 167, 91, 115, 223, 51, 249]), // initialize_creator_state discriminator
        });

        const initTx = new Transaction().add(initIx);
        initTx.feePayer = publicKey;
        initTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const signedInitTx = await wallet.signTransaction(initTx);
        const initSig = await connection.sendRawTransaction(signedInitTx.serialize());
        await connection.confirmTransaction(initSig, 'confirmed');

        // console.log('creator_state initialization successful:', initSig);

        // Re-fetch account info
        creatorStateInfo = await connection.getAccountInfo(creatorStatePda);
      }

      // 4. Get next red packet ID
      if (!creatorStateInfo || creatorStateInfo.data.length < 17) {
        throw new Error('creator_state account data exception');
      }

      const nextRedPacketId = creatorStateInfo.data.readBigUInt64LE(8);
      const redPacketIdBN = new BN(nextRedPacketId.toString());

      // console.log('Next red packet ID:', redPacketIdBN.toString());

      // 5. Calculate red packet PDA
      const [redPacketPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(RED_PACKET_SEED),
          publicKey.toBuffer(),
          redPacketIdBN.toArrayLike(Buffer, "le", 8),
        ],
        RED_PACKET_PROGRAM_ID
      );

      // console.log('Red packet PDA address:', redPacketPda.toString());

      // 6. Set account addresses
      let mint: PublicKey;
      let creatorAta: PublicKey;
      let poolAta: PublicKey;
      let tokenProgramId = TOKEN_PROGRAM_ID; // Declare in advance

      if (isSol) {
        mint = SystemProgram.programId; // SOL uses system program ID as mint
        creatorAta = publicKey; // In SOL mode, creator_ata is the creator
        poolAta = redPacketPda; // In SOL mode, pool_ata is the red packet account
      } else {
        mint = new PublicKey(tokenAddress);
        // 🔥 Key fix: get token program ID first, then calculate ATA
        tokenProgramId = await getTokenProgramId(connection, mint);
        // console.log('Detected token program:', tokenProgramId.toString() === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' ? 'Token 2022' : 'SPL Token');

        // Use correct token program ID to calculate ATA addresses
        creatorAta = await getAssociatedTokenAddress(
          mint,
          publicKey,
          false,
          tokenProgramId,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        poolAta = await getAssociatedTokenAddress(
          mint,
          redPacketPda,
          true,
          tokenProgramId,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
      }

      // 7. Balance check
      if (isSol) {
        const balance = await connection.getBalance(publicKey);
        const required = totalAmountBN.toNumber() + 5_000_000; // Red packet amount + creation fee
        if (balance < required) {
          throw new Error(`SOL balance insufficient, need ${required / LAMPORTS_PER_SOL} SOL`);
        }
      } else {
        // Check token balance - handling both SPL Token and Token 2022
        const tokenTypeStr = tokenProgramId.toString() === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' ? 'Token 2022' : 'SPL Token';

        try {
          // First check if ATA account exists
          const ataInfo = await connection.getAccountInfo(creatorAta);
          if (!ataInfo) {
            throw new Error(`You do not have this ${tokenTypeStr} token account, please add this token to your wallet or perform a receive operation once`);
          }

          const tokenAccount = await getAccount(connection, creatorAta, 'confirmed', tokenProgramId);
          if (Number(tokenAccount.amount) < totalAmountBN.toNumber()) {
            throw new Error(`${tokenTypeStr} balance insufficient`);
          }

          // console.log(`✅ ${tokenTypeStr} balance check passed:`, Number(tokenAccount.amount));
        } catch (error: any) {
          // console.error(`❌ ${tokenTypeStr} balance check failed:`, error);
          if (error.message.includes('could not find account') || error.message.includes('TokenAccountNotFoundError')) {
            throw new Error(`${tokenTypeStr} account does not exist, please ensure your wallet has this token. You can first let someone send a small amount of this token to you to create account.`);
          }
          throw error;
        }

        // Check SOL balance (for paying fees)
        const solBalance = await connection.getBalance(publicKey);
        if (solBalance < 5_000_000) {
          throw new Error('SOL balance insufficient, unable to pay creation fee');
        }
      }

      // 8. tokenProgramId has been set above

      // 9. Build transaction instruction
      const feeReceiver = new PublicKey("15hPXzWgid1UWUKnp4KvtZEbaNUCWkPK79cb5uqHysf");

      // console.log('Account info:', {
      //   creator: publicKey.toString(),
      //   creatorState: creatorStatePda.toString(),
      //   redPacket: redPacketPda.toString(),
      //   mint: mint.toString(),
      //   creatorAta: creatorAta.toString(),
      //   poolAta: poolAta.toString(),
      //   feeReceiver: feeReceiver.toString(),
      //   tokenProgram: tokenProgramId.toString(),
      //   isSol: isSol
      // });

      let createIx: TransactionInstruction;

      // Use specialized contract methods based on token type
      // This provides better type safety and eliminates is_sol parameter
      if (isSol) {
        // Create SOL red packet using create_sol_redpacket method
        createIx = new TransactionInstruction({
          keys: [
            { pubkey: publicKey, isSigner: true, isWritable: true }, // creator
            { pubkey: creatorStatePda, isSigner: false, isWritable: true }, // creator_state
            { pubkey: redPacketPda, isSigner: false, isWritable: true }, // red_packet
            { pubkey: feeReceiver, isSigner: false, isWritable: true }, // fee_receiver
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // rent
          ],
          programId: RED_PACKET_PROGRAM_ID,
          data: Buffer.concat([
            CREATE_SOL_REDPACKET_DISCRIMINATOR, // create_sol_redpacket discriminator
            encodeCreateRedpacketArgs(
              totalAmountBN,
              packetCount,
              redPacketType,
              merkleRootBuffer,
              expiryDays,
              randomSeed
            )
          ])
        });
      } else {
        // Create Token red packet using create_token_redpacket method
        createIx = new TransactionInstruction({
          keys: [
            { pubkey: publicKey, isSigner: true, isWritable: true }, // creator
            { pubkey: creatorStatePda, isSigner: false, isWritable: true }, // creator_state
            { pubkey: redPacketPda, isSigner: false, isWritable: true }, // red_packet
            { pubkey: mint, isSigner: false, isWritable: false }, // mint
            { pubkey: creatorAta, isSigner: false, isWritable: true }, // creator_ata
            { pubkey: poolAta, isSigner: false, isWritable: true }, // pool_ata
            { pubkey: feeReceiver, isSigner: false, isWritable: true }, // fee_receiver
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
            { pubkey: tokenProgramId, isSigner: false, isWritable: false }, // token_program (dynamic selection)
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // associated_token_program
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // rent
          ],
          programId: RED_PACKET_PROGRAM_ID,
          data: Buffer.concat([
            CREATE_TOKEN_REDPACKET_DISCRIMINATOR, // create_token_redpacket discriminator
            encodeCreateRedpacketArgs(
              totalAmountBN,
              packetCount,
              redPacketType,
              merkleRootBuffer,
              expiryDays,
              randomSeed
            )
          ])
        });
      }

      // 9. Build transaction - Add ATA creation instructions if needed
      const tx = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
      );

      // For Token red packets, check and create ATA accounts if they don't exist
      if (!isSol) {
        // Check if pool ATA account exists, create if not
        const poolAtaInfo = await connection.getAccountInfo(poolAta);
        if (!poolAtaInfo) {
          // console.log('Creating pool ATA account for red packet:', poolAta.toString());
          const createPoolAtaIx = createAssociatedTokenAccountInstruction(
            publicKey, // payer
            poolAta, // ata
            redPacketPda, // owner (red packet PDA)
            mint, // mint
            tokenProgramId, // token program
            ASSOCIATED_TOKEN_PROGRAM_ID // associated token program
          );
          tx.add(createPoolAtaIx);
        }
      }

      // Add the main create instruction
      tx.add(createIx);

      tx.feePayer = publicKey;
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;

      // console.log('Sending transaction...');

      // console.log('【Create Red Packet】Transaction details:', {
      //   totalAmount: `${(totalAmountBN.toNumber() / (isSol ? 1e9 : Math.pow(10, tokenInfo?.decimals || 9))).toFixed(6)} ${isSol ? 'SOL' : (tokenInfo?.symbol || 'Token')}`,
      //   packetCount,
      //   redPacketType: redPacketType === 0 ? 'Fixed amount' : redPacketType === 1 ? 'Random amount' : 'Whitelist',
      //   isSol,
      //   method: isSol ? 'create_sol_redpacket' : 'create_token_redpacket'
      // })

      // Send transaction
      const signedTx = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        maxRetries: 3
      });

      // console.log('Transaction sent:', signature);
      // console.log('Waiting for transaction confirmation...');

      // Wait for transaction confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // console.log('Red packet created successfully!', signature);

      // Save transaction signature
      setLastTransactionSignature(signature);

      toast({
        title: 'Red packet created successfully',
        description: `Transaction hash: ${signature}`,
        status: 'success',
        duration: 6000,
      });

      // 10. Handle whitelist IPFS upload and generate share link
      let finalIpfsCID = '';

      if (mode === 'whitelist' && whitelistText.trim()) {
        try {
          const leaves = parseWhitelistInput(whitelistText);

          // Convert to IPFSWhitelistData format
          const whitelistData: IPFSWhitelistData = {
            redPacketId: redPacketIdBN.toString(),
            creator: publicKey.toBase58(),
            timestamp: Date.now(),
            merkleRoot: merkleRoot,
            entries: leaves.map(leaf => ({
              claimer: leaf.claimer,
              amount: leaf.amount
            })),
            metadata: {
              totalAmount: leaves.reduce((sum, leaf) => sum + leaf.amount, 0),
              totalAddresses: leaves.length,
              tokenAddress: tokenAddress.trim() || undefined,
              tokenName: tokenInfo?.name || undefined
            }
          };

          const cid = await ipfsService.uploadWhitelistToIPFS(whitelistData);
          // console.log('Whitelist data uploaded to IPFS successfully:', cid);
          finalIpfsCID = cid;
          setIpfsCID(cid);
        } catch (error) {
          console.error('IPFS upload failed:', error);
        }
      }

      // 11. Generate share link - use latest CID and include red packet address
      const tokenNameParam = `&tokenName=${encodeURIComponent(tokenInfo?.name || 'Unknown')}`;
      const tokenContractParam = tokenAddress ? `&tokenContract=${encodeURIComponent(tokenAddress)}` : '';
      const ipfsCIDParam = finalIpfsCID ? `&ipfsCID=${finalIpfsCID}` : '';
      const redPacketAddressParam = `&redPacket=${redPacketPda.toBase58()}`;
      const newShareLink = `${window.location.origin}/claim?id=${redPacketIdBN.toString()}&creator=${publicKey.toBase58()}&mode=${mode}`
        + `&redPacketType=${redPacketType}`
        + `&isSol=${isSol}`
        + (tokenAddress ? `&tokenAddress=${tokenAddress}` : '')
        + tokenNameParam
        + tokenContractParam
        + ipfsCIDParam
        + redPacketAddressParam;

      setShareLink(newShareLink);
      setCurrentStep(4);

    } catch (error: any) {
      console.error('Red packet creation failed:', error);

      // Parse error message
      let errorMessage = 'Creation failed';
      if (error.message) {
        if (error.message.includes('0x')) {
          const errorCode = parseInt(error.message.match(/0x[\da-f]+/i)?.[0] || '0', 16);
          errorMessage = ERROR_MAP[errorCode] || error.message;
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: 'Red packet creation failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setCreating(false);
    }
  }

  // Handle Back button click, if creating then interrupt transaction
  const handleBackClick = () => {
    if (creating && abortController) {
      // Interrupt ongoing transaction
      abortController.abort()
      toast({
        title: 'Transaction cancelled',
        description: 'The transaction has been cancelled by user',
        status: 'warning',
        duration: 3000,
      })
    } else {
      // Normal return to previous step
      setCurrentStep(2)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      status: 'success',
      duration: 2000,
    })
  }

  return (
    <Box minH="100vh" bg="linear-gradient(180deg, #fff 0%, #e9e9e9 100%)" css={{ overflowX: 'hidden' }}>
      {/* Header navigation is now handled uniformly by Header component */}

      {/* Content area */}
      <Box minH="calc(100vh-72px)" display="flex" flexDirection="column" alignItems="center" justifyContent="center" pt="72px">
        {currentStep === 1 && (
          <VStack spacing={2} align="center" w="100%" mt="20px">
            <Text fontSize="3xl" fontWeight="bold" color="gray.900" textAlign="center" w="100%">
              Create New {mode === 'redpacket' ? 'Red Packet' : 'Airdrop'}
            </Text>
            <Box bg="white" borderRadius="xl" boxShadow="2xl" px={8} py={6} w="500px" maxW="98vw" minH="400px" position="relative">
              {/* Top-left corner mode icon and text */}
              <Box position="absolute" top="-80px" left="-80px" zIndex={10}>
                <Box position="relative" display="inline-block">
                  {/* <Image
                    src={'/redpacket-parachute.png'}
                    alt={mode === 'redpacket' ? 'Red Packet' : 'Airdrop'}
                    boxSize="160px"
                    objectFit="contain"
                  /> */}
                  <Box
                    position="absolute"
                    bottom="8px"
                    left="50%"
                    transform="translateX(-50%) scale(0.7)"
                    bg="rgba(0, 0, 0, 0)"
                    color="white"
                    px={2}
                    py={1}
                    borderRadius="md"
                    fontSize="12px"
                    fontWeight="bold"
                    whiteSpace="nowrap"
                    boxShadow="sm"
                  >
                    {mode === 'redpacket' ? 'Red Packet' : 'Airdrop'}
                  </Box>
                </Box>
              </Box>

              <VStack spacing={4} align="stretch" color="gray.800">
                <Text fontWeight="bold" fontSize="md" textAlign="center" mb={2} mt={2}>Step 1: deposit tokens into the AIDR contract</Text>
                <FormControl>
                  <FormLabel color="gray.800" textAlign="center">Enter Your Token Contract</FormLabel>
                  <InputGroup>
                    <Input
                      value={tokenAddress}
                      onChange={e => setTokenAddress(e.target.value)}
                      placeholder="Token Contract Address (Leave empty to use SOL)"
                      color="gray.800"
                      _placeholder={{ color: 'gray.500' }}
                    />
                  </InputGroup>

                  {/* Token information display */}
                  {tokenAddress.trim() && (
                    <Box mt={2}>
                      {/* Token 2022 warning (highest priority) */}
                      {isToken2022Detected && (
                        <Alert status="error" size="sm" mb={2}>
                          <AlertIcon />
                          <Box>
                            <Text fontSize="sm" fontWeight="bold">⚠️ Token 2022 Not Supported</Text>
                            <Text fontSize="xs" color="red.600">
                              Current version does not support SPL Token 2022 tokens. Please use standard SPL Token instead.
                            </Text>
                          </Box>
                        </Alert>
                      )}

                      {/* Token type checking indicator */}
                      {tokenTypeChecking && (
                        <Alert status="info" size="sm" mb={2}>
                          <AlertIcon />
                          <Text fontSize="sm">Detecting token type...</Text>
                        </Alert>
                      )}

                      {/* Token information */}
                      {!isToken2022Detected && (
                        <>
                          {tokenLoading ? (
                            <HStack>
                              <Text fontSize="sm" color="gray.500">Getting token information...</Text>
                            </HStack>
                          ) : tokenError ? (
                            <Alert status="warning" size="sm">
                              <AlertIcon />
                              <Text fontSize="sm">{tokenError}</Text>
                            </Alert>
                          ) : tokenInfo ? (
                            <Box bg="green.50" border="1px solid" borderColor="green.200" borderRadius="md" p={3}>
                              <TokenInfo mintAddress={tokenAddress.trim()} showDetails={true} size="sm" />
                            </Box>
                          ) : (
                            <Alert status="info" size="sm">
                              <AlertIcon />
                              <Text fontSize="sm">Token information not found, will use original address</Text>
                            </Alert>
                          )}
                        </>
                      )}
                    </Box>
                  )}
                </FormControl>

                {/* If no token address is entered, show common token selection */}
                {!tokenAddress.trim() && (
                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={2}>Or select common tokens:</Text>
                    <SimpleGrid columns={2} spacing={2}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTokenAddress('')}
                        bg={!tokenAddress ? 'blue.50' : 'white'}
                        borderColor={!tokenAddress ? 'blue.300' : 'gray.300'}
                        color={!tokenAddress ? 'blue.700' : 'gray.700'}
                        fontWeight={!tokenAddress ? 'semibold' : 'normal'}
                        _hover={{
                          bg: !tokenAddress ? 'blue.100' : 'gray.50',
                          color: !tokenAddress ? 'blue.800' : 'gray.800'
                        }}
                      >
                        SOL
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTokenAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')}
                        bg={tokenAddress === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'blue.50' : 'white'}
                        borderColor={tokenAddress === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'blue.300' : 'gray.300'}
                        color={tokenAddress === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'blue.700' : 'gray.700'}
                        fontWeight={tokenAddress === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'semibold' : 'normal'}
                        _hover={{
                          bg: tokenAddress === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'blue.100' : 'gray.50',
                          color: tokenAddress === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'blue.800' : 'gray.800'
                        }}
                      >
                        USDC
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTokenAddress('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')}
                        bg={tokenAddress === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' ? 'blue.50' : 'white'}
                        borderColor={tokenAddress === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' ? 'blue.300' : 'gray.300'}
                        color={tokenAddress === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' ? 'blue.700' : 'gray.700'}
                        fontWeight={tokenAddress === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' ? 'semibold' : 'normal'}
                        _hover={{
                          bg: tokenAddress === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' ? 'blue.100' : 'gray.50',
                          color: tokenAddress === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' ? 'blue.800' : 'gray.800'
                        }}
                      >
                        USDT
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTokenAddress('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R')}
                        bg={tokenAddress === '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' ? 'blue.50' : 'white'}
                        borderColor={tokenAddress === '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' ? 'blue.300' : 'gray.300'}
                        color={tokenAddress === '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' ? 'blue.700' : 'gray.700'}
                        fontWeight={tokenAddress === '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' ? 'semibold' : 'normal'}
                        _hover={{
                          bg: tokenAddress === '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' ? 'blue.100' : 'gray.50',
                          color: tokenAddress === '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' ? 'blue.800' : 'gray.800'
                        }}
                      >
                        RAY
                      </Button>
                    </SimpleGrid>
                  </Box>
                )}
              </VStack>
            </Box>
            {/* Button area */}
            <HStack mt={6} spacing={8} justify="center">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                minW="120px"
                color="gray.800"
                bg="white"
                _hover={{ bg: 'gray.100' }}
                _active={{ bg: 'gray.200' }}
              >Back</Button>
              <Button
                colorScheme="blue"
                minW="120px"
                maxW="160px"
                color="white"
                bg="blue.500"
                _hover={{ bg: 'blue.600' }}
                _active={{ bg: 'blue.700' }}
                onClick={() => setCurrentStep(2)}
                isLoading={!!tokenAddress.trim() && (tokenLoading || tokenTypeChecking)}
                loadingText={tokenTypeChecking ? "Checking token type..." : "Querying..."}
                isDisabled={!!tokenAddress.trim() && (tokenLoading || tokenTypeChecking || isToken2022Detected)}
              >Next</Button>
            </HStack>
          </VStack>
        )}
        {currentStep === 2 && (
          <VStack spacing={2} align="center" w="100%" >
            <Text fontSize="3xl" fontWeight="bold" color="gray.900" textAlign="center" w="100%">
              Create New {mode === 'redpacket' ? 'Red Packet' : 'Airdrop'}
            </Text>
            {/* Floating form card */}
            <Box bg="white" borderRadius="xl" boxShadow="2xl" px={4} py={3} w="500px" maxW="98vw" minH="400px" position="relative">
              {/* Top-left corner mode icon and text */}
              <Box position="absolute" top="-80px" left="-80px" zIndex={10}>
                <Box position="relative" display="inline-block">
                  {/* <Image
                    src={'/redpacket-parachute.png'}
                    alt={mode === 'redpacket' ? 'Red Packet' : 'Airdrop'}
                    boxSize="160px"
                    objectFit="contain"
                  /> */}
                  <Box
                    position="absolute"
                    bottom="8px"
                    left="50%"
                    transform="translateX(-50%) scale(0.7)"
                    bg="rgba(0, 0, 0, 0)"
                    color="white"
                    px={2}
                    py={1}
                    borderRadius="md"
                    fontSize="12px"
                    fontWeight="bold"
                    whiteSpace="nowrap"
                    boxShadow="sm"
                  >
                    {mode === 'redpacket' ? 'Red Packet' : 'Airdrop'}
                  </Box>
                </Box>
              </Box>

              <VStack spacing={0} align="stretch" color="gray.800">
                <Text fontWeight="bold" fontSize="md" textAlign="center" mb={2} mt={2}>
                  Step 2: Set {mode === 'redpacket' ? 'Red Packet' : 'Whitelist Airdrop'} Parameters
                </Text>
                <Divider mb={0} />
                {/* Form content with dividers to simulate table */}
                <Box as="form">
                  {mode === "redpacket" && (
                    <VStack spacing={0} align="stretch">
                      <HStack py={0}>
                        <FormLabel color="gray.800" minW="140px" mb={0}>Total airdrop amount:</FormLabel>
                        <Input
                          type="number"
                          value={amount}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const value = e.target.value;
                            // Allow empty value or valid numbers (including decimals)
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setAmount(value);
                            }
                          }}
                          min={0.000000001}
                          max={1000000}
                          step={0.000000001}
                          placeholder="Enter amount (decimals supported)"
                          color="gray.800"
                          _placeholder={{ color: 'gray.500' }}
                          flex={1}
                        />
                      </HStack>
                      <Divider />
                      <HStack py={1}>
                        <FormLabel color="gray.800" minW="140px" mb={0}>Number of recipients:</FormLabel>
                        <Input
                          type="number"
                          value={count}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const value = e.target.value;
                            // Allow empty value or valid positive integers
                            if (value === '' || /^\d+$/.test(value)) {
                              setCount(value);
                            }
                          }}
                          min={1}
                          max={100000}
                          step={1}
                          placeholder="Enter number of recipients"
                          color="gray.800"
                          _placeholder={{ color: 'gray.500' }}
                          flex={1}
                        />
                      </HStack>
                      <Divider />
                      <HStack py={2} align="center">
                        <FormLabel color="gray.800" minW="140px" mb={0}>Amount type:</FormLabel>
                        <HStack spacing={2} flex={1}>
                          <HStack spacing={0}>
                            <input
                              type="radio"
                              name="amountType"
                              checked={randomAmount === true}
                              onChange={() => setRandomAmount(true)}
                              style={{ marginRight: 4 }}
                            />
                            <Text color="gray.800">Random</Text>
                          </HStack>
                          <HStack spacing={0}>
                            <input
                              type="radio"
                              name="amountType"
                              checked={randomAmount === false}
                              onChange={() => setRandomAmount(false)}
                              style={{ marginRight: 2 }}
                            />
                            <Text color="gray.800">Equal</Text>
                          </HStack>
                        </HStack>
                      </HStack>
                      <Divider />
                      <HStack py={2} align="center">
                        <FormLabel color="gray.800" minW="140px" mb={0}>Set expiry time:</FormLabel>
                        <Select
                          value={expiry}
                          onChange={e => {
                            // console.log('🕒 User changed expiry time from', expiry, 'to', e.target.value);
                            setExpiry(e.target.value);
                          }}
                          color="gray.800"
                          bg="white"
                          borderColor="gray.300"
                          _placeholder={{ color: 'gray.500' }}
                          maxW="120px"
                        >
                          <option value="1d">1 Day</option>
                          <option value="3d">3 Days (Default)</option>
                          <option value="7d">1 Week</option>
                          <option value="30d">1 Month</option>
                        </Select>
                      </HStack>
                      <Divider />
                      <VStack spacing={3} py={2} align="stretch">
                        <Text color="gray.800" fontWeight="medium" mb={0}>Community links (optional):</Text>

                        <HStack>
                          <HStack color="gray.600" minW="100px" fontSize="sm">
                            <img src={TwitterLogo} alt="Twitter" width={14} height={14} />
                            <Text>Twitter:</Text>
                          </HStack>
                          <Input
                            value={twitterLink}
                            onChange={(e) => setTwitterLink(e.target.value)}
                            placeholder="Claimers can join the community via this link."
                            color="gray.800"
                            _placeholder={{ color: 'gray.500' }}
                            flex={1}
                          />
                        </HStack>

                        <HStack>
                          <HStack color="gray.600" minW="100px" fontSize="sm" spacing={1}>
                            <img src={TelegramLogo} alt="Telegram" width={14} height={14} />
                            <Text>Telegram:</Text>
                          </HStack>
                          <Input
                            value={telegramLink}
                            onChange={(e) => setTelegramLink(e.target.value)}
                            placeholder="Claimers can join the community via this link."
                            color="gray.800"
                            _placeholder={{ color: 'gray.500' }}
                            flex={1}
                          />
                        </HStack>

                        <HStack>
                          <HStack color="gray.600" minW="100px" fontSize="sm" spacing={1}>
                            <img src={DiscordLogo} alt="Discord" width={14} height={14} />
                            <Text>Discord:</Text>
                          </HStack>
                          <Input
                            value={discordLink}
                            onChange={(e) => setDiscordLink(e.target.value)}
                            placeholder="Claimers can join the community via this link."
                            color="gray.800"
                            _placeholder={{ color: 'gray.500' }}
                            flex={1}
                          />
                        </HStack>
                      </VStack>
                    </VStack>
                  )}
                  {mode === "whitelist" && (
                    <VStack spacing={0} align="stretch">
                      <FormControl display="flex" alignItems="center" py={2}>
                        <FormLabel color="gray.800" minW="140px" mb={0}>Upload CSV file</FormLabel>
                        <Box flex={1}>
                          <Input
                            type="file"
                            accept=".csv"
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) {
                                setWhitelistFileName(file.name)
                                const reader = new FileReader()
                                reader.onload = (evt) => {
                                  setWhitelistText(evt.target?.result as string || '')
                                }
                                reader.readAsText(file)
                              }
                            }}
                            color="gray.800"
                            w="100%"
                            display="none"
                            id="csv-upload"
                          />
                          <Button
                            as="label"
                            htmlFor="csv-upload"
                            variant="outline"
                            cursor="pointer"
                            w="100%"
                            color="gray.800"
                            borderColor="gray.300"
                            _hover={{ bg: 'gray.50' }}
                          >
                            {whitelistFileName ? `Selected: ${whitelistFileName}` : 'Choose CSV File'}
                          </Button>
                          {whitelistFileName && (
                            <Text fontSize="sm" color="gray.500" mt={1}>Uploaded: {whitelistFileName}</Text>
                          )}
                        </Box>
                      </FormControl>
                      <Divider />
                      <FormControl py={2}>
                        <VStack align="stretch" spacing={3}>
                          <Box>
                            <Text color="gray.800" fontWeight="bold" mb={2}>
                              Manual Input
                            </Text>
                            <Text fontSize="sm" color="gray.600" mb={2}>
                              (Each line: address,amount)
                            </Text>
                          </Box>

                          <Textarea
                            value={whitelistText}
                            onChange={e => setWhitelistText(e.target.value)}
                            placeholder={"Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr,0.1\nDemoWallet1111111111111111111111111111111111,0.2"}
                            rows={6}
                            color="gray.800"
                            _placeholder={{ color: 'gray.500' }}
                          />

                          {whitelistText.trim() && (
                            <Box bg="blue.50" p={2} borderRadius="md" fontSize="xs">
                              <Text fontWeight="bold" color="blue.700" mb={1}>Live Preview:</Text>
                              {(() => {
                                try {
                                  const leaves = parseWhitelistInput(whitelistText);
                                  const isSol = !tokenAddress || tokenAddress.trim() === '';

                                  // Safely get decimals and symbol
                                  let decimals = 9;
                                  let symbolName = 'SOL';

                                  if (isSol) {
                                    decimals = 9;
                                    symbolName = 'SOL';
                                  } else if (tokenInfo && typeof tokenInfo.decimals === 'number') {
                                    decimals = tokenInfo.decimals;
                                    symbolName = tokenInfo.symbol || 'Token';
                                  } else {
                                    decimals = 9;
                                    symbolName = 'Token';
                                  }

                                  return leaves.slice(0, 3).map((leaf, index) => (
                                    <Text key={index} color="blue.600">
                                      {leaf.claimer.slice(0, 8)}...{leaf.claimer.slice(-4)}: {(leaf.amount / Math.pow(10, decimals)).toFixed(Math.min(decimals, 9)).replace(/\.?0+$/, '')} {symbolName}
                                    </Text>
                                  ));
                                } catch (error: any) {
                                  return <Text color="red.600">Format error: {error.message}</Text>;
                                }
                              })()}
                              {(() => {
                                try {
                                  const leaves = parseWhitelistInput(whitelistText);
                                  if (leaves.length > 3) {
                                    return <Text color="blue.500">... and {leaves.length - 3} more addresses</Text>;
                                  }
                                } catch {
                                  return null;
                                }
                              })()}
                            </Box>
                          )}
                        </VStack>
                      </FormControl>
                      <Divider />
                      <HStack py={2} align="center">
                        <FormLabel color="gray.800" minW="140px" mb={0}>Set expiry time:</FormLabel>
                        <Select
                          value={expiry}
                          onChange={e => {
                            // console.log('🕒 User changed expiry time from', expiry, 'to', e.target.value);
                            setExpiry(e.target.value);
                          }}
                          color="gray.800"
                          bg="white"
                          borderColor="gray.300"
                          _placeholder={{ color: 'gray.500' }}
                          maxW="120px"
                        >
                          <option value="1d">1 Day</option>
                          <option value="3d">3 Days (Default)</option>
                          <option value="7d">1 Week</option>
                          <option value="30d">1 Month</option>
                        </Select>
                      </HStack>
                      <Divider />
                      <VStack spacing={3} py={2} align="stretch">
                        <Text color="gray.800" fontWeight="medium" mb={0}>Community links (optional):</Text>

                        <HStack>
                          <HStack color="gray.600" minW="100px" fontSize="sm">
                            <img src={TwitterLogo} alt="Twitter" width={14} height={14} />
                            <Text>Twitter:</Text>
                          </HStack>
                          <Input
                            value={twitterLink}
                            onChange={(e) => setTwitterLink(e.target.value)}
                            placeholder="Claimers can join the community via this link."
                            color="gray.800"
                            _placeholder={{ color: 'gray.500' }}
                            flex={1}
                          />
                        </HStack>

                        <HStack>
                          <HStack color="gray.600" minW="100px" fontSize="sm" spacing={1}>
                            <img src={TelegramLogo} alt="Telegram" width={14} height={14} />
                            <Text>Telegram:</Text>
                          </HStack>
                          <Input
                            value={telegramLink}
                            onChange={(e) => setTelegramLink(e.target.value)}
                            placeholder="Claimers can join the community via this link."
                            color="gray.800"
                            _placeholder={{ color: 'gray.500' }}
                            flex={1}
                          />
                        </HStack>

                        <HStack>
                          <HStack color="gray.600" minW="100px" fontSize="sm" spacing={1}>
                            <img src={DiscordLogo} alt="Discord" width={14} height={14} />
                            <Text>Discord:</Text>
                          </HStack>
                          <Input
                            value={discordLink}
                            onChange={(e) => setDiscordLink(e.target.value)}
                            placeholder="Claimers can join the community via this link."
                            color="gray.800"
                            _placeholder={{ color: 'gray.500' }}
                            flex={1}
                          />
                        </HStack>
                      </VStack>
                    </VStack>
                  )}
                </Box>
              </VStack>
            </Box>
            {/* Button area */}
            <HStack mt={2} spacing={8} mb={2} justify="center">
              <Button
                onClick={() => setCurrentStep(1)}
                variant="outline"
                minW="120px"
                color="gray.800"
                bg="white"
                _hover={{ bg: 'gray.100' }}
                _active={{ bg: 'gray.200' }}
              >Back</Button>
              <Button
                colorScheme="blue"
                minW="120px"
                color="white"
                bg="blue.500"
                _hover={{ bg: 'blue.600' }}
                _active={{ bg: 'blue.700' }}
                onClick={handleCreate}
                isLoading={submittingStep2}
                loadingText="Processing..."
                isDisabled={submittingStep2}
              >Next</Button>
            </HStack>
          </VStack>
        )}
        {currentStep === 3 && (
          <VStack spacing={2} align="center" w="100%" mt="20px">
            <Text fontSize="3xl" fontWeight="bold" color="gray.900" textAlign="center" w="100%">
              Create New {mode === 'redpacket' ? 'Red Packet' : 'Airdrop'}
            </Text>
            <Box bg="white" borderRadius="xl" boxShadow="2xl" px={8} py={6} w="500px" maxW="98vw" minH="400px" position="relative">
              {/* Top-left corner mode icon and text */}
              <Box position="absolute" top="-80px" left="-80px" zIndex={10}>
                <Box position="relative" display="inline-block">
                  {/* <Image
                    src={'/redpacket-parachute.png'}
                    alt={mode === 'redpacket' ? 'Red Packet' : 'Airdrop'}
                    boxSize="160px"
                    objectFit="contain"
                  /> */}
                  <Box
                    position="absolute"
                    bottom="8px"
                    left="50%"
                    transform="translateX(-50%) scale(0.7)"
                    bg="rgba(0, 0, 0, 0)"
                    color="white"
                    px={2}
                    py={1}
                    borderRadius="md"
                    fontSize="12px"
                    fontWeight="bold"
                    whiteSpace="nowrap"
                    boxShadow="sm"
                  >
                    {mode === 'redpacket' ? 'Red Packet' : 'Airdrop'}
                  </Box>
                </Box>
              </Box>

              <VStack spacing={4} align="stretch" color="gray.800">
                <Text fontWeight="bold" fontSize="md" textAlign="center" mb={2} mt={2}>Step 3: Review & Confirm</Text>

                <Box bg="gray.100" borderRadius="md" p={4} fontSize="md">
                  <VStack align="stretch" spacing={1}>
                    <HStack justify="space-between">
                      <Text>Token</Text>
                      <HStack>
                        {tokenAddress.trim() ? (
                          tokenInfo ? (
                            <Text>{tokenInfo.symbol}</Text>
                          ) : tokenLoading ? (
                            <Text>Loading...</Text>
                          ) : (
                            <Text>{tokenAddress.slice(0, 4)}...{tokenAddress.slice(-4)}</Text>
                          )
                        ) : (
                          <Text>SOL</Text>
                        )}
                      </HStack>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Total addresses</Text>
                      <Text>{mode === 'redpacket' ? count : whitelistAddresses.length}</Text>
                    </HStack>
                    {/* 只在红包模式下显示单个地址金额，空投模式下隐藏 */}
                    {mode === 'redpacket' && (
                      <HStack justify="space-between">
                        <Text>Amount per address</Text>
                        <Text>{
                          randomAmount ? 'Random' : (() => {
                            const countNum = parseInt(count) || 0;
                            const amountNum = parseFloat(amount) || 0;
                            return countNum > 0 ? (amountNum / countNum).toFixed(3) + ` ${tokenAddress.trim()
                              ? (tokenInfo?.symbol || tokenAddress.slice(0, 6) + '...')
                              : 'SOL'
                              }` : '-';
                          })()
                        }</Text>
                      </HStack>
                    )}
                    <HStack justify="space-between">
                      <Text>Total amount</Text>
                      <Text>{
                        mode === 'redpacket'
                          ? `${amount}`
                          : (() => {
                            try {
                              const leaves = parseWhitelistInput(whitelistText);
                              if (leaves.length > 0) {
                                const isSol = !tokenAddress || tokenAddress.trim() === '';
                                let decimals = 9;

                                if (isSol) {
                                  decimals = 9;
                                } else if (tokenInfo && typeof tokenInfo.decimals === 'number') {
                                  decimals = tokenInfo.decimals;
                                } else {
                                  decimals = 9;
                                }

                                const totalSmallestUnits = leaves.reduce((sum, leaf) => sum + leaf.amount, 0);
                                const totalTokens = totalSmallestUnits / Math.pow(10, decimals);
                                return `${totalTokens.toFixed(Math.min(decimals, 9)).replace(/\.?0+$/, '')}`;
                              }
                              return '-';
                            } catch {
                              return '-';
                            }
                          })()
                      }</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Airdrop Type</Text>
                      <Text>{
                        mode === 'redpacket'
                          ? (randomAmount ? 'Random Red Packet' : 'Fixed Red Packet')
                          : 'Whitelist Airdrop'
                      }</Text>
                    </HStack>
                    {(twitterLink.trim() || telegramLink.trim() || discordLink.trim()) && (
                      <VStack spacing={1} align="stretch">
                        <Text>Community Links (optional)</Text>
                        {twitterLink.trim() && (
                          <HStack justify="space-between" pl={4}>
                            <HStack fontSize="sm" spacing={1}>
                              <img src={TwitterLogo} alt="Twitter" width={12} height={12} />
                              <Text>Twitter:</Text>
                            </HStack>
                            <Text
                              color="blue.500"
                              fontSize="sm"
                              wordBreak="break-all"
                              maxW="200px"
                              title={twitterLink}
                            >
                              {twitterLink.length > 25
                                ? `${twitterLink.substring(0, 25)}...`
                                : twitterLink
                              }
                            </Text>
                          </HStack>
                        )}
                        {telegramLink.trim() && (
                          <HStack justify="space-between" pl={4}>
                            <HStack fontSize="sm" spacing={1}>
                              <img src={TelegramLogo} alt="Telegram" width={12} height={12} />
                              <Text>Telegram:</Text>
                            </HStack>
                            <Text
                              color="blue.500"
                              fontSize="sm"
                              wordBreak="break-all"
                              maxW="200px"
                              title={telegramLink}
                            >
                              {telegramLink.length > 25
                                ? `${telegramLink.substring(0, 25)}...`
                                : telegramLink
                              }
                            </Text>
                          </HStack>
                        )}
                        {discordLink.trim() && (
                          <HStack justify="space-between" pl={4}>
                            <HStack fontSize="sm" spacing={1}>
                              <img src={DiscordLogo} alt="Discord" width={12} height={12} />
                              <Text>Discord:</Text>
                            </HStack>
                            <Text
                              color="blue.500"
                              fontSize="sm"
                              wordBreak="break-all"
                              maxW="200px"
                              title={discordLink}
                            >
                              {discordLink.length > 25
                                ? `${discordLink.substring(0, 25)}...`
                                : discordLink
                              }
                            </Text>
                          </HStack>
                        )}
                      </VStack>
                    )}
                    {mode === 'whitelist' && merkleRoot && (
                      <HStack justify="space-between">
                        <Text>Merkle Root</Text>
                        <Text
                          fontFamily="mono"
                          fontSize="xs"
                          wordBreak="break-all"
                          maxW="200px"
                          title={merkleRoot}
                        >
                          {merkleRoot.substring(0, 8)}...{merkleRoot.substring(merkleRoot.length - 8)}
                        </Text>
                      </HStack>
                    )}
                  </VStack>
                </Box>
                <Text color="blue.500" fontSize="sm" mt={2} mb={-2}>
                  Estimate creation cost：<b>0.01 sol</b>
                </Text>


              </VStack>
            </Box>
            <HStack mt={6} spacing={8} justify="center">
              <Button
                onClick={handleBackClick}
                variant="outline"
                minW="120px"
                color={creating ? "red.600" : "gray.800"}
                bg="white"
                _hover={{ bg: creating ? 'red.50' : 'gray.100' }}
                _active={{ bg: creating ? 'red.100' : 'gray.200' }}
                borderColor={creating ? "red.300" : "gray.300"}
              >{creating ? 'Cancel' : 'Back'}</Button>

              <Button
                colorScheme="blue"
                minW="120px"
                color="white"
                bg="blue.500"
                _hover={{ bg: 'blue.600' }}
                _active={{ bg: 'blue.700' }}
                isLoading={creating}
                loadingText="Creating..."
                isDisabled={creating}
                onClick={handleContractCreate}
              >Confirm Create</Button>
            </HStack>
          </VStack>
        )}
        {currentStep === 4 && (
          <VStack spacing={6} align="center" w="100%">
            <Text fontSize="3xl" fontWeight="bold" color="gray.900" textAlign="center" w="100%">
              Red Packet Created Successfully!
            </Text>
            <Box bg="white" borderRadius="xl" boxShadow="2xl" px={8} py={6} w="500px" maxW="98vw" minH="400px" position="relative">
              {/* Top-left corner mode icon and text */}
              <Box position="absolute" top="-80px" left="-80px" zIndex={10}>
                <Box position="relative" display="inline-block">
                  {/* <Image
                    src={'/redpacket-parachute.png'}
                    alt={mode === 'redpacket' ? 'Red Packet' : 'Airdrop'}
                    boxSize="160px"
                    objectFit="contain"
                  /> */}
                  <Box
                    position="absolute"
                    bottom="8px"
                    left="50%"
                    transform="translateX(-50%) scale(0.7)"
                    bg="rgba(0, 0, 0, 0)"
                    color="white"
                    px={2}
                    py={1}
                    borderRadius="md"
                    fontSize="12px"
                    fontWeight="bold"
                    whiteSpace="nowrap"
                    boxShadow="sm"
                  >
                    {mode === 'redpacket' ? 'Red Packet' : 'Airdrop'}
                  </Box>
                </Box>
              </Box>

              <VStack spacing={4} align="center">
                {/* Title */}
                <VStack spacing={1} align="center">
                  <Text fontSize="lg" fontWeight="bold" color="gray.800" textAlign="center">
                    Red Packet Created Successfully!
                  </Text>
                </VStack>

                {/* Share component */}
                <ShareComponent shareUrl={shareUrl} />
              </VStack>
            </Box>

            {/* Bottom buttons */}
            <VStack spacing={3} mb={4}>
              <Button
                onClick={() => navigate('/')}
                bg="#4079FF"
                color="white"
                size="lg"
                minW="200px"
                borderRadius="md"
                border="none"
                leftIcon={<Text fontSize="18px">🏠</Text>}
                fontWeight="bold"
                px={8}
                py={3}
                _hover={{ bg: '#3366E6' }}
                _active={{ bg: '#2952CC' }}
              >
                Home
              </Button>

              <Button
                onClick={() => navigate('/my-created-redpackets')}
                bg="#4079FF"
                color="white"
                size="lg"
                minW="200px"
                borderRadius="md"
                border="none"
                leftIcon={<Text fontSize="18px">📝</Text>}
                fontWeight="bold"
                px={8}
                py={3}
                _hover={{ bg: '#3366E6' }}
                _active={{ bg: '#2952CC' }}
              >
                My Create
              </Button>
            </VStack>
          </VStack>
        )}
      </Box>
    </Box>
  )
} 