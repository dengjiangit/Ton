import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  SimpleGrid,
  Card,
  CardBody,
  VStack,
  HStack,
  Spinner,
  Alert,
  AlertIcon,
  Container,
  IconButton,
  useToast,
} from '@chakra-ui/react';

import { useNavigate } from 'react-router-dom';
import { useAppKitAccount } from '@reown/appkit/react';
import { LAUNCHPAD_CrowdFunding_PROGRAM_ID, buildApiUrl } from '../config/constants';

interface CrowdfundingProjectData {
  transaction: string;
  contract_address: string;
  creator: string;
  red_packet: string;
  token_name: string;
  token_symbol: string;
  funding_goal: number;
  expiry_time: number;
  total_supply: number;
  created_at: string;
}

interface ApiResponse {
  data: CrowdfundingProjectData[];
  message: string;
  success: boolean;
  total: number;
}

export const MyCreatedCrowdfunding: React.FC = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAppKitAccount();
  const toast = useToast();
  const [projects, setProjects] = useState<CrowdfundingProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  // 实时倒计时更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const formatTokenAmount = (amount: number) => {
    return (amount / 1e9).toFixed(6).replace(/\.?0+$/, '');
  };

  // 格式化代币总量显示 - 将最小单位转换为实际代币数量
  const formatTotalSupply = (totalSupply: number) => {
    const smallestUnits = BigInt(totalSupply);
    const tokens = Number(smallestUnits) / Math.pow(10, 9);
    return tokens.toFixed(9).replace(/\.?0+$/, '');
  };

  // 获取项目状态
  const getProjectStatus = (expiryTime: number) => {
    const timeRemaining = calculateTimeRemaining(expiryTime);
    if (timeRemaining.expired) {
                  return { text: 'Ended', bg: 'gray.500', color: 'white' };
          } else {
            return { text: 'In Progress', bg: 'blue.500', color: 'white' };
          }
  };

  // 获取众筹项目列表
  useEffect(() => {
    const fetchCreatedProjects = async () => {
      if (!isConnected || !address) {
        setError('Please connect your wallet first');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const apiUrl = buildApiUrl(`/api/one_launch/crowdfunding_program/project_leader/list/${LAUNCHPAD_CrowdFunding_PROGRAM_ID.toString()}/${address}?pageSize=10&pageNum=1`);
        
        console.log('🔍 请求众筹项目列表:', {
          apiUrl,
          contractAddress: LAUNCHPAD_CrowdFunding_PROGRAM_ID.toString(),
          creator: address
        });
        
        const response = await fetch(apiUrl);
        console.log('📡 API响应状态:', response.status, response.statusText);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: ApiResponse = await response.json();
        console.log('📋 API响应数据:', result);
        console.log('📊 项目数据详情:', {
          success: result.success,
          message: result.message,
          total: result.total,
          dataLength: result.data?.length || 0,
          data: result.data
        });
        
        if (result.success) {
          console.log('✅ 获取众筹项目成功，数量:', result.data?.length || 0);
          if (result.data && result.data.length > 0) {
            console.log('📝 第一个项目详情:', result.data[0]);
          }
          setProjects(result.data || []);
        } else {
          throw new Error(result.message || 'Failed to fetch data');
        }
      } catch (err) {
        console.error('❌ 获取众筹项目列表失败:', err);
        console.error('错误详情:', {
          message: err instanceof Error ? err.message : '未知错误',
          stack: err instanceof Error ? err.stack : undefined
        });
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchCreatedProjects();
  }, [address, isConnected]);

  // 查看详情
  const handleViewDetails = (project: CrowdfundingProjectData) => {
    const params = new URLSearchParams({
      redPacket: project.red_packet,
      creator: project.creator,
      tokenName: project.token_name,
      tokenSymbol: project.token_symbol,
      fundingGoal: project.funding_goal.toString(),
      totalSupply: project.total_supply.toString(),
      expiryTime: project.expiry_time.toString(),
      createdAt: project.created_at
    });
    
    navigate(`/crowdfunding-details?${params.toString()}`);
  };

  // 众筹项目卡片组件
  const CrowdfundingProjectCard: React.FC<{ project: CrowdfundingProjectData }> = ({ project }) => {
    const status = getProjectStatus(project.expiry_time);
    const timeRemaining = calculateTimeRemaining(project.expiry_time);

    return (
      <Box key={project.transaction} position="relative">
        <Card 
          bg="white"
          borderRadius="xl"
          boxShadow="lg"
          _hover={{ transform: 'translateY(-4px)', boxShadow: '2xl' }}
          transition="all 0.3s ease"
        >
          {/* 状态角标 */}
          <Box
            position="absolute"
            top="-8px"
            right="-8px"
            bg={status.bg}
            color={status.color}
            fontSize="xs"
            fontWeight="bold"
            px={2}
            py={1}
            borderRadius="full"
            zIndex={1}
            boxShadow="md"
          >
            {status.text}
          </Box>
          
          <CardBody p={6}>
            <VStack spacing={4} align="stretch">
              {/* 创建时间 */}
              <Box>
                <Text fontSize="sm" color="gray.600" fontWeight="medium">
                  Created: {formatISODate(project.created_at)}
                </Text>
              </Box>

              {/* 剩余时间 */}
              <Box>
                <Text fontSize="sm" color="gray.600" fontWeight="medium" mb={1}>
                  End Time: {formatDate(project.expiry_time)}
                </Text>
                <HStack spacing={1} align="baseline">
                  <Text fontSize="sm" color="gray.600">Time Remaining:</Text>
                  {timeRemaining.expired ? (
                    <Text fontSize="sm" fontWeight="bold" color="red.500">Ended</Text>
                  ) : (
                    <HStack spacing={1} align="baseline">
                      <Text fontSize="sm" fontWeight="bold" color="orange.500">{timeRemaining.days}</Text>
                      <Text fontSize="xs" color="gray.500">d</Text>
                      <Text fontSize="sm" fontWeight="bold" color="orange.500">{timeRemaining.hours}</Text>
                      <Text fontSize="xs" color="gray.500">h</Text>
                      <Text fontSize="sm" fontWeight="bold" color="orange.500">{timeRemaining.minutes}</Text>
                      <Text fontSize="xs" color="gray.500">m</Text>
                      <Text fontSize="xs" fontWeight="bold" color="orange.400">{timeRemaining.seconds}</Text>
                      <Text fontSize="xs" color="gray.500">s</Text>
                    </HStack>
                  )}
                </HStack>
              </Box>

              {/* 代币合约地址 */}
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>Token Contract Address</Text>
                <HStack spacing={2} align="center">
                  <Text fontSize="xs" color="gray.800" fontFamily="mono" flex={1}>
                    {project.red_packet}
                  </Text>
                  <Button
                    size="sm"
                    variant="ghost"
                    color="gray.500"
                    _hover={{ color: "blue.500" }}
                    onClick={() => {
                      navigator.clipboard.writeText(project.red_packet);
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

              {/* 项目详情 */}
              <VStack spacing={2} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Funding Goal:</Text>
                  <Text fontSize="sm" fontWeight="medium">{formatSolAmount(project.funding_goal)} SOL</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Total Supply:</Text>
                  <Text fontSize="sm" fontWeight="medium">{formatTotalSupply(project.total_supply)} {project.token_symbol}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Token Name:</Text>
                  <Text fontSize="sm" fontWeight="medium">{project.token_name}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Token Symbol:</Text>
                  <Text fontSize="sm" fontWeight="medium">{project.token_symbol}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Type:</Text>
                  <Text fontSize="sm" fontWeight="medium">Crowdfunding</Text>
                </HStack>
              </VStack>

              {/* 查看详情按钮 */}
              <Button
                bg="#4079FF"
                color="white"
                borderRadius="md"
                size="sm"
                _hover={{ bg: '#3668e6' }}
                _active={{ bg: '#2c5acc' }}
                onClick={() => handleViewDetails(project)}
              >
                View Details
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </Box>
    );
  };

  if (!isConnected) {
    return (
      <Box minH="100vh" bgGradient="linear(to-b, #f7fafc, #edf2f7)" pt="80px" px={8}>
        <Container maxW="1200px" mx="auto" py={8}>
                  <Alert status="warning">
          <AlertIcon />
          Please connect your wallet to view your created crowdfunding projects
        </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bgGradient="linear(to-b, #f7fafc, #edf2f7)" pt="80px" px={8}>
      <Container maxW="1200px" mx="auto" py={8}>
        <VStack spacing={8} align="stretch">
          {/* 页面标题 */}
          <Text fontSize={{ base: '2xl', md: '3xl', lg: '4xl' }} fontWeight="bold" textAlign="center" color="gray.900">
            <Text as="span" color="blue.500">My Created</Text> Crowdfunding Projects
          </Text>

          {/* 内容区域 */}
          {loading ? (
            <Flex justify="center" align="center" minH="300px">
                          <VStack spacing={4}>
              <Spinner size="xl" color="blue.500" />
              <Text>Loading your crowdfunding projects...</Text>
            </VStack>
            </Flex>
          ) : error ? (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          ) : projects.length === 0 ? (
            <Alert status="info">
              <AlertIcon />
              You haven't created any crowdfunding projects yet
            </Alert>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {projects.map((project) => (
                <CrowdfundingProjectCard key={project.transaction} project={project} />
              ))}
            </SimpleGrid>
          )}

          {/* 返回首页按钮 */}
          <Flex justify="center" pt={8}>
            <Button
              bg="#4079FF"
              color="white"
              borderRadius="md"
              px={8}
              py={3}
              _hover={{ bg: '#3668e6' }}
              _active={{ bg: '#2c5acc' }}
              onClick={() => navigate('/')}
              leftIcon={<Box as="span" fontSize="lg">🏠</Box>}
            >
              Home
            </Button>
          </Flex>
        </VStack>
      </Container>
    </Box>
  );
}; 