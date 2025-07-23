import React, { useEffect, useState, useMemo } from 'react'
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Spinner,
  useToast,
  Divider,
  Code,
  Icon,
  Flex,
  Image,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { CheckCircleIcon, WarningIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { FaHome } from 'react-icons/fa'
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js'
import { Program, AnchorProvider, BN, type Idl } from '@coral-xyz/anchor'
import { getAssociatedTokenAddress, getAccount, getMint } from '@solana/spl-token'
import { useTokenInfo } from '../hooks/useTokenInfo'
import { ipfsService } from '../services/ipfsService'
import { whitelistService } from '../services/whitelistService'
import { getTokenProgramId } from '../utils/tokenProgram'
import { ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { SOL_MINT_ADDRESS, RED_PACKET_PROGRAM_ID, buildApiUrl, RPC_ENDPOINT } from '../config/constants'
import { useRedPacketService } from '../services/redPacketService'

// Token information interface
interface TokenInfo {
  decimals: number;
  supply: bigint;
  mintAuthority: PublicKey | null;
  freezeAuthority: PublicKey | null;
}

// 导入SVG图标
import DiscordLogo from '../assets/discord-v2-svgrepo-com.svg'
import TelegramLogo from '../assets/telegram-logo-svgrepo-com.svg'
import TwitterLogo from '../assets/twitter-color-svgrepo-com.svg'

// 状态类型
type ClaimStatus = 'input' | 'loading' | 'info' | 'success' | 'fail' | 'empty'

// IPFS白名单数据接口
interface IPFSWhitelistData {
  redPacketId: string;
  creator: string;
  timestamp: number;
  merkleRoot: string;
  entries: Array<{
    claimer: string;
    amount: number;
  }>;
  metadata: {
    totalAmount: number;
    totalAddresses: number;
    tokenAddress?: string;
    tokenName?: string;
  };
}

export const ClaimRedPacket: React.FC = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('solana')
  const [loading, setLoading] = useState(false)

  // Connection to Solana
  const connection = new Connection(RPC_ENDPOINT)

  // Parse claim link parameters
  const url = new URL(window.location.href)
  const redPacketId = url.searchParams.get('id') || ''
  const creator = url.searchParams.get('creator') || ''
  const tokenAddress = url.searchParams.get('tokenAddress') || ''
  const tokenNameParam = url.searchParams.get('tokenName') || ''
  const tokenContractParam = url.searchParams.get('tokenContract') || ''
  const isSolParam = url.searchParams.get('isSol') || ''
  const ipfsCID = url.searchParams.get('ipfsCID') || '' // IPFS CID参数
  const typeParam = url.searchParams.get('type') || '' // 获取type参数
  const modeParam = url.searchParams.get('mode') || '' // 获取mode参数
  const redPacketAddressParam = url.searchParams.get('redPacket') || '' // 新增：红包地址参数
  
  // 社区链接数据将通过API获取

  // Check if user came from home page button (no URL parameters) or direct link (with parameters)
  const isFromHomePage = !redPacketId && !creator
  
  // Token information
  const { tokenInfo, loading: tokenLoading } = useTokenInfo(tokenAddress || undefined)

  // Page state
  const [status, setStatus] = useState<ClaimStatus>(isFromHomePage ? 'input' : 'loading')
  const [claimError, setClaimError] = useState('')
  const [claimSuccessHash, setClaimSuccessHash] = useState('')
  const [claimedAmount, setClaimedAmount] = useState<number>(0) // 新增：存储领取的数量
  const [whitelistLoading, setWhitelistLoading] = useState(false)
  const [ipfsData, setIpfsData] = useState<IPFSWhitelistData | null>(null)
  const [whitelistLoaded, setWhitelistLoaded] = useState(false) // 新增：追踪白名单是否已加载
  
  // 新增：红包详情状态
  const [redPacketDetails, setRedPacketDetails] = useState<{
    block_time: string;
    bump: number;
    claimed_amount: number;
    claimed_count: number;
    created_at: string;
    creator: string;
    discord_url: string;
    expiry_time: number;
    id: number;
    mint: string;
    mint_name: string;
    mint_symbol: string;
    mint_type: string;
    packet_count: number;
    red_packet: string;
    red_packet_id: number;
    red_packet_type: number;
    tg_url: string;
    total_amount: number;
    transaction: string;
    updated_at: string;
    with_draw_status: number;
    x_url: string;
  } | null>(null)
  const [redPacketDetailsLoading, setRedPacketDetailsLoading] = useState(false)
  
  // Input state for manual claim link entry
  const [claimLink, setClaimLink] = useState('')

  // 判断是否为红包模式
  const isRedPacketMode = modeParam === 'redpacket'
  // 判断是否为空投模式（如果不是红包模式，则为空投模式）
  const isAirdropMode = !isRedPacketMode

  // 社区链接状态
  const [communityLinks, setCommunityLinks] = useState<Array<{
    type: string;
    url: string;
    icon: string;
    name: string;
  }>>([])
  
  // 代币信息状态管理
  const [tokenInfoState, setTokenInfoState] = useState<{
    info: TokenInfo | null;
    loading: boolean;
    error: boolean;
  }>({ info: null, loading: false, error: false });

  // 获取代币信息的函数
  const fetchTokenInfo = async (mintAddress: string) => {
    if (tokenInfoState.loading || tokenInfoState.info) {
      return;
    }

    console.log('🔍 获取代币信息 (ClaimRedPacket):', mintAddress.slice(0, 8) + '...');
    
    setTokenInfoState({ info: null, loading: true, error: false });

    try {
      const mintPublicKey = new PublicKey(mintAddress);
      const tokenInfo = await getMint(connection, mintPublicKey);
      
      console.log('✅ 代币信息获取成功 (ClaimRedPacket):', {
        mint: mintAddress.slice(0, 8) + '...',
        decimals: tokenInfo.decimals
      });
      
      setTokenInfoState({ info: tokenInfo, loading: false, error: false });
      
    } catch (error) {
      console.error('❌ 代币信息获取失败 (ClaimRedPacket):', mintAddress.slice(0, 8) + '...', error);
      setTokenInfoState({ info: null, loading: false, error: true });
    }
  };

  // 当红包详情加载完成且不是SOL代币时，获取代币信息
  useEffect(() => {
    const isSOL = isSolParam === 'true';
    const mintAddress = tokenAddress || tokenContractParam;
    
    if (!isSOL && mintAddress) {
      fetchTokenInfo(mintAddress);
    }
  }, [isSolParam, tokenAddress, tokenContractParam]);
  
  // 格式化金额函数
  const formatAmount = (amount: number, isSOL: boolean) => {
    if (isSOL) {
      const decimals = 9;
      const divisor = Math.pow(10, decimals);
      const formattedAmount = (amount / divisor);
      return formattedAmount.toFixed(Math.min(decimals, 6)).replace(/\.?0+$/, '');
    } else {
      const decimals = tokenInfoState.info?.decimals || 6;
      const divisor = Math.pow(10, decimals);
      const formattedAmount = (amount / divisor);
      return formattedAmount.toFixed(Math.min(decimals, 6)).replace(/\.?0+$/, '');
    }
  };

  // 创建金额显示组件
  const AmountDisplay: React.FC<{ 
    amount: number;
    isSOL: boolean;
    showLoading?: boolean;
    color?: string;
  }> = ({ amount, isSOL, showLoading = true, color = "gray.800" }) => {
    // 检查是否需要加载代币信息
    const needsTokenInfo = !isSOL && (tokenAddress || tokenContractParam);
    const isLoading = showLoading && needsTokenInfo && tokenInfoState.loading;
    
    // 使用 useMemo 缓存格式化金额的计算结果
    const formattedAmount = useMemo(() => {
      if (isLoading) return '';
      return formatAmount(amount, isSOL);
    }, [
      amount,
      isSOL,
      isLoading,
      tokenInfoState.info?.decimals
    ]);

    if (isLoading) {
      return (
        <Text fontSize="sm" color="blue.500">
          Loading...
        </Text>
      );
    }

    return (
      <Text fontWeight="semibold" color={color}>
        {formattedAmount}
      </Text>
    );
  };


  
  // 获取红包详情的API调用
  const fetchRedPacketDetails = async (redPacketAddress: string) => {
    if (!redPacketAddress) {
      console.log('❌ No red packet address provided')
      return
    }

    console.log('🔍 获取红包详情:', redPacketAddress)
    setRedPacketDetailsLoading(true)
    
    try {
      const apiUrl = buildApiUrl(`/api/redpacket/get_redpacket_count/${redPacketAddress}`)
      console.log('📡 Red packet details API URL:', apiUrl)
      
      const response = await fetch(apiUrl)
      console.log('📡 Red packet details API response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('📦 Red packet details API response data:', result)
        
        if (result.success && result.data) {
          console.log('✅ Red packet details loaded successfully:', result.data)
          setRedPacketDetails(result.data)
        } else {
          console.log('⚠️ Red packet details API returned empty or failed:', result)
          setRedPacketDetails(null)
        }
      } else {
        const errorText = await response.text()
        console.error('❌ Red packet details API failed:', response.status, errorText)
        setRedPacketDetails(null)
      }
    } catch (error) {
      console.error('❌ Red packet details API error:', error)
      setRedPacketDetails(null)
    } finally {
      setRedPacketDetailsLoading(false)
    }
  }

  // 获取社区链接的API调用
  const fetchCommunityLinks = async (creatorAddress: string, mintAddress: string) => {
    try {
      const apiUrl = buildApiUrl(`/api/community_link/get_community_link/${RED_PACKET_PROGRAM_ID.toString()}/${creatorAddress}/${mintAddress}`)

      const response = await fetch(apiUrl)
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success && result.data) {
          
          const links = []
          
          if (result.data.discord_url && result.data.discord_url.trim()) {
            links.push({ type: 'discord', url: result.data.discord_url, icon: DiscordLogo, name: 'Discord' })
          } else {
          }
          
          if (result.data.tg_url && result.data.tg_url.trim()) {
            links.push({ type: 'telegram', url: result.data.tg_url, icon: TelegramLogo, name: 'Telegram' })
          } else {
          }
          
          if (result.data.x_url && result.data.x_url.trim()) {
            links.push({ type: 'x', url: result.data.x_url, icon: TwitterLogo, name: 'X (Twitter)' })
          } else {
          }
          
          setCommunityLinks(links)
        } else {
          setCommunityLinks([])
        }
      } else {
        const responseText = await response.text()
        setCommunityLinks([])
      }
    } catch (error) {
      setCommunityLinks([])
    }
  }
  
  // 社区链接相关函数
  const getCommunityLinks = () => {
    return communityLinks
  }

  const openCommunityLink = (url: string) => {
    // 确保链接以http://或https://开头
    const finalUrl = url.startsWith('http') ? url : `https://${url}`
    window.open(finalUrl, '_blank', 'noopener,noreferrer')
  }

  // Handle claim link input and parsing
  const handleClaimLinkSubmit = () => {
    if (!claimLink.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a claim link',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    try {
      const linkUrl = new URL(claimLink)
      const newRedPacketId = linkUrl.searchParams.get('id')
      const newCreator = linkUrl.searchParams.get('creator')
      
      if (!newRedPacketId || !newCreator) {
        toast({
          title: 'Invalid Link',
          description: 'The claim link is missing required parameters',
          status: 'error',
          duration: 3000,
          isClosable: true,
        })
        return
      }

      // Update URL with new parameters
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set('id', newRedPacketId)
      currentUrl.searchParams.set('creator', newCreator)
      
      // Copy other parameters if they exist
      const tokenAddr = linkUrl.searchParams.get('tokenAddress')
      const tokenName = linkUrl.searchParams.get('tokenName')
      const tokenContract = linkUrl.searchParams.get('tokenContract')
      const isSol = linkUrl.searchParams.get('isSol')
      const cid = linkUrl.searchParams.get('ipfsCID') // 获取IPFS CID
      const mode = linkUrl.searchParams.get('mode')
      
      if (tokenAddr) currentUrl.searchParams.set('tokenAddress', tokenAddr)
      if (tokenName) currentUrl.searchParams.set('tokenName', tokenName)
      if (tokenContract) currentUrl.searchParams.set('tokenContract', tokenContract)
      if (isSol) currentUrl.searchParams.set('isSol', isSol)
      if (cid) currentUrl.searchParams.set('ipfsCID', cid) // 设置IPFS CID
      if (mode) currentUrl.searchParams.set('mode', mode)

      // Navigate to the new URL
      window.location.href = currentUrl.toString()
    } catch (error) {
      toast({
        title: 'Invalid Link',
        description: 'Please enter a valid claim link URL',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  // 从IPFS加载白名单数据
  const loadWhitelistFromIPFS = async () => {
    if (!ipfsCID) {
      return
    }

    setWhitelistLoading(true)
    try {
      const data = await ipfsService.getWhitelistData(ipfsCID)
      
      if (data) {
        setIpfsData(data)
        
        // 将白名单数据加载到本地服务中
        whitelistService.setWhitelist(redPacketId, data.entries)
        
        
        toast({
          title: 'Whitelist data loaded successfully',
          description: `Loaded ${data.entries.length} whitelist entries from IPFS`,
          status: 'success',
          duration: 3000,
        })
      } else {
        toast({
          title: 'Error',
          description: 'Unable to get whitelist data from IPFS',
          status: 'error',
          duration: 3000,
        })
      }
    } catch (error) {
              toast({
          title: 'Error',
          description: 'Failed to load whitelist data, please try again',
          status: 'error',
          duration: 3000,
      })
    } finally {
      setWhitelistLoading(false)
    }
  }

  // Simulate eligibility verification (should be interface/contract verification in practice)
  useEffect(() => {
    console.log('🔍 useEffect triggered with params:', {
      redPacketId,
      creator,
      isFromHomePage,
      ipfsCID,
      whitelistLoaded,
      tokenAddress,
      tokenContractParam,
      isSolParam,
      redPacketAddressParam
    });
    
    // Skip verification if we're in input mode
    if (isFromHomePage) {
      console.log('⏭️ Skipping verification - in input mode')
      return
    }
    
    // If missing required parameters, fail directly
    if (!redPacketId || !creator) {
      console.log('❌ Missing required parameters:', { redPacketId, creator })
      setStatus('fail')
      setClaimError('Claim link missing required parameters')
      return
    }

    const performVerification = async () => {
      // 只有在需要且还未加载时才从IPFS加载白名单数据
      if (ipfsCID && !whitelistLoaded) {
        setWhitelistLoaded(true) // 标记为已加载，避免重复加载
        await loadWhitelistFromIPFS()
      }
      
      // 获取红包详情
      if (redPacketId && creator) {
        try {
          let redPacketPdaAddress: string

          // 优先使用URL参数中的红包地址
          if (redPacketAddressParam) {
            console.log('🔍 使用URL参数中的红包地址:', redPacketAddressParam)
            redPacketPdaAddress = redPacketAddressParam
          } else {
            // 如果URL中没有红包地址，则计算PDA地址
            console.log('🔍 计算PDA地址 - Creator:', creator, 'RedPacketId:', redPacketId)
            
            const creatorPk = new PublicKey(creator)
            const redPacketIdNum = parseInt(redPacketId)
            
            console.log('🔍 PDA计算参数:', {
              creator: creator,
              creatorPk: creatorPk.toBase58(),
              redPacketIdNum: redPacketIdNum,
              programId: RED_PACKET_PROGRAM_ID.toBase58()
            })
            
            const redPacketIdBuffer = Buffer.alloc(8)
            redPacketIdBuffer.writeUInt32LE(redPacketIdNum & 0xffffffff, 0)
            redPacketIdBuffer.writeUInt32LE(Math.floor(redPacketIdNum / 0x100000000), 4)
            
            const [redPacketPda] = await PublicKey.findProgramAddress(
              [
                Buffer.from("red_packet"),
                creatorPk.toBuffer(),
                redPacketIdBuffer,
              ],
              RED_PACKET_PROGRAM_ID // Red packet program ID
            )
            
            redPacketPdaAddress = redPacketPda.toBase58()
            console.log('✅ 计算得到的PDA地址:', redPacketPdaAddress)
          }
          
          await fetchRedPacketDetails(redPacketPdaAddress)
        } catch (error) {
          console.error('❌ Error calculating red packet PDA:', error)
        }
      }
      
      // 获取社区链接数据
      if (creator) {
        // 对于SOL红包，使用SOL的官方mint地址；对于SPL代币，使用实际的mint地址
        const mintAddress = (isSolParam === 'true') ? SOL_MINT_ADDRESS : (tokenAddress || tokenContractParam || '')
        await fetchCommunityLinks(creator, mintAddress)
      }
      
      // Real eligibility verification logic can be added here
      setTimeout(() => {
        setStatus('info')
      }, 1000)
    }

    performVerification()
  }, [redPacketId, creator, isFromHomePage, ipfsCID, whitelistLoaded, tokenAddress, tokenContractParam, isSolParam])

  // 查询SOL余额的函数
  const getSOLBalance = async (walletAddress: PublicKey): Promise<number> => {
    try {
      const balance = await connection.getBalance(walletAddress)
      return balance // 返回lamports
    } catch (error) {
      console.error('获取SOL余额失败:', error)
      return 0
    }
  }

  // 查询Token余额的函数
  const getTokenBalance = async (walletAddress: PublicKey, tokenMint: PublicKey): Promise<number> => {
    try {
      const tokenProgramId = await getTokenProgramId(connection, tokenMint)
      const ata = await getAssociatedTokenAddress(tokenMint, walletAddress, false, tokenProgramId)
      
      const accountInfo = await getAccount(connection, ata, 'confirmed', tokenProgramId)
      return Number(accountInfo.amount) // 返回最小单位
    } catch (error) {
      console.error('获取Token余额失败:', error)
      return 0
    }
  }

  // 内联的领取红包函数 - 使用新的红包服务
  const claimRedPacket = async (
    redPacketIdStr: string, 
    creatorStr: string, 
    ipfsCID?: string
  ): Promise<boolean | {txid: string, amount?: number, decimals?: number, symbol?: string}> => {
    if (!address || !isConnected) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first',
        status: 'error',
        duration: 3000,
      })
      return false
    }

    if (!walletProvider) {
      toast({
        title: 'Error',
        description: 'Wallet provider not available',
        status: 'error',
        duration: 3000,
      })
      return false
    }

    try {
      const publicKey = new PublicKey(address)
      const provider = new AnchorProvider(
        connection,
        walletProvider as any,
        AnchorProvider.defaultOptions()
      )
      
      // 使用新的红包服务
      const redPacketService = useRedPacketService(connection, provider)
      if (!redPacketService) {
        throw new Error('Red packet service not available')
      }


      // 根据红包类型准备不同的参数
      let claimAmount: BN | null = null
      let merkleProof: Buffer[] | null = null

      // 如果是白名单红包，需要先获取白名单数据
      if (ipfsCID) {
        // 类型2：空投白名单固定金额红包
        try {
          let whitelistData = null
          
          // 优先从 IPFS 获取白名单数据
          whitelistData = await getWhitelistFromIPFS(redPacketIdStr, publicKey.toString(), ipfsCID)
          
          // 如果IPFS数据获取失败，尝试从本地白名单服务获取
          if (!whitelistData) {
            whitelistData = await getWhitelistData(publicKey.toString(), redPacketIdStr)
          }
          
          if (!whitelistData) {
            toast({ 
              title: 'Error', 
              description: 'You are not on the whitelist for this red packet', 
              status: 'error' 
            })
            return false
          }

          claimAmount = new BN(whitelistData.amount)
          // 将number[][]格式的proof转换为Buffer[]格式
          merkleProof = whitelistData.proof.map(proofElement => Buffer.from(proofElement))
          
          
        } catch (error) {
          console.error('获取白名单数据失败:', error)
          toast({ 
            title: 'Error', 
            description: 'Failed to get whitelist data', 
            status: 'error' 
          })
          return false
        }
             }
       
              // 记录领取前的余额
       const isSOL = isSolParam === 'true'
       let beforeBalance = 0
       let balanceCheckEnabled = true
       
       try {
         if (isSOL) {
           beforeBalance = await getSOLBalance(publicKey)
         } else {
           // 对于非SOL代币，确保有代币地址
           const mintAddress = tokenAddress || tokenContractParam
           if (mintAddress) {
             beforeBalance = await getTokenBalance(publicKey, new PublicKey(mintAddress))
           } else {
             console.warn('【余额查询】无法获取代币地址，跳过余额查询')
             balanceCheckEnabled = false
           }
         }
         console.log('【余额查询】领取前余额:', beforeBalance)
       } catch (error) {
         console.error('【余额查询】获取领取前余额失败:', error)
         balanceCheckEnabled = false
       }
       
       // 调用新的红包服务进行领取
       const tx = await redPacketService.claimRedPacket(
         redPacketIdStr,
         creatorStr,
         claimAmount,
         merkleProof,
         redPacketAddressParam
       )

       
              // 计算实际领取的金额
       let actualClaimedAmount = 0
       
       if (balanceCheckEnabled) {
         try {
           
           // 等待交易确认
           let confirmed = false
           let retryCount = 0
           const maxRetries = 10
           
           while (!confirmed && retryCount < maxRetries) {
             try {
               const status = await connection.getSignatureStatus(tx)
               
               if (status.value && status.value.confirmationStatus === 'confirmed') {
                 confirmed = true
                 break
               }
               
               // 等待2秒后再次检查
               await new Promise(resolve => setTimeout(resolve, 2000))
               retryCount++
             } catch (error) {
               console.error('【余额查询】检查交易状态失败:', error)
               retryCount++
               await new Promise(resolve => setTimeout(resolve, 2000))
             }
           }
           
           if (!confirmed) {
           }
           
           // 额外等待几秒确保余额更新
           await new Promise(resolve => setTimeout(resolve, 3000))
           
           // 多次尝试查询余额变化
           let maxBalanceRetries = 5
           for (let i = 0; i < maxBalanceRetries; i++) {
             console.log(`【余额查询】第${i + 1}次查询余额...`)
           
           let afterBalance = 0
           
           if (isSOL) {
             afterBalance = await getSOLBalance(publicKey)
           } else {
             // 对于非SOL代币，确保有代币地址
             const mintAddress = tokenAddress || tokenContractParam
             if (mintAddress) {
               afterBalance = await getTokenBalance(publicKey, new PublicKey(mintAddress))
             }
           }
              
           
           // 计算余额差值
             const balanceDiff = afterBalance - beforeBalance
           
           // 对于SOL红包，由于交易手续费的影响，余额差值可能是负数
           // 在这种情况下，我们尝试从白名单金额或其他方式获取
             if (isSOL && balanceDiff <= 0) {
             if (claimAmount) {
               actualClaimedAmount = claimAmount.toNumber()
                 break
               }
             } else if (balanceDiff > 0) {
               actualClaimedAmount = balanceDiff
               break
             }
             
             // 如果是最后一次尝试还没有检测到，使用白名单金额
             if (i === maxBalanceRetries - 1) {
               if (claimAmount) {
                 actualClaimedAmount = claimAmount.toNumber()
               }
             } else {
               // 不是最后一次，等待3秒再重试
               await new Promise(resolve => setTimeout(resolve, 3000))
             }
           }
           
         } catch (error) {
           console.error('【余额查询】获取领取后余额失败:', error)
           // 余额查询失败时，尝试使用白名单金额
           if (claimAmount) {
             actualClaimedAmount = claimAmount.toNumber()
           }
         }
       } else {
         // 余额查询被禁用，尝试使用白名单金额
         if (claimAmount) {
           actualClaimedAmount = claimAmount.toNumber()
         }
       }
       
       toast({
         title: '成功',
         description: '红包领取成功！',
         status: 'success',
         duration: 3000,
       })
       
       // 获取代币的正确小数位数
       let tokenDecimals = 6 // 默认6位小数
       if (isSOL) {
         tokenDecimals = 9
       } else if (tokenInfo && tokenInfo.decimals !== undefined) {
         tokenDecimals = tokenInfo.decimals
       } else {
         // 尝试从链上获取代币信息
         const mintAddress = tokenAddress || tokenContractParam
         if (mintAddress) {
           try {
             const mintInfo = await connection.getAccountInfo(new PublicKey(mintAddress))
             if (mintInfo) {
               // 从mint账户数据中解析小数位数（第44个字节）
               const decimalsFromMint = mintInfo.data[44]
               tokenDecimals = decimalsFromMint
             }
           } catch (error) {
             console.error('【代币信息】获取链上代币信息失败:', error)
           }
         }
       }
       
       // 返回交易结果，包含实际领取的金额
       return { 
         txid: tx, 
         amount: actualClaimedAmount > 0 ? actualClaimedAmount : (claimAmount ? claimAmount.toNumber() : undefined),
         decimals: tokenDecimals,
         symbol: isSOL ? 'SOL' : (tokenNameParam || 'Token')
       }
    } catch (error: any) {
      console.error('【领取红包】详细错误信息:', error)
      
      // 解析具体的错误类型
      let errorMessage = '领取红包失败，请重试'
      
      if (error?.message) {
        const message = error.message.toLowerCase()
        
        if (message.includes('already claimed')) {
          errorMessage = '您已经领取过这个红包了'
        } else if (message.includes('red packet has expired')) {
          errorMessage = '红包已过期'
        } else if (message.includes('no packets remaining')) {
          errorMessage = '红包已被抢完'
        } else if (message.includes('insufficient funds in claimer')) {
          errorMessage = '您的账户余额不足支付手续费'
        } else if (message.includes('insufficient funds in red packet')) {
          errorMessage = '红包余额不足'
        } else if (message.includes('merkle proof verification failed')) {
          errorMessage = '白名单验证失败，您可能不在白名单中'
        } else if (message.includes('invalid claim amount')) {
          errorMessage = '无效的领取金额'
        } else if (message.includes('unauthorized')) {
          errorMessage = '没有权限领取此红包'
        } else if (message.includes('user rejected')) {
          errorMessage = '用户取消了交易'
        } else if (message.includes('blockhash not found')) {
          errorMessage = '网络繁忙，请稍后重试'
        } else if (message.includes('transaction simulation failed')) {
          errorMessage = '交易模拟失败，请检查账户状态'
        }
      }
      
      // console.error('【领取红包】错误分析:', {
      //   originalError: error,
      //   parsedMessage: errorMessage,
      //   errorCode: error?.code,
      //   programError: error?.programError
      // })
      
      // 抛出解析后的错误信息
      const enhancedError = new Error(errorMessage)
      // @ts-ignore - Error.cause is available in newer environments
      enhancedError.cause = error
      throw enhancedError
    }
  }

  // 获取白名单数据的辅助函数
  const getWhitelistData = async (claimerAddress: string, redPacketId: string): Promise<{amount: number, proof: number[][]} | null> => {
    try {
      const whitelistData = whitelistService.getWhitelistData(redPacketId, claimerAddress)
      if (!whitelistData) {
        // console.log('【白名单】用户不在白名单中或未找到红包白名单:', { redPacketId, claimerAddress })
        return null
      }

      return whitelistData
    } catch (error) {
      // console.error('【白名单】获取白名单数据失败:', error)
      return null
    }
  }

  const getWhitelistFromIPFS = async (
    redPacketId: string, 
    claimerAddress: string, 
    ipfsCID: string
  ): Promise<{amount: number, proof: number[][]} | null> => {
    try {
      
      const data = await ipfsService.getWhitelistData(ipfsCID)
      if (!data) {
        return null
      }

      const entry = data.entries.find(item => item.claimer === claimerAddress)
      if (!entry) {
        return null
      }

      // 将IPFS数据加载到本地白名单服务中以生成证明
      whitelistService.setWhitelist(redPacketId, data.entries)
      
      // 使用白名单服务获取完整的白名单数据（包含证明）
      const whitelistData = whitelistService.getWhitelistData(redPacketId, claimerAddress)
      if (!whitelistData) {
        return null
      }


      return whitelistData
    } catch (error) {
      return null
    }
  }

  // Claim operation
  const handleClaim = async () => {
    setStatus('loading')
    setClaimError('')
    try {
      const success = await claimRedPacket(redPacketId, creator, ipfsCID)
      
      if (success) {
        setStatus('success')
        if (typeof success === 'object' && success && 'txid' in success) {
          setClaimSuccessHash(success.txid)
          
          // 存储领取的数量信息（白名单红包有确切数量，随机红包待后端接口提供）
          if (success.amount !== undefined && success.amount !== null && success.amount > 0) {
            setClaimedAmount(success.amount)
          } else {
            setClaimedAmount(0) // 设置为0，表示没有具体金额
          }
          // TODO: 后续集成后端接口获取领取进度数据
        } else {
          setClaimSuccessHash('')
          setClaimedAmount(0)
        }
        return
      } else {
        setStatus('fail')
        setClaimError('Claim failed, please try again')
      }
    } catch (e: any) {
      setStatus('fail')
      setClaimError(e?.message || 'Claim failed, please try again')
    }
  }

  // Unified card style
  const CardBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Box
      bg="white"
      borderRadius="xl"
      boxShadow="2xl"
      px={8}
      py={6}
      minW="380px"
      maxW="98vw"
      mx="auto"
    >
      {children}
    </Box>
  )

  // My Claim按钮点击事件
  const handleMyClaimClick = () => {
    navigate('/my-claimed-redpackets')
  }

  // Determine button type
  const renderActionButton = () => {
    if (status === 'input') {
      return (
        <Button
          colorScheme="blue"
          size="lg"
          mt={6}
          onClick={handleClaimLinkSubmit}
        >
          Submit Claim Link
        </Button>
      )
    }
    if (status === 'info') {
      return (
        <Button
          colorScheme="green"
          variant="solid"
          size="lg"
          mt={6}
          onClick={handleClaim}
          isLoading={loading}
          loadingText="Claiming..."
          bg="green.500"
          _hover={{ bg: "green.600" }}
          _active={{ bg: "green.700" }}
          boxShadow="lg"
          fontWeight="bold"
          px={8}
        >
          🎁 Claim Red Packet
        </Button>
      )
    }
    if (status === 'success') {
      return (
        <VStack spacing={3} mt={6} w="100%">
          <Button
            variant="solid"
            size="lg"
            onClick={() => navigate('/')}
            bg="#4079FF"
            _hover={{ bg: "#3066E6" }}
            _active={{ bg: "#2555CC" }}
            color="white"
            fontWeight="bold"
            leftIcon={<Icon as={FaHome} />}
            w="200px"
            borderRadius="lg"
          >
            Home
          </Button>
          <Button
            variant="solid"
            size="lg"
            onClick={handleMyClaimClick}
            bg="#4079FF"
            _hover={{ bg: "#3066E6" }}
            _active={{ bg: "#2555CC" }}
            color="white"
            fontWeight="bold"
            w="200px"
            borderRadius="lg"
          >
            My Claim
          </Button>
        </VStack>
      )
    }
    if (status === 'fail' || status === 'empty') {
      return (
        <Button
          colorScheme="blue"
          variant="solid"
          size="lg"
          mt={6}
          onClick={() => navigate('/')}
          bg="blue.500"
          _hover={{ bg: "blue.600" }}
          _active={{ bg: "blue.700" }}
          color="white"
          fontWeight="bold"
        >
          Back to Home
        </Button>
      )
    }
    return null
  }

  return (
    <Box minH="100vh" bg="linear-gradient(180deg, #fff 0%, #e9e9e9 100%)">
      {/* 头部导航现在由Header组件统一处理 */}

      {/* Content area */}
      <Box minH="100vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center" pt="80px">
        <VStack spacing={6} align="center" w="100%" mt="40px">
          <Text fontSize="3xl" fontWeight="bold" color="gray.900" textAlign="center">
            Claim My {isAirdropMode ? 'Airdrops' : 'Red Packets'}
          </Text>
          

          {/* Status switching */}
          {status === 'input' && (
            <Box
              bg="white"
              borderRadius="xl"
              boxShadow="2xl"
              px={8}
              py={6}
              w="500px" 
              maxW="98vw" 
              minH="400px" 
              mx="auto"
              position="relative"
            >
              {/* 左上角模式图片与文字 */}
              <Box position="absolute" top="-80px" left="-80px" zIndex={10}>
                <Box position="relative" display="inline-block">
                  <Image
                    src={'/redpacket-parachute.png'}
                    alt={isAirdropMode ? 'Airdrop' : 'Red Packet'}
                    boxSize="160px"
                    objectFit="contain"
                  />
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
                    {isAirdropMode ? 'Airdrop' : 'Red Packet'}
                  </Box>
                </Box>
              </Box>
              
              <VStack spacing={4} align="stretch">
                <Text fontSize="lg" fontWeight="semibold" color="gray.800" textAlign="center">
                  Enter Claim Link
                </Text>
                <Text fontSize="md" color="gray.600" textAlign="center">
                  Please paste the {isAirdropMode ? 'airdrop' : 'red packet'} claim link you received
                </Text>
                <Input
                  placeholder="https://yourapp.com/claim?id=...&creator=...&ipfsCID=..."
                  value={claimLink}
                  onChange={(e) => setClaimLink(e.target.value)}
                  size="lg"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleClaimLinkSubmit()
                    }
                  }}
                />
              </VStack>
            </Box>
          )}
          {status === 'loading' && (
            <Box
              bg="white"
              borderRadius="xl"
              boxShadow="2xl"
              px={8}
              py={6}
              w="500px" maxW="98vw" minH="400px" 
              mx="auto"
              position="relative"
            >
              {/* 左上角模式图片与文字 */}
              <Box position="absolute" top="-80px" left="-80px" zIndex={10}>
                <Box position="relative" display="inline-block">
                  <Image
                    src={'/redpacket-parachute.png'}
                    alt={isAirdropMode ? 'Airdrop' : 'Red Packet'}
                    boxSize="160px"
                    objectFit="contain"
                  />
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
                    {isAirdropMode ? 'Airdrop' : 'Red Packet'}
                  </Box>
                </Box>
              </Box>
              
              <VStack spacing={8} align="center" minH="180px" justify="center">
                <Text fontSize="md" color="gray.700">
                  {whitelistLoading 
                    ? 'Loading whitelist data from IPFS...' 
                    : ipfsCID 
                      ? 'Verify if you\'re eligible to claim (whitelist)'
                      : 'Verify if you\'re eligible to claim'
                  }
                </Text>
                <Spinner size="lg" color="gray.500" thickness="4px" />
              </VStack>
            </Box>
          )}
          {status === 'info' && (
            <Box
              bg="white"
              borderRadius="xl"
              boxShadow="2xl"
              px={8}
              py={6}
              w="500px" maxW="98vw" minH="400px" 
              mx="auto"
              position="relative"
            >
              {/* 左上角模式图片与文字 */}
              <Box position="absolute" top="-80px" left="-80px" zIndex={10}>
                <Box position="relative" display="inline-block">
                  <Image
                    src={'/redpacket-parachute.png'}
                    alt={isAirdropMode ? 'Airdrop' : 'Red Packet'}
                    boxSize="160px"
                    objectFit="contain"
                  />
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
                    {isAirdropMode ? 'Airdrop' : 'Red Packet'}
                  </Box>
                </Box>
              </Box>
              
              <VStack spacing={4} align="stretch">
                <HStack justify="center" mb={2}>
                  <Text fontWeight="bold" color="green.600">Nice, you're eligible to claim it!</Text>
                  <Icon as={CheckCircleIcon} color="green.500" boxSize={6} />
                </HStack>
                
                <VStack align="start" spacing={2} fontSize="md">
                  <HStack>
                    <Text color="gray.600">Token:</Text>
                    <Text fontWeight="semibold" color="gray.800">
                      {isSolParam === 'true'
                        ? 'SOL'
                        : (tokenNameParam || (tokenLoading ? 'Loading...' : (tokenInfo?.name || 'Unknown')))
                      }
                    </Text>
                  </HStack>
                  <HStack>
                    <Text color="gray.600">Token Contract Address:</Text>
                    <Code fontSize="sm">
                      {isSolParam === 'true'
                        ? SOL_MINT_ADDRESS
                        : (tokenContractParam || tokenAddress || '-')
                      }
                    </Code>
                  </HStack>
                  {/* <HStack>
                    <Text color="gray.600">Creator:</Text>
                    <Code fontSize="sm">{creator}</Code>
                  </HStack> */}
                  
                  {/* Red Packet Information Section */}
                  <Divider my={2} />
                  <VStack align="start" spacing={2} w="100%">
                    <Text color="gray.700" fontWeight="semibold" fontSize="md">📧 Red Packet Details:</Text>
                    
                    {redPacketDetailsLoading ? (
                      <HStack>
                        <Spinner size="sm" />
                        <Text color="gray.600">Loading red packet details...</Text>
                      </HStack>
                    ) : redPacketDetails ? (
                      <>
                        <HStack>
                          <Text color="gray.600">Type:</Text>
                          <Text fontWeight="semibold" color="gray.800">
                            {redPacketDetails.red_packet_type === 0 ? 'Fixed Red Packet' : 
                             redPacketDetails.red_packet_type === 1 ? 'Random Red Packet' : 
                             'Whitelist Airdrop'}
                          </Text>
                        </HStack>
                        <HStack>
                          <Text color="gray.600">Claim Progress:</Text>
                          <Text fontWeight="semibold" color={redPacketDetails.claimed_count >= redPacketDetails.packet_count ? 'red.600' : 'green.600'}>
                            {redPacketDetails.claimed_count}/{redPacketDetails.packet_count}
                            {redPacketDetails.claimed_count >= redPacketDetails.packet_count ? ' (Fully Claimed)' : ' Available'}
                          </Text>
                        </HStack>
                        <HStack>
                          <Text color="gray.600">Total Amount:</Text>
                          <AmountDisplay 
                            amount={redPacketDetails.total_amount} 
                            isSOL={isSolParam === 'true'}
                          />
                        </HStack>
                        <HStack>
                          <Text color="gray.600">Claimed Amount:</Text>
                          <AmountDisplay 
                            amount={redPacketDetails.claimed_amount} 
                            isSOL={isSolParam === 'true'}
                          />
                        </HStack>
                        <HStack>
                          <Text color="gray.600">Remaining:</Text>
                          <AmountDisplay 
                            amount={redPacketDetails.total_amount - redPacketDetails.claimed_amount} 
                            isSOL={isSolParam === 'true'}
                            color="blue.600"
                          />
                        </HStack>
                      </>
                    ) : ipfsData ? (
                      // Fallback to IPFS data if API call fails
                      <>
                        <HStack>
                          <Text color="gray.600">Type:</Text>
                          <Text fontWeight="semibold" color="gray.800">
                            {isAirdropMode ? 'Whitelist Airdrop' : 'Random Red Packet'}
                          </Text>
                        </HStack>
                        <HStack>
                          <Text color="gray.600">Total Recipients:</Text>
                          <Text fontWeight="semibold" color="gray.800">{ipfsData.entries.length}</Text>
                        </HStack>
                        <HStack>
                          <Text color="gray.600">Total Amount:</Text>
                          <AmountDisplay 
                            amount={ipfsData.metadata.totalAmount} 
                            isSOL={isSolParam === 'true'}
                          />
                        </HStack>
                        <HStack>
                          <Text color="gray.600">Claim Progress:</Text>
                          <Text fontWeight="semibold" color="green.600">Available to claim</Text>
                        </HStack>
                      </>
                    ) : (
                      <VStack align="start" spacing={1}>
                        <Text color="gray.600">
                          {redPacketDetailsLoading ? 'Loading details...' : 'Unable to load red packet details'}
                        </Text>
                        {!redPacketDetailsLoading && (
                          <Text color="red.500" fontSize="sm">
                            Check console for detailed error information
                          </Text>
                        )}
                      </VStack>
                    )}
                  </VStack>
                </VStack>
              </VStack>
            </Box>
          )}
          {status === 'success' && (
            <Box
              bg="white"
              borderRadius="xl"
              boxShadow="2xl"
              px={8}
              py={6}
              w="500px" maxW="98vw" minH="400px" 
              mx="auto"
              position="relative"
            >
              {/* 左上角模式图片与文字 */}
              <Box position="absolute" top="-80px" left="-80px" zIndex={10}>
                <Box position="relative" display="inline-block">
                  <Image
                    src={'/redpacket-parachute.png'}
                    alt={isAirdropMode ? 'Airdrop' : 'Red Packet'}
                    boxSize="160px"
                    objectFit="contain"
                  />
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
                    {isAirdropMode ? 'Airdrop' : 'Red Packet'}
                  </Box>
                </Box>
              </Box>
              
              <VStack spacing={6} align="center" minH="180px" justify="center">
                <HStack>
                  <Text fontWeight="bold" color="green.600" fontSize="lg">Nice! You've successfully claimed it!</Text>
                  <Icon as={CheckCircleIcon} color="green.500" boxSize={7} />
                </HStack>
                
                {/* 显示领取金额 */}
                <VStack spacing={1} w="100%">
                  <Text color="gray.600">Amount Claimed:</Text>
                  <Box
                    bg="green.50"
                    border="2px solid"
                    borderColor="green.200"
                    borderRadius="lg"
                    p={4}
                    w="100%"
                    textAlign="center"
                  >
                    <Text 
                      fontSize="2xl" 
                      fontWeight="bold" 
                      color="green.700"
                    >
                      {(() => {
                        if (claimedAmount > 0) {
                          // 有具体金额时显示实际金额
                          const isSOL = isSolParam === 'true';
                          const tokenSymbol = isSOL ? 'SOL' : (tokenNameParam || 'TOKEN');
                          
                          // 检查是否需要等待代币信息加载
                          if (!isSOL && tokenInfoState.loading) {
                            return 'Loading amount...';
                          }
                          
                          const formattedAmount = formatAmount(claimedAmount, isSOL);
                          return `${formattedAmount} ${tokenSymbol}`;
                        } else {
                          // 没有具体金额时显示通用消息
                          const tokenSymbol = isSolParam === 'true' ? 'SOL' : (tokenNameParam || 'TOKEN');
                          return `🎉 ${tokenSymbol} Red Packet Claimed!`;
                        }
                      })()}
                    </Text>
                    {claimedAmount === 0 && (
                      <Text fontSize="sm" color="gray.600" mt={2}>
                        Check transaction details for the exact amount
                      </Text>
                    )}
                  </Box>
                </VStack>

                {claimSuccessHash && (
                  <VStack spacing={1} w="100%">
                    <Text color="gray.600">Hash:</Text>
                    <Code 
                      fontSize="sm" 
                      w="100%" 
                      p={2} 
                      borderRadius="md"
                      wordBreak="break-all"
                      whiteSpace="pre-wrap"
                      textAlign="center"
                    >
                      {claimSuccessHash}
                    </Code>
                  </VStack>
                )}
                
                {/* 社区链接显示 */}
                {getCommunityLinks().length > 0 && (
                  <VStack spacing={3} w="100%">
                    <Text color="blue.600" fontWeight="semibold" fontSize="md">
                      Join the Community:
                    </Text>
                    <HStack spacing={4} justify="center">
                      {getCommunityLinks().map((link, index) => (
                        <Box
                          key={index}
                          as="button"
                          onClick={() => openCommunityLink(link.url)}
                          bg="blue.50"
                          _hover={{ bg: "blue.100", transform: "translateY(-2px)" }}
                          _active={{ transform: "translateY(0)" }}
                          p={3}
                          borderRadius="full"
                          transition="all 0.2s"
                          cursor="pointer"
                          boxSize="48px"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <img 
                            src={link.icon} 
                            alt={link.name} 
                            width={24} 
                            height={24}
                            style={{ flexShrink: 0 }}
                          />
                        </Box>
                      ))}
                    </HStack>
                    <Text color="blue.400" fontSize="xs" fontStyle="italic">
                      (This community link was provided by the creator)
                    </Text>
                  </VStack>
                )}
              </VStack>
            </Box>
          )}
          {status === 'fail' && (
            <Box
              bg="white"
              borderRadius="xl"
              boxShadow="2xl"
              px={8}
              py={6}
              w="500px" maxW="98vw" minH="400px" 
              mx="auto"
              position="relative"
            >
              {/* 左上角模式图片与文字 */}
              <Box position="absolute" top="-80px" left="-80px" zIndex={10}>
                <Box position="relative" display="inline-block">
                  <Image
                    src={'/redpacket-parachute.png'}
                    alt={isAirdropMode ? 'Airdrop' : 'Red Packet'}
                    boxSize="160px"
                    objectFit="contain"
                  />
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
                    {isAirdropMode ? 'Airdrop' : 'Red Packet'}
                  </Box>
                </Box>
              </Box>
              
              <VStack spacing={8} align="center" minH="180px" justify="center">
                <HStack>
                  <Text fontWeight="bold" color="red.600" fontSize="lg">Claim failed!</Text>
                  <Icon as={WarningIcon} color="red.500" boxSize={7} />
                </HStack>
                <Text color="gray.700">{claimError || 'Claim failed!'}</Text>
              </VStack>
            </Box>
          )}
          {status === 'empty' && (
            <Box
              bg="white"
              borderRadius="xl"
              boxShadow="2xl"
              px={8}
              py={6}
              minW="380px"
              maxW="98vw"
              mx="auto"
              position="relative"
            >
              {/* 左上角模式图片与文字 */}
              <Box position="absolute" top="-80px" left="-80px" zIndex={10}>
                <Box position="relative" display="inline-block">
                  <Image
                    src={'/redpacket-parachute.png'}
                    alt={isAirdropMode ? 'Airdrop' : 'Red Packet'}
                    boxSize="160px"
                    objectFit="contain"
                  />
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
                    {isAirdropMode ? 'Airdrop' : 'Red Packet'}
                  </Box>
                </Box>
              </Box>
              
              <VStack spacing={8} align="center" minH="180px" justify="center">
                <HStack>
                  <Text fontWeight="bold" color="orange.600" fontSize="lg">🎁 All Gone!</Text>
                  <Icon as={WarningIcon} color="orange.500" boxSize={7} />
                </HStack>
                <Text color="gray.700" textAlign="center">
                  This red packet has been fully claimed by other users. 
                  <br />
                  Better luck next time!
                </Text>
              </VStack>
            </Box>
          )}
          {/* Always visible action button */}
          <Box w="100%" display="flex" justifyContent="center" alignItems="center" mt={4}>
            {renderActionButton()}
          </Box>
        </VStack>
      </Box>
    </Box>
  )
} 