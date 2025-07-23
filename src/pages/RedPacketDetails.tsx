import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Flex,
  Badge,
  Code,
  Icon,
  Image,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Card,
  CardBody,
  Spinner,
  Alert,
  AlertIcon,
  IconButton,
} from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowBackIcon, CopyIcon } from '@chakra-ui/icons';
import { FaTwitter, FaTelegram, FaDiscord, FaWeixin } from 'react-icons/fa';
import { QRCodeCanvas } from 'qrcode.react';
import ShareComponent from '../components/ShareComponent';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, getMint } from '@solana/spl-token';
import redPacketIdl from '../constants/red_packet.json';
import { useParams } from 'react-router-dom';
import { SOL_MINT_ADDRESS, RED_PACKET_PROGRAM_ID, buildApiUrl, RPC_ENDPOINT } from '../config/constants';
import { useRedPacketService } from '../services/redPacketService';

// Token information interface
interface TokenInfo {
  decimals: number;
  supply: bigint;
  mintAuthority: PublicKey | null;
  freezeAuthority: PublicKey | null;
}

interface RedPacketDetailsData {
  creator: string;
  red_packet: string;
  total_amount: number;
  claimed_amount: number; // 实际被领取的金额
  packet_count: number;
  red_packet_type: number;
  expiry_time: number;
  is_sol: boolean;
  red_packet_id: number;
  mint: string;
  mint_name: string;
  mint_symbol: string;
  claimed_count: number;
  created_at?: string;
  with_draw_status?: number; // 提取状态：0-未提取，1-已提取
}

interface RecipientData {
  claimer_address: string;
  claim_amount: number;
  claim_time: string;
  transaction_hash: string;
}

export const RedPacketDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('solana');
  
  // 从URL参数获取信息
  const redPacketId = searchParams.get('id') || '';
  const creator = searchParams.get('creator') || '';
  const mode = searchParams.get('mode') || 'redpacket';
  const tokenAddress = searchParams.get('tokenAddress') || '';
  const tokenName = searchParams.get('tokenName') || '';
  const tokenSymbol = searchParams.get('tokenSymbol') || '';
  const isSol = searchParams.get('isSol') === 'true';
  const totalAmount = parseFloat(searchParams.get('totalAmount') || '0');
  const packetCount = parseInt(searchParams.get('packetCount') || '0');
  const claimedCount = parseInt(searchParams.get('claimedCount') || '0');
  const expiryTime = parseInt(searchParams.get('expiryTime') || '0');
  const redPacketType = parseInt(searchParams.get('redPacketType') || '0');
  const redPacketAddress = searchParams.get('redPacketAddress') || '';
  const createdAt = searchParams.get('createdAt') || '';
  const withDrawStatus = parseInt(searchParams.get('withDrawStatus') || '0');
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redPacketData, setRedPacketData] = useState<RedPacketDetailsData | null>(null);
  const [recipients, setRecipients] = useState<RecipientData[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  const [refundLoading, setRefundLoading] = useState(false);
  
  // 代币信息状态管理
  const [tokenInfoState, setTokenInfoState] = useState<{
    info: TokenInfo | null;
    loading: boolean;
    error: boolean;
  }>({ info: null, loading: false, error: false });
  
  // 创建Solana连接实例
  const connection = new Connection(RPC_ENDPOINT);
  
  // 构建分享链接
  const shareUrl = `${window.location.origin}/claim?id=${redPacketId}&creator=${creator}&mode=${mode}${tokenAddress ? `&tokenAddress=${tokenAddress}` : ''}&tokenName=${encodeURIComponent(tokenName)}&isSol=${isSol}`;

  // 获取代币信息的函数
  const fetchTokenInfo = async (mintAddress: string) => {
    if (tokenInfoState.loading || tokenInfoState.info) {
      return;
    }

    console.log('🔍 获取代币信息:', mintAddress.slice(0, 8) + '...');
    
    setTokenInfoState({ info: null, loading: true, error: false });

    try {
      const mintPublicKey = new PublicKey(mintAddress);
      const tokenInfo = await getMint(connection, mintPublicKey);
      
      console.log('✅ 代币信息获取成功:', {
        mint: mintAddress.slice(0, 8) + '...',
        decimals: tokenInfo.decimals
      });
      
      setTokenInfoState({ info: tokenInfo, loading: false, error: false });
      
    } catch (error) {
      console.error('❌ 代币信息获取失败:', mintAddress.slice(0, 8) + '...', error);
      setTokenInfoState({ info: null, loading: false, error: true });
    }
  };

  // 当红包数据加载完成且不是SOL代币时，获取代币信息
  useEffect(() => {
    if (redPacketData && !redPacketData.is_sol && redPacketData.mint) {
      fetchTokenInfo(redPacketData.mint);
    }
  }, [redPacketData]);

  // 获取红包领取者记录
  const fetchRecipients = async (redPacketAddress: string) => {
    try {
      // console.log('🔍 正在获取红包领取记录, red_packet_address:', redPacketAddress);
      
      const apiUrl = buildApiUrl(`/api/redpacket/get_claimed_list_by_redpacket/${redPacketAddress}?pageSize=50&pageNum=1`);
      // console.log('📡 Recipients API请求URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        // console.error('❌ Recipients API响应失败:', response.status, response.statusText);
        return; // 不阻塞主流程，只是不显示领取记录
      }
      
      const result = await response.json();
      // console.log('📦 Recipients API响应数据:', result);
      
      if (result.success) {
        // 确保 result.data 是数组，如果为空或null则使用空数组
        const dataArray = Array.isArray(result.data) ? result.data : [];
        
        // 转换API数据格式为前端需要的格式
        const recipientData: RecipientData[] = dataArray.map((item: any) => ({
          claimer_address: item.claimer,
          claim_amount: item.amount,
          claim_time: item.block_time || item.created_at,
          transaction_hash: item.transaction || ''
        }));
        
        setRecipients(recipientData);
        // console.log('✅ Recipients数据设置成功:', recipientData.length, '条记录');
      } else {
        // console.log('⚠️ Recipients API返回空数据或格式错误');
        setRecipients([]);
      }
    } catch (error) {
      // console.error('❌ 获取领取记录失败:', error);
      setRecipients([]); // 失败时设置为空数组，不影响主要功能
    }
  };

  // 格式化金额 - 根据代币类型使用正确的小数位数
  const formatAmount = (amount: number, isSol: boolean, providedDecimals?: number) => {
    if (isSol) {
      // SOL always uses 9 decimals
      const decimals = 9;
      const divisor = Math.pow(10, decimals);
    const formattedAmount = (amount / divisor);
      return formattedAmount.toFixed(Math.min(decimals, 6)).replace(/\.?0+$/, '');
    } else {
      // For SPL tokens, use actual decimals from token info if available
      const decimals = tokenInfoState.info?.decimals || providedDecimals || 6;
      const divisor = Math.pow(10, decimals);
      const formattedAmount = (amount / divisor);
      return formattedAmount.toFixed(Math.min(decimals, 6)).replace(/\.?0+$/, '');
    }
  };

  // 创建金额显示组件
  const AmountDisplay: React.FC<{ 
    amount: number;
    isSol: boolean;
    fontSize?: string;
    fontWeight?: string;
    color?: string;
  }> = ({ amount, isSol, fontSize = "3xl", fontWeight = "black", color = "gray.800" }) => {
    // 检查是否需要加载代币信息
    const needsTokenInfo = !isSol && redPacketData?.mint;
    const isLoading = needsTokenInfo && tokenInfoState.loading;
    
    // 使用 useMemo 缓存格式化金额的计算结果
    const formattedAmount = useMemo(() => {
      if (isLoading) return '';
      return formatAmount(amount, isSol);
    }, [
      amount,
      isSol,
      isLoading,
      tokenInfoState.info?.decimals
    ]);

    if (isLoading) {
      return (
        <HStack spacing={2} justify="center">
          <Spinner size="sm" color="blue.500" />
          <Text fontSize="sm" color="blue.500">
            Loading...
          </Text>
        </HStack>
      );
    }

    return (
      <Text 
        fontSize={fontSize === "3xl" ? { base: "xl", md: fontSize } : fontSize} 
        fontWeight={fontWeight} 
        color={color}
      >
        {formattedAmount}
      </Text>
    );
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    });
  };

  // 格式化ISO日期字符串
  const formatISODate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    });
  };

  // 计算剩余时间 - 使用实时时间
  const calculateTimeRemaining = (expiryTime: number) => {
    const remaining = expiryTime - currentTime;
    
    if (remaining <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remaining % (60 * 60)) / 60);
    const seconds = remaining % 60;
    
    return { days, hours, minutes, seconds };
  };

  // 实时更新倒计时
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 直接使用传递过来的数据，不再请求API
  useEffect(() => {
    if (!redPacketId || !creator) {
      setError('Missing required parameters');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 直接使用从MyCreate页面传递过来的真实数据
      const realData: RedPacketDetailsData = {
        creator,
        red_packet: redPacketAddress,
        total_amount: totalAmount,
        // 根据红包类型计算已领取金额
        claimed_amount: redPacketType === 0 
          ? Math.floor((totalAmount / packetCount) * claimedCount) // 固定金额红包
          : Math.floor((totalAmount * claimedCount) / packetCount), // 随机金额红包（估算）
        packet_count: packetCount,
        red_packet_type: redPacketType,
        expiry_time: expiryTime,
        is_sol: isSol,
        red_packet_id: parseInt(redPacketId),
        mint: tokenAddress || SOL_MINT_ADDRESS,
        mint_name: tokenName,
        mint_symbol: tokenSymbol || (isSol ? 'SOL' : 'TOKEN'),
        claimed_count: claimedCount,
        created_at: createdAt ? formatISODate(createdAt) : formatDate(expiryTime - (7 * 24 * 60 * 60)),
        with_draw_status: withDrawStatus // 使用从URL参数获取的实际提取状态
      };

      setRedPacketData(realData);
      
      // 获取红包的领取者记录（如果有红包地址）
      if (redPacketAddress && redPacketAddress.trim()) {
        fetchRecipients(redPacketAddress);
      } else {
        // console.log('⚠️ 缺少红包地址，无法获取领取记录');
        setRecipients([]);
      }
      
    } catch (err) {
      console.error('Failed to load red packet details:', err);
      setError('Failed to load red packet details');
    } finally {
      setLoading(false);
    }
  }, [redPacketId, creator, tokenAddress, tokenName, tokenSymbol, isSol, totalAmount, packetCount, claimedCount, expiryTime, redPacketType, redPacketAddress, createdAt]);

  if (loading) {
    return (
      <Box minH="100vh" bg="white" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading red packet details...</Text>
        </VStack>
      </Box>
    );
  }

  if (error || !redPacketData) {
    return (
      <Box minH="100vh" bg="white" p={8}>
        <Container maxW="800px" mx="auto">
          <Alert status="error">
            <AlertIcon />
            {error || 'Red packet not found'}
          </Alert>
          <Button mt={4} leftIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
            Back
          </Button>
        </Container>
      </Box>
    );
  }

  const timeRemaining = calculateTimeRemaining(redPacketData.expiry_time);

  // 计算剩余代币数量
  const getRemainingTokens = () => {
    const claimedCount = redPacketData.claimed_count || 0;
    return Math.max(0, redPacketData.packet_count - claimedCount);
  };

  // 判断是否可以退款
  const canRefund = () => {
    if (!redPacketData) return false;
    
    // 检查倒计时是否结束
    const timeRemaining = calculateTimeRemaining(redPacketData.expiry_time);
    const isExpired = timeRemaining.days === 0 && timeRemaining.hours === 0 && timeRemaining.minutes === 0 && timeRemaining.seconds === 0;
    
    // 检查是否有剩余代币
    const hasRemainingTokens = getRemainingTokens() > 0;
    
    // 检查提取状态：0表示未提取，1表示已提取
    const notWithdrawn = (redPacketData.with_draw_status || 0) === 0;
    
    // 只有当红包过期、无论有没有剩余代币，未被提取时都能refund
    // 目前是只有未领取完才可以退
    return isExpired && hasRemainingTokens && notWithdrawn;//hasRemainingTokens &&
  };

  // 处理退款点击
  const handleRefund = async () => {
    if (!canRefund() || refundLoading) {
      // 详细检查不能退款的原因
      const timeRemaining = calculateTimeRemaining(redPacketData!.expiry_time);
      const isExpired = timeRemaining.days === 0 && timeRemaining.hours === 0 && timeRemaining.minutes === 0 && timeRemaining.seconds === 0;
      const hasRemainingTokens = getRemainingTokens() > 0;
      const notWithdrawn = (redPacketData!.with_draw_status || 0) === 0;
      
      let reason = '';
      if (!isExpired) {
        reason = 'Red packet has not expired yet';
      } else if (!hasRemainingTokens) {
        reason = 'No remaining tokens to refund';
      } else if (!notWithdrawn) {
        reason = 'Funds have already been withdrawn';
      } else {
        reason = 'Refund is not available';
      }
      
      toast({
        title: 'Cannot Refund',
        description: reason,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!isConnected || !address || !walletProvider) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setRefundLoading(true); // 开始加载
      
      // 设置连接和程序
      const connection = new Connection(RPC_ENDPOINT);
      const provider = new AnchorProvider(
        connection,
        walletProvider as any,
        { commitment: 'confirmed' }
      );
      const program = new Program(redPacketIdl as any, provider);

      // 获取必要的账户地址
      const creatorPubkey = new PublicKey(address);
      const redPacketPubkey = new PublicKey(redPacketData.red_packet);
      const mintPubkey = redPacketData.is_sol 
        ? SystemProgram.programId 
        : new PublicKey(redPacketData.mint);

      // 确定token program
      const tokenProgram = redPacketData.is_sol 
        ? TOKEN_PROGRAM_ID 
        : TOKEN_PROGRAM_ID; // 可以根据需要切换到TOKEN_2022_PROGRAM_ID

      let creatorAta, poolAta;

      if (redPacketData.is_sol) {
        // SOL的情况
        creatorAta = creatorPubkey;
        poolAta = redPacketPubkey;
      } else {
        // SPL Token的情况
        creatorAta = getAssociatedTokenAddressSync(
          mintPubkey,
          creatorPubkey,
          false,
          tokenProgram
        );
        
        poolAta = getAssociatedTokenAddressSync(
          mintPubkey,
          redPacketPubkey,
          true, // allowOwnerOffCurve = true for PDA
          tokenProgram
        );
      }

      // console.log('Refund parameters:', {
      //   creator: creatorPubkey.toString(),
      //   redPacket: redPacketPubkey.toString(),
      //   mint: mintPubkey.toString(),
      //   creatorAta: creatorAta.toString(),
      //   poolAta: poolAta.toString(),
      //   redPacketId: redPacketData.red_packet_id,
      //   tokenProgram: tokenProgram.toString()
      // });

      // 使用新的红包服务调用refund方法
      const refundProvider = new AnchorProvider(
        connection,
        walletProvider as any,
        AnchorProvider.defaultOptions()
      );
      
      const redPacketService = useRedPacketService(connection, refundProvider);
      if (!redPacketService) {
        throw new Error('红包服务不可用');
      }
      
      const tx = await redPacketService.refundRedPacket(
        redPacketData.red_packet_id.toString(),
        redPacketData.creator,
        redPacketData.red_packet
      );

      // console.log('Refund transaction signature:', tx);

      // 调用API更新红包提取状态
      try {
        const updateResponse = await fetch(buildApiUrl(`/api/redpacket/update_withdraw_status/${redPacketData.red_packet}`), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (updateResponse.ok) {
          // console.log('Red packet withdraw status updated successfully');
          // 更新本地状态
          setRedPacketData(prev => prev ? { ...prev, with_draw_status: 1 } : null);
        } else {
          // console.error('Failed to update red packet withdraw status:', updateResponse.statusText);
        }
      } catch (apiError) {
        // console.error('Error calling update withdraw status API:', apiError);
        // 不阻止用户操作，只记录错误
      }

      toast({
        title: 'Refund Successful',
        description: `Transaction signature: ${tx.slice(0, 8)}...`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Refund failed:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        // 处理常见的Anchor错误
        if (error.message.includes('RedPacketNotExpired')) {
          errorMessage = 'Red packet has not expired yet';
        } else if (error.message.includes('NoFundsToRefund')) {
          errorMessage = 'No funds available for refund';
        } else if (error.message.includes('Unauthorized')) {
          errorMessage = 'You are not authorized to refund this red packet';
        }
      }

      toast({
        title: 'Refund Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setRefundLoading(false); // 结束加载
    }
  };

  return (
    <Box minH="100vh" bg="white">
      {/* 顶部导航 */}
      <Box bg="black" color="white" px={4} py={3}>
        <Container maxW="1200px" mx="auto">
          <HStack justify="center">
            <Text fontSize="xl" fontWeight="bold">AIDR</Text>
          </HStack>
        </Container>
      </Box>

      <Container maxW="1200px" mx="auto" px={{ base: 2, md: 4 }} py={{ base: 4, md: 8 }}>
        {/* Back按钮 */}
        <Box mb={6}>
          <Button
            leftIcon={<ArrowBackIcon />}
            bg="#4079FF"
            color="white"
            _hover={{ bg: "#3668e6" }}
            _active={{ bg: "#2c5acc" }}
            onClick={() => navigate(-1)}
            size="md"
            borderRadius="xl"
            fontWeight="medium"
          >
            Back
          </Button>
        </Box>
        <VStack spacing={8} align="stretch">
          {/* Token信息区域 */}
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
            {/* 左侧信息 */}
            <VStack spacing={6} align="stretch">
              {/* Token合约地址 */}
              <Box>
                <Text fontSize="sm" color="gray.600" mb={2} fontWeight="bold">
                  The Token Contract Address:
                </Text>
                <Code
                  fontSize="sm"
                  p={3}
                  borderRadius="xl"
                  bg="gray.100"
                  wordBreak="break-all"
                  fontWeight="bold"
                >
                  {redPacketData.mint}
                </Code>
              </Box>

              {/* 创建时间 */}
              <Box>
                <Text fontSize="sm" color="gray.600" mb={2} fontWeight="bold">
                  Created at:
                </Text>
                <Text fontSize="sm" color="gray.800" fontWeight="bold">
                  {redPacketData.created_at || formatDate(redPacketData.expiry_time - (7 * 24 * 60 * 60))}
                </Text>
              </Box>
            </VStack>

            {/* 右侧分享区域 */}
            <VStack spacing={4} align="stretch">
              <ShareComponent shareUrl={shareUrl} />
            </VStack>
          </SimpleGrid>

          {/* Tab区域 */}
          <Tabs index={activeTab} onChange={setActiveTab}>
            <TabList borderRadius="xl" overflowX="auto">
              <Tab 
                fontWeight="bold" 
                color="#4079FF" 
                borderRadius="xl" 
                _selected={{ color: 'white', bg: '#4079FF' }}
                fontSize={{ base: "sm", md: "md" }}
                px={{ base: 4, md: 6 }}
              >
                Airdrop Overview
              </Tab>
              <Tab 
                fontWeight="bold" 
                color="gray.600" 
                borderRadius="xl" 
                _selected={{ color: 'white', bg: '#4079FF' }}
                fontSize={{ base: "sm", md: "md" }}
                px={{ base: 4, md: 6 }}
              >
                Recipient
              </Tab>
            </TabList>

            <TabPanels>
              {/* Airdrop Overview Tab */}
              <TabPanel px={0} py={6}>
                <VStack spacing={6} align="stretch">
                  {/* 统计数据整体框 */}
                  <Box bg="gray.100" borderRadius="2xl" p={{ base: 4, md: 6 }}>
                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 4, md: 6 }}>
                      {/* 目标金额 */}
                      <Box textAlign="center">
                        <VStack spacing={2}>
                          <AmountDisplay 
                            amount={redPacketData.total_amount} 
                            isSol={redPacketData.is_sol}
                          />
                          <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" fontWeight="black">
                            {redPacketData.mint_symbol}
                          </Text>
                          <Text fontSize="xs" color="gray.500" fontWeight="black">
                            Target Amount
                          </Text>
                        </VStack>
                      </Box>

                      {/* 已领取金额 */}
                      <Box textAlign="center">
                        <VStack spacing={2}>
                          <AmountDisplay 
                            amount={redPacketData.claimed_amount} 
                            isSol={redPacketData.is_sol}
                          />
                          <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" fontWeight="black">
                            {redPacketData.mint_symbol}
                          </Text>
                          <Text fontSize="xs" color="gray.500" fontWeight="black">
                            Claimed Amount
                          </Text>
                        </VStack>
                      </Box>

                      {/* 领取人数 */}
                      <Box textAlign="center">
                        <VStack spacing={2}>
                          <Text fontSize={{ base: "xl", md: "3xl" }} fontWeight="black" color="gray.800">
                            {redPacketData.claimed_count}/{redPacketData.packet_count}
                          </Text>
                          <Text fontSize="xs" color="gray.500" fontWeight="black">
                            Number of Claimers
                          </Text>
                        </VStack>
                      </Box>

                      {/* 剩余时间 */}
                      <Box textAlign="center">
                        <VStack spacing={2}>
                          <VStack spacing={1} align="center">
                            {/* 移动端垂直布局 */}
                            <Box display={{ base: "block", md: "none" }}>
                              <VStack spacing={1}>
                                <HStack spacing={1}>
                                  <Text fontSize="lg" fontWeight="black" color="gray.800">
                                    {timeRemaining.days}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600" fontWeight="black">d</Text>
                                </HStack>
                                <HStack spacing={1}>
                                  <Text fontSize="lg" fontWeight="black" color="gray.800">
                                    {timeRemaining.hours}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600" fontWeight="black">h</Text>
                                </HStack>
                                <HStack spacing={1}>
                                  <Text fontSize="lg" fontWeight="black" color="gray.800">
                                    {timeRemaining.minutes}
                                  </Text>
                                  <Text fontSize="xs" color="gray.600" fontWeight="black">m</Text>
                                </HStack>
                                <HStack spacing={1}>
                                  <Text fontSize="md" fontWeight="black" color="gray.700">
                                    {timeRemaining.seconds}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500" fontWeight="black">s</Text>
                                </HStack>
                              </VStack>
                            </Box>
                            {/* 桌面端水平布局 */}
                            <HStack spacing={1} justify="center" align="baseline" display={{ base: "none", md: "flex" }}>
                              <Text fontSize="3xl" fontWeight="black" color="gray.800">
                                {timeRemaining.days}
                              </Text>
                              <Text fontSize="sm" color="gray.600" fontWeight="black">d</Text>
                              <Text fontSize="3xl" fontWeight="black" color="gray.800">
                                {timeRemaining.hours}
                              </Text>
                              <Text fontSize="sm" color="gray.600" fontWeight="black">h</Text>
                              <Text fontSize="3xl" fontWeight="black" color="gray.800">
                                {timeRemaining.minutes}
                              </Text>
                              <Text fontSize="sm" color="gray.600" fontWeight="black">m</Text>
                              <Text fontSize="xl" fontWeight="black" color="gray.700">
                                {timeRemaining.seconds}
                              </Text>
                              <Text fontSize="xs" color="gray.500" fontWeight="black">s</Text>
                            </HStack>
                          </VStack>
                          <Text fontSize="xs" color="gray.500" fontWeight="black">
                            Time Remaining
                          </Text>
                        </VStack>
                      </Box>
                    </SimpleGrid>
                  </Box>

                  {/* Refund按钮 */}
                  <Flex justify="center" pt={4}>
                    <Button
                      bg={canRefund() && !refundLoading ? "#4079FF" : "gray.400"}
                      color="white"
                      size={{ base: "md", md: "lg" }}
                      px={{ base: 8, md: 12 }}
                      py={3}
                      borderRadius="xl"
                      fontWeight="bold"
                      width={{ base: "full", md: "auto" }}
                      maxW={{ base: "300px", md: "none" }}
                      isDisabled={!canRefund() || refundLoading}
                      isLoading={refundLoading}
                      loadingText="Processing..."
                      _hover={canRefund() && !refundLoading ? { bg: "#3668e6" } : {}}
                      _active={canRefund() && !refundLoading ? { bg: "#2c5acc" } : {}}
                      _disabled={{
                        bg: "gray.400",
                        color: "gray.200",
                        cursor: "not-allowed",
                        _hover: { bg: "gray.400" }
                      }}
                      onClick={handleRefund}
                    >
                      {refundLoading ? 'Processing...' : (canRefund() ? 'refund' : 'refund (unavailable)')}
                    </Button>
                  </Flex>
                </VStack>
              </TabPanel>

              {/* Recipient Tab */}
              <TabPanel px={0} py={6}>
                <VStack spacing={4} align="stretch">
                  <Text fontSize="lg" fontWeight="bold" color="gray.800">
                    Recent Recipients ({recipients.length})
                  </Text>
                  
                  {recipients.length === 0 ? (
                    <Alert status="info">
                      <AlertIcon />
                      No recipients yet
                    </Alert>
                  ) : (
                    <VStack spacing={3} align="stretch">
                      {recipients.map((recipient, index) => (
                        <Card key={index} borderRadius="xl" boxShadow="sm">
                          <CardBody py={4}>
                            <HStack justify="space-between" wrap="wrap">
                              <VStack align="start" spacing={1}>
                                <Text fontSize="sm" fontWeight="medium" color="gray.800">
                                  {recipient.claimer_address.slice(0, 8)}...{recipient.claimer_address.slice(-8)}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {new Date(recipient.claim_time).toLocaleString()}
                                </Text>
                              </VStack>
                              <VStack align="end" spacing={1}>
                                <HStack spacing={1}>
                                <Text fontSize="sm" fontWeight="bold" color="green.600">
                                    +
                                </Text>
                                  <AmountDisplay 
                                    amount={recipient.claim_amount} 
                                    isSol={redPacketData.is_sol}
                                    fontSize="sm"
                                    fontWeight="bold"
                                    color="green.600"
                                  />
                                  <Text fontSize="sm" fontWeight="bold" color="green.600">
                                    {redPacketData.mint_symbol}
                                  </Text>
                                </HStack>
                                <HStack spacing={1}>
                                  <Text 
                                    fontSize="xs" 
                                    color="blue.500" 
                                    fontFamily="mono"
                                    cursor="pointer"
                                    onClick={() => window.open(`https://explorer.solana.com/tx/${recipient.transaction_hash}`, '_blank')}//https://explorer.solana.com/tx/${recipient.transaction_hash}?cluster=devnet
                                    _hover={{ textDecoration: 'underline' }}
                                  >
                                    {recipient.transaction_hash.slice(0, 8)}...{recipient.transaction_hash.slice(-8)}
                                  </Text>
                                  <IconButton
                                    aria-label="Copy transaction hash"
                                    icon={<CopyIcon />}
                                    size="xs"
                                    variant="ghost"
                                    color="gray.500"
                                    _hover={{ color: "blue.500" }}
                                    onClick={() => {
                                      navigator.clipboard.writeText(recipient.transaction_hash);
                                      toast({
                                        title: "复制成功",
                                        description: "交易哈希已复制到剪贴板",
                                        status: "success",
                                        duration: 2000,
                                        isClosable: true,
                                      });
                                    }}
                                  />
                                </HStack>
                              </VStack>
                            </HStack>
                          </CardBody>
                        </Card>
                      ))}
                    </VStack>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </Box>
  );
}; 