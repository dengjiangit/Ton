import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Card,
  CardBody,
  VStack,
  HStack,
  Input,
  Textarea,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Progress,
  SimpleGrid,
  IconButton,
  useToast,
  Container,
  Divider,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@chakra-ui/icons';
import ShareComponent from '../components/ShareComponent';
import { buildApiUrl } from '../config/constants';
import { IPFSService } from '../services/ipfsService';

interface CrowdfundingDetailsData {
  // 基本信息
  red_packet: string;
  creator: string;
  tokenName: string;
  tokenSymbol: string;
  mint: string;
  
  // 募资信息
  fundingGoal: number;
  solRaised: number;
  support_count?: number;
  support_amount?: number;
  
  // 代币信息
  totalAmount: number;
  tokensPerSol: string;
  
  // 时间信息
  expiryTime: number;
  timestamp: number;
  unlockStartTime: number;
  devFundStartTime: number;
  
  // 状态信息
  success: boolean;
  settled: boolean;
  feesDistributed: boolean;
  
  // 分配信息
  allocations: string; // JSON字符串格式
  creatorDirectAmount: number;
  devFundSolAmount: number;
  devFundClaimed: number;
  airdropMaxCount: number;
  airdropClaimed: number;
  referralRewardAmount: number;
  referralRewardPoolName: string;
  
  // 流动性信息
  liquidityPool: string;
  liquiditySolAmount: number;
  liquidityTokenAmount: number;
  liquidityFeeCreatorPercent: number;
  
  // 费用信息
  protocolFeeAmount: number;
  
  // 时间戳
  created_at: string;
  updated_at: string;
  
  // 新增字段
  claim_count?: number;
  claim_amount?: number;
  x_url?: string;
  tg_url?: string;
  discord_url?: string;
  
  // IPFS相关
  ipfsCID?: string;
  uri?: string; // IPFS CID
  projectBlurb?: string; // 从IPFS获取的项目描述
  projectId?: string; // 从IPFS获取的项目ID
}

// 支持者信息接口
interface RecipientData {
  transaction: string;
  slot: number;
  contract_address: string;
  type: number; // 0: claim, 1: support
  user: string;
  red_packet: string;
  amount: number;
  timestamp: number;
  created_at: string;
  updated_at: string;
}

// API响应接口
interface RecipientApiResponse {
  data: RecipientData[];
  message: string;
  success: boolean;
  total: number;
}

export const CrowdfundingDetails: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  const [projectData, setProjectData] = useState<CrowdfundingDetailsData>({
    red_packet: searchParams.get('redPacket') || '',
    creator: searchParams.get('creator') || '',
    tokenName: searchParams.get('tokenName') || '',
    tokenSymbol: searchParams.get('tokenSymbol') || '',
    mint: '',
    fundingGoal: parseInt(searchParams.get('fundingGoal') || '0'),
    solRaised: 0,
    support_count: 0,
    support_amount: 0,
    totalAmount: parseInt(searchParams.get('totalSupply') || '0'),
    tokensPerSol: '0',
    expiryTime: parseInt(searchParams.get('expiryTime') || '0'),
    timestamp: 0,
    unlockStartTime: 0,
    devFundStartTime: 0,
    success: false,
    settled: false,
    feesDistributed: false,
    allocations: '',
    creatorDirectAmount: 0,
    devFundSolAmount: 0,
    devFundClaimed: 0,
    airdropMaxCount: 0,
    airdropClaimed: 0,
    referralRewardAmount: 0,
    referralRewardPoolName: '',
    liquidityPool: '',
    liquiditySolAmount: 0,
    liquidityTokenAmount: 0,
    liquidityFeeCreatorPercent: 0,
    protocolFeeAmount: 0,
    created_at: searchParams.get('createdAt') || '',
    updated_at: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingIPFS, setLoadingIPFS] = useState(false);
  const [ipfsData, setIpfsData] = useState<any>(null);
  
  // 支持者数据状态
  const [recipients, setRecipients] = useState<RecipientData[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);

  // 获取项目详情数据
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!projectData.red_packet) {
        setError('Red packet address is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const apiUrl = buildApiUrl(`/api/one_launch/crowdfunding_program/project_leader/get_info/${projectData.red_packet}`);
        console.log('API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseData = await response.json();
        console.log('API Response:', responseData);
        
        if (!responseData.success) {
          throw new Error(responseData.message || 'API request failed');
        }
        
        const data = responseData.data;
        
        // 更新项目数据
        setProjectData(prevData => ({
          ...prevData,
          ...data,
        }));
        
        // 如果有uri字段，从IPFS获取项目详细信息
        if (data.uri) {
          await loadIPFSData(data.uri);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching project details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch project details');
        toast({
          title: "Error",
          description: "Failed to load project details",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [projectData.red_packet, toast]);

  // 从IPFS获取项目详细信息
  const loadIPFSData = async (ipfsCID: string) => {
    if (!ipfsCID) return;
    
    setLoadingIPFS(true);
    try {
      const ipfsService = new IPFSService();
      const data = await ipfsService.getData(ipfsCID);
      console.log('✅ IPFS数据获取成功:', data);
      
      setIpfsData(data);
      
      // 更新项目数据中的projectBlurb和projectId
      if (data.projectBlurb) {
        setProjectData(prevData => ({
          ...prevData,
          projectBlurb: data.projectBlurb
        }));
      }
      
      if (data.projectId) {
        setProjectData(prevData => ({
          ...prevData,
          projectId: data.projectId
        }));
      }
      
    } catch (error) {
      console.error('❌ IPFS数据获取失败:', error);
      toast({
        title: "IPFS数据获取失败",
        description: "无法加载项目详细信息",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingIPFS(false);
    }
  };

  // 获取支持者数据
  const fetchRecipients = useCallback(async () => {
    if (!projectData.red_packet) {
      setRecipientsError('Red packet address is required');
      return;
    }

    try {
      setLoadingRecipients(true);
      setRecipientsError(null);
      
      const apiUrl = buildApiUrl(`/api/one_launch/crowdfunding_program/project_leader/get_recipient/${projectData.red_packet}?pageSize=10&pageNum=1`);
      console.log('🔍 请求支持者数据:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 支持者API响应状态:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: RecipientApiResponse = await response.json();
      console.log('📋 支持者API响应数据:', result);
      
      if (result.success) {
        console.log('✅ 获取支持者数据成功，数量:', result.data?.length || 0);
        setRecipients(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch recipients data');
      }
    } catch (err) {
      console.error('❌ 获取支持者数据失败:', err);
      setRecipientsError(err instanceof Error ? err.message : 'Failed to fetch recipients data');
    } finally {
      setLoadingRecipients(false);
    }
  }, [projectData.red_packet]);

  // 实时倒计时更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 监听标签页切换，获取支持者数据
  const [activeTab, setActiveTab] = useState(0);
  
  useEffect(() => {
    if (activeTab === 1 && projectData.red_packet) {
      fetchRecipients();
    }
  }, [activeTab, projectData.red_packet, fetchRecipients]);

  // 格式化时间
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  };

  const formatISODate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  };

  // 计算剩余时间
  const calculateTimeRemaining = (expiryTime: number) => {
    const remaining = expiryTime - currentTime;
    if (remaining <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    
    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remaining % (60 * 60)) / 60);
    const seconds = remaining % 60;
    
    return { days, hours, minutes, seconds, expired: false };
  };

  // 格式化金额
  const formatSolAmount = (lamports: number) => {
    return (lamports / 1e9).toFixed(6).replace(/\.?0+$/, '');
  };

  // 格式化代币总量显示
  const formatTotalSupply = (totalSupply: number) => {
    const smallestUnits = BigInt(totalSupply);
    const tokens = Number(smallestUnits) / Math.pow(10, 9);
    return tokens.toFixed(9).replace(/\.?0+$/, '');
  };

  // 解析分配方案
  const parseAllocations = () => {
    try {
      if (!projectData.allocations) return [];
      return JSON.parse(projectData.allocations);
    } catch (error) {
      console.error('解析分配方案失败:', error);
      return [];
    }
  };

  // 计算进度率
  const calculateProgressRate = () => {
    if (!projectData.fundingGoal || !projectData.solRaised) return 0;
    return Math.min((projectData.solRaised / projectData.fundingGoal) * 100, 100);
  };

  const progressRate = calculateProgressRate();
  const allocations = parseAllocations();

  const timeRemaining = calculateTimeRemaining(projectData.expiryTime);
  // 修复链接拼接，使用从IPFS获取的projectId，去掉不需要的id参数
  const shareUrl = useMemo(() => {
    let url = `${window.location.origin}/claim-launchpad?creator=${projectData.creator}&mint=${projectData.mint}&projectId=${projectData.projectId || projectData.red_packet}`;
    
    // 如果有IPFS CID，添加到分享链接中
    if (projectData.uri && projectData.uri.trim()) {
      url += `&ipfsCID=${projectData.uri}`;
    }
    return url;
  }, [projectData.creator, projectData.mint, projectData.projectId, projectData.uri, projectData.red_packet]);
  
  // 显示加载状态
  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text fontSize="lg" color="gray.600">Loading project details...</Text>
        </VStack>
      </Box>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <Box minH="100vh" bg="gray.50">
        <Box bg="black" color="white" px={6} py={4}>
          <Text fontSize="xl" fontWeight="bold">AIDR</Text>
        </Box>
        <Container maxW="1200px" mx="auto" py={8}>
          <Alert status="error" borderRadius="lg">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Error loading project details</Text>
              <Text fontSize="sm">{error}</Text>
            </Box>
          </Alert>
          <Button 
            mt={4} 
            leftIcon={<ArrowLeftIcon />} 
            onClick={() => navigate('/my-created-crowdfunding')}
            bg="#4079FF"
            color="white"
            _hover={{ bg: '#3668e6' }}
          >
            Back to Projects
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Box bg="black" color="white" px={4} py={4}>
        <Text fontSize="xl" fontWeight="bold">AIDR</Text>
      </Box>

      {/* Main Content */}
      <Container maxW="1200px" mx="auto" py={4} px={4}>
        <Card bg="white" borderRadius="xl" boxShadow="lg" border="1px solid" borderColor="blue.200">
          <CardBody p={{ base: 4, md: 8 }}>
            {/* Title and Back Button - 响应式布局 */}
            <Box position="relative" mb={8}>
              {/* Back Button - 移动端顶部，桌面端左上角 */}
              <Box 
                position={{ base: "static", md: "absolute" }}
                top={{ md: "0" }}
                left={{ md: "0" }}
                mb={{ base: 4, md: 0 }}
              >
                <Button
                  leftIcon={<ArrowLeftIcon />}
                  bg="#4079FF"
                  color="white"
                  borderRadius="md"
                  px={4}
                  py={2}
                  size={{ base: "sm", md: "md" }}
                  _hover={{ bg: '#3668e6' }}
                  _active={{ bg: '#2c5acc' }}
                  onClick={() => navigate('/my-created-crowdfunding')}
                >
                  Back
                </Button>
              </Box>
              
              {/* Title */}
              <Text 
                fontSize={{ base: "2xl", md: "3xl" }} 
                fontWeight="bold" 
                color="#1A202C" 
                textAlign={{ base: "left", md: "center" }} 
                mt={{ base: 0, md: 8 }}
              >
                Dashboard
              </Text>
            </Box>

            <VStack spacing={8} align="stretch">
              {/* Project Information Section */}
              <VStack spacing={6} align="stretch">
                <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold" color="#1A202C" mb={4}>
                  Project Information
                </Text>
                
                {/* 项目信息卡片 */}
                <Card bg="gray.50" borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <CardBody p={{ base: 4, md: 6 }}>
                    <VStack spacing={4} align="stretch">
                      {/* Row 1: Token Information - 响应式布局 */}
                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                        <Box>
                          <Text fontSize="sm" color="#1A202C" mb={2} fontWeight="bold">Token Name:</Text>
                          <Input 
                            value={projectData.tokenName} 
                            isReadOnly 
                            bg="white"
                            borderColor="gray.300"
                            size="sm"
                            fontWeight="bold"
                          />
                        </Box>
                        
                        <Box>
                          <Text fontSize="sm" color="#1A202C" mb={2} fontWeight="bold">Token Symbol:</Text>
                          <Input 
                            value={projectData.tokenSymbol} 
                            isReadOnly 
                            bg="white"
                            borderColor="gray.300"
                            size="sm"
                            fontWeight="bold"
                          />
                        </Box>
                        
                        <Box>
                          <Text fontSize="sm" color="#1A202C" mb={2} fontWeight="bold">Token Supply:</Text>
                          <Input 
                            value={`${formatTotalSupply(projectData.totalAmount)} ${projectData.tokenSymbol}`} 
                            isReadOnly 
                            bg="white"
                            borderColor="gray.300"
                            size="sm"
                            fontWeight="bold"
                          />
                        </Box>
                      </SimpleGrid>
                      
                      {/* Row 2: Project Status and Token Info - 响应式布局 */}
                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                        <Box>
                          <Text fontSize="sm" color="#1A202C" mb={2} fontWeight="bold">Project Status:</Text>
                          <Input 
                            value={projectData.success ? 'Success' : projectData.settled ? 'Settled' : 'Active'} 
                            isReadOnly 
                            bg="white"
                            borderColor="gray.300"
                            size="sm"
                            fontWeight="bold"
                            color={projectData.success ? 'green.600' : projectData.settled ? 'orange.600' : 'blue.600'}
                          />
                        </Box>
                        
                        <Box>
                          <Text fontSize="sm" color="#1A202C" mb={2} fontWeight="bold">Tokens per SOL:</Text>
                          <Input 
                            value={projectData.tokensPerSol || '0'} 
                            isReadOnly 
                            bg="white"
                            borderColor="gray.300"
                            size="sm"
                            fontWeight="bold"
                          />
                        </Box>
                        
                        <Box>
                          <Text fontSize="sm" color="#1A202C" mb={2} fontWeight="bold">Mint Address:</Text>
                          <Input 
                            value={projectData.mint || 'N/A'} 
                            isReadOnly 
                            bg="white"
                            borderColor="gray.300"
                            fontFamily="mono"
                            fontSize="xs"
                            size="sm"
                            fontWeight="bold"
                          />
                        </Box>
                      </SimpleGrid>
                      
                      {/* Row 3: Project Introduction - 全宽 */}
                      <Box>
                        <Text fontSize="sm" color="#1A202C" mb={2} fontWeight="bold">Project Intro:</Text>
                        <Textarea 
                          value={loadingIPFS ? 
                            'Loading project information from IPFS...' : 
                            projectData.projectBlurb || 'No project description available'
                          }
                          isReadOnly 
                          bg="white"
                          borderColor="gray.300"
                          minH="120px"
                          size="sm"
                          fontWeight="bold"
                        />
                      </Box>
                      
                      {/* Row 4: Token Contract Address - 带复制按钮 */}
                      <Box>
                        <Text fontSize="sm" color="#1A202C" mb={2} fontWeight="bold">The Token Contract Address:</Text>
                        <HStack spacing={2}>
                          <Input 
                            value={projectData.red_packet} 
                            isReadOnly 
                            bg="white"
                            borderColor="gray.300"
                            fontFamily="mono"
                            fontSize={{ base: "xs", md: "sm" }}
                            size="sm"
                            fontWeight="bold"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            color="gray.500"
                            _hover={{ color: "blue.500" }}
                            onClick={() => {
                              navigator.clipboard.writeText(projectData.red_packet);
                              toast({
                                title: "Address copied!",
                                description: "Token contract address copied to clipboard",
                                status: "success",
                                duration: 2000,
                                isClosable: true,
                              });
                            }}
                          >
                            📋
                          </Button>
                        </HStack>
                      </Box>
                      
                      {/* Row 5: Created at - 全宽 */}
                      <Box>
                        <Text fontSize="sm" color="#1A202C" mb={2} fontWeight="bold">Created at:</Text>
                        <Input 
                          value={formatISODate(projectData.created_at)} 
                          isReadOnly 
                          bg="white"
                          borderColor="gray.300"
                          size="sm"
                          fontWeight="bold"
                        />
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>

              <Divider />

              {/* Claim Link and Sharing Section */}
              <VStack spacing={6} align="stretch">
                <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold" color="#1A202C">
                  Claim Link
                </Text>
                
                {/* 使用ShareComponent替换原有的分享内容 - 响应式宽度 */}
                <Box w={{ base: "100%", md: "50%" }} mx="auto">
                  <ShareComponent shareUrl={shareUrl} />
                </Box>
              </VStack>

              <Divider />

              {/* OneLaunch Overview Section */}
              <VStack spacing={6} align="stretch">
                <Tabs variant="enclosed" colorScheme="blue" index={activeTab} onChange={setActiveTab}>
                  <Box overflowX="auto" css={{
                    '&::-webkit-scrollbar': {
                      height: '4px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f1f1',
                      borderRadius: '2px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#c1c1c1',
                      borderRadius: '2px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: '#a8a8a8',
                    },
                  }}>
                    <TabList bg="gray.100" borderRadius="md" p={1} minW="max-content" display="flex">
                      <Tab 
                        bg="white" 
                        color="#2264FF" 
                        borderRadius="md"
                        fontSize={{ base: "sm", md: "md" }}
                        whiteSpace="nowrap"
                        flexShrink={0}
                        _selected={{ bg: "#4079FF", color: "white" }}
                      >
                        OneLaunch Overview
                      </Tab>
                      <Tab 
                        bg="white" 
                        color="#2264FF" 
                        borderRadius="md"
                        fontSize={{ base: "sm", md: "md" }}
                        whiteSpace="nowrap"
                        flexShrink={0}
                        _selected={{ bg: "#4079FF", color: "white" }}
                      >
                        Recipient
                      </Tab>
                      <Tab 
                        bg="white" 
                        color="#2264FF" 
                        borderRadius="md"
                        fontSize={{ base: "sm", md: "md" }}
                        whiteSpace="nowrap"
                        flexShrink={0}
                        _selected={{ bg: "#4079FF", color: "white" }}
                      >
                        Token unlocking
                      </Tab>
                    </TabList>
                  </Box>
                  
                  <TabPanels>
                    <TabPanel>
                      <VStack spacing={6} align="stretch">
                        {/* Key Metrics - 响应式布局 */}
                        <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4}>
                          <VStack spacing={2}>
                            <HStack spacing={1} align="baseline" flexWrap="wrap">
                              <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="900" color="#1A202C">
                                {formatSolAmount(projectData.fundingGoal)}
                              </Text>
                              <Text fontSize="sm" color="#1A202C" fontWeight="bold">
                                $SOL
                              </Text>
                            </HStack>
                            <Text fontSize="sm" color="#1A202C" fontWeight="bold">Target Amount</Text>
                          </VStack>
                          
                          <VStack spacing={2}>
                            <HStack spacing={1} align="baseline" flexWrap="wrap">
                              <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="900" color="#1A202C">
                                {projectData.support_amount ? formatSolAmount(projectData.support_amount) : '0'}
                              </Text>
                              <Text fontSize="sm" color="#1A202C" fontWeight="bold">
                                $SOL
                              </Text>
                            </HStack>
                            <Text fontSize="sm" color="#1A202C" fontWeight="bold">Raised Amount</Text>
                          </VStack>
                          
                          <VStack spacing={2}>
                            <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="900" color="#1A202C">
                              {projectData.support_count || 0}
                            </Text>
                            <Text fontSize="sm" color="#1A202C" fontWeight="bold">Number of Backers</Text>
                          </VStack>
                          
                          <VStack spacing={2}>
                            {/* 移动端倒计时 - 垂直布局 */}
                            <VStack spacing={1} align="center">
                              <HStack spacing={2} align="baseline" flexWrap="wrap" justify="center">
                                <VStack spacing={0}>
                                  <Text fontSize={{ base: "xl", md: "3xl" }} fontWeight="900" color="#1A202C">
                                    {timeRemaining.expired ? '0' : timeRemaining.days}
                                  </Text>
                                  <Text fontSize="xs" color="#1A202C" fontWeight="bold">
                                    days
                                  </Text>
                                </VStack>
                                <VStack spacing={0}>
                                  <Text fontSize={{ base: "xl", md: "3xl" }} fontWeight="900" color="#1A202C">
                                    {timeRemaining.expired ? '0' : timeRemaining.hours}
                                  </Text>
                                  <Text fontSize="xs" color="#1A202C" fontWeight="bold">
                                    hours
                                  </Text>
                                </VStack>
                                <VStack spacing={0}>
                                  <Text fontSize={{ base: "xl", md: "3xl" }} fontWeight="900" color="#1A202C">
                                    {timeRemaining.expired ? '0' : timeRemaining.minutes}
                                  </Text>
                                  <Text fontSize="xs" color="#1A202C" fontWeight="bold">
                                    min
                                  </Text>
                                </VStack>
                                <VStack spacing={0}>
                                  <Text fontSize={{ base: "xl", md: "3xl" }} fontWeight="900" color="#1A202C">
                                    {timeRemaining.expired ? '0' : timeRemaining.seconds}
                                  </Text>
                                  <Text fontSize="xs" color="#1A202C" fontWeight="bold">
                                    sec
                                  </Text>
                                </VStack>
                              </HStack>
                            </VStack>
                            <Text fontSize="sm" color="#1A202C" fontWeight="bold">Time Remaining</Text>
                          </VStack>
                        </SimpleGrid>
                        
                        {/* Progress Bar */}
                        <VStack spacing={3}>
                          <Progress 
                            value={progressRate} 
                            size="lg" 
                            bg="purple.100"
                            sx={{
                              '& > div': {
                                background: 'linear-gradient(90deg, #805AD5 0%, #6B46C1 100%)'
                              }
                            }}
                            borderRadius="full"
                            w="100%"
                            h="12px"
                          />
                          <Text fontSize="sm" color="#1A202C" fontWeight="bold">
                            Progress Rate: {progressRate.toFixed(1)}%
                          </Text>
                        </VStack>
                      </VStack>
                    </TabPanel>
                    
                    <TabPanel>
                      <VStack spacing={6} align="stretch">
                        <Text fontSize="lg" fontWeight="bold" color="#1A202C" mb={4}>
                          Supporters & Claimers
                        </Text>
                        
                        {loadingRecipients ? (
                          <Flex justify="center" align="center" minH="200px">
                            <VStack spacing={4}>
                              <Spinner size="xl" color="blue.500" />
                              <Text>Loading supporters data...</Text>
                            </VStack>
                          </Flex>
                        ) : recipientsError ? (
                          <Alert status="error">
                            <AlertIcon />
                            {recipientsError}
                          </Alert>
                        ) : recipients.length === 0 ? (
                          <Alert status="info">
                            <AlertIcon />
                            No supporters found for this project
                          </Alert>
                        ) : (
                          <Box
                            bg="white"
                            borderRadius="xl"
                            boxShadow="lg"
                            overflow="hidden"
                            w="full"
                          >
                            <TableContainer>
                              <Table variant="simple">
                                <Thead bg="gray.50">
                                  <Tr>
                                    <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>
                                      User
                                    </Th>
                                    <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>
                                      Type
                                    </Th>
                                    <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>
                                      Amount
                                    </Th>
                                    <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>
                                      Date
                                    </Th>
                                    <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>
                                      Action
                                    </Th>
                                  </Tr>
                                </Thead>
                                <Tbody>
                                  {recipients.map((recipient) => (
                                    <Tr key={recipient.transaction} _hover={{ bg: 'gray.50' }}>
                                      {/* User column */}
                                      <Td py={6}>
                                        <VStack spacing={1} align="start">
                                          <Text fontWeight="medium" color="gray.800" fontSize="md">
                                            {recipient.user.slice(0, 8)}...{recipient.user.slice(-8)}
                              </Text>
                                          <Text fontSize="xs" color="gray.500" fontFamily="mono">
                                            {recipient.user}
                              </Text>
                          </VStack>
                                      </Td>
                                      
                                      {/* Type column */}
                                      <Td py={6}>
                                        <Badge
                                          px={3}
                                          py={1}
                                          borderRadius="full"
                                          fontSize="xs"
                                          fontWeight="medium"
                                          bg={recipient.type === 1 ? "green.50" : "blue.50"}
                                          color={recipient.type === 1 ? "green.600" : "blue.600"}
                                          border="1px solid"
                                          borderColor={recipient.type === 1 ? "green.200" : "blue.200"}
                                        >
                                          {recipient.type === 1 ? "Support" : "Claim"}
                                        </Badge>
                                      </Td>
                                      
                                      {/* Amount column */}
                                      <Td py={6}>
                                        <Text color="gray.800" fontSize="md" fontWeight="medium">
                                          {formatSolAmount(recipient.amount)} SOL
                              </Text>
                                      </Td>
                            
                                      {/* Date column */}
                                      <Td py={6}>
                                        <Text color="gray.600" fontSize="sm">
                                          {formatDate(recipient.timestamp)}
                              </Text>
                                      </Td>
                        
                                      {/* Action column */}
                                      <Td py={6}>
                                        <Button
                                          size="sm"
                                          bg="blue.500"
                                          color="white"
                                          _hover={{ bg: "blue.600" }}
                                          onClick={() => {
                                            navigator.clipboard.writeText(recipient.transaction);
                                            toast({
                                              title: "Copied Successfully",
                                              description: "Transaction hash copied to clipboard",
                                              status: "success",
                                              duration: 2000,
                                              isClosable: true,
                                            });
                                          }}
                                          px={4}
                                          py={1}
                                        >
                                          Copy Hash
                                        </Button>
                                      </Td>
                                    </Tr>
                                  ))}
                                </Tbody>
                              </Table>
                            </TableContainer>
                          </Box>
                        )}
                      </VStack>
                    </TabPanel>
                    
                    <TabPanel>
                      <VStack spacing={6} align="stretch">
                        {/* 默认模型说明 */}
                        <Card bg="white" borderRadius="xl" boxShadow="lg">
                          <CardBody p={6}>
                            <Text 
                              fontSize="lg" 
                              color="gray.600" 
                              textAlign="center"
                              fontStyle="italic"
                            >
                              This model is set as default. If you need a customized version, feel free to contact us.
                            </Text>
                          </CardBody>
                        </Card>

                        {/* 主要内容区域 - 两列布局 */}
                        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
                          {/* 左侧：Current Tokenomics */}
                          <Card bg="white" borderRadius="xl" boxShadow="lg" h="fit-content">
                            <CardBody p={6}>
                              <VStack spacing={6} align="stretch">
                                {/* 标题 */}
                                <HStack justify="space-between" align="center">
                                  <Text fontSize="xl" fontWeight="bold" color="gray.800">
                                    Current Tokenomics
                                  </Text>
                                  <Box 
                                    bg="blue.500" 
                                    color="white" 
                                    fontSize="sm" 
                                    px={3} 
                                    py={1}
                                    borderRadius="full"
                                  >
                                    Token Distribution
                                  </Box>
                                </HStack>

                                <Divider />

                                {/* Tokenomics 列表 */}
                                <VStack spacing={4} align="stretch">
                                  <HStack spacing={3} align="flex-start">
                                    <Box 
                                      w={3} 
                                      h={3} 
                                      bg="blue.500" 
                                      borderRadius="full" 
                                      mt={2} 
                                      flexShrink={0}
                                    />
                                    <VStack spacing={1} align="stretch" flex={1}>
                                      <Text fontSize="md" fontWeight="semibold" color="gray.800">
                                        40% for public sale
                                      </Text>
                                    </VStack>
                                  </HStack>

                                  <HStack spacing={3} align="flex-start">
                                    <Box 
                                      w={3} 
                                      h={3} 
                                      bg="green.500" 
                                      borderRadius="full" 
                                      mt={2} 
                                      flexShrink={0}
                                    />
                                    <VStack spacing={1} align="stretch" flex={1}>
                                      <Text fontSize="md" fontWeight="semibold" color="gray.800">
                                        5% for airdrop
                                      </Text>
                                      <Text fontSize="sm" color="gray.600" lineHeight="1.4">
                                        Each participant receives a referral link after claiming, inviting 10 people grants one extra airdrop after the public sale succeeds
                                      </Text>
                                    </VStack>
                                  </HStack>

                                  <HStack spacing={3} align="flex-start">
                                    <Box 
                                      w={3} 
                                      h={3} 
                                      bg="purple.500" 
                                      borderRadius="full" 
                                      mt={2} 
                                      flexShrink={0}
                                    />
                                    <VStack spacing={1} align="stretch" flex={1}>
                                      <Text fontSize="md" fontWeight="semibold" color="gray.800">
                                        5% for post-sale airdrop
                                      </Text>
                                      <Text fontSize="sm" color="gray.600">
                                        Distributed after the public sale succeeds
                                      </Text>
                                    </VStack>
                                  </HStack>

                                  <HStack spacing={3} align="flex-start">
                                    <Box 
                                      w={3} 
                                      h={3} 
                                      bg="orange.500" 
                                      borderRadius="full" 
                                      mt={2} 
                                      flexShrink={0}
                                    />
                                    <VStack spacing={1} align="stretch" flex={1}>
                                      <Text fontSize="md" fontWeight="semibold" color="gray.800">
                                        25% for liquidity pool setup
                                      </Text>
                                    </VStack>
                                  </HStack>

                                  <HStack spacing={3} align="flex-start">
                                    <Box 
                                      w={3} 
                                      h={3} 
                                      bg="red.500" 
                                      borderRadius="full" 
                                      mt={2} 
                                      flexShrink={0}
                                    />
                                    <VStack spacing={1} align="stretch" flex={1}>
                                      <Text fontSize="md" fontWeight="semibold" color="gray.800">
                                        25% for the DAO Token Pool
                                      </Text>
                                      <Text fontSize="sm" color="gray.600">
                                        Unlock starts on Day 30, every 30 days as one cycle, fully unlocked in 12 batches
                                      </Text>
                                    </VStack>
                                  </HStack>
                                </VStack>
                              </VStack>
                            </CardBody>
                          </Card>

                          {/* 右侧：Current Fund Allocation */}
                          <Card bg="white" borderRadius="xl" boxShadow="lg" h="fit-content">
                            <CardBody p={6}>
                              <VStack spacing={6} align="stretch">
                                {/* 标题 */}
                                <HStack justify="space-between" align="center">
                                  <Text fontSize="xl" fontWeight="bold" color="gray.800">
                                    Current Fund Allocation
                                  </Text>
                                  <Box 
                                    bg="green.500" 
                                    color="white" 
                                    fontSize="sm" 
                                    px={3} 
                                    py={1}
                                    borderRadius="full"
                                  >
                                    Fund Distribution
                                  </Box>
                                </HStack>

                                <Divider />

                                {/* Fund Allocation 列表 */}
                                <VStack spacing={4} align="stretch">
                                  <HStack spacing={3} align="flex-start">
                                    <Box 
                                      w={3} 
                                      h={3} 
                                      bg="green.500" 
                                      borderRadius="full" 
                                      mt={2} 
                                      flexShrink={0}
                                    />
                                    <VStack spacing={1} align="stretch" flex={1}>
                                      <Text fontSize="md" fontWeight="semibold" color="gray.800">
                                        60% to liquidity
                                      </Text>
                                    </VStack>
                                  </HStack>

                                  <HStack spacing={3} align="flex-start">
                                    <Box 
                                      w={3} 
                                      h={3} 
                                      bg="blue.500" 
                                      borderRadius="full" 
                                      mt={2} 
                                      flexShrink={0}
                                    />
                                    <VStack spacing={1} align="stretch" flex={1}>
                                      <Text fontSize="md" fontWeight="semibold" color="gray.800">
                                        25% to DAO
                                      </Text>
                                      <Text fontSize="sm" color="gray.600">
                                        Unlock starts on Day 30, every 30 days as one cycle, fully unlocked in 12 batches
                                      </Text>
                                    </VStack>
                                  </HStack>

                                  <HStack spacing={3} align="flex-start">
                                    <Box 
                                      w={3} 
                                      h={3} 
                                      bg="purple.500" 
                                      borderRadius="full" 
                                      mt={2} 
                                      flexShrink={0}
                                    />
                                    <VStack spacing={1} align="stretch" flex={1}>
                                      <Text fontSize="md" fontWeight="semibold" color="gray.800">
                                        10% to creator
                                      </Text>
                                    </VStack>
                                  </HStack>

                                  <HStack spacing={3} align="flex-start">
                                    <Box 
                                      w={3} 
                                      h={3} 
                                      bg="orange.500" 
                                      borderRadius="full" 
                                      mt={2} 
                                      flexShrink={0}
                                    />
                                    <VStack spacing={1} align="stretch" flex={1}>
                                      <Text fontSize="md" fontWeight="semibold" color="gray.800">
                                        5% as protocol fee
                                      </Text>
                                    </VStack>
                                  </HStack>
                                </VStack>
                              </VStack>
                            </CardBody>
                          </Card>
                        </SimpleGrid>




                      </VStack>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </VStack>
            </VStack>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
}; 