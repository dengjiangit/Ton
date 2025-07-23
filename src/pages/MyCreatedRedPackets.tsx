import React, { useState, useEffect, useMemo } from 'react';
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
  Progress,
  Badge,
  ButtonGroup,
  IconButton,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAppKitAccount } from '@reown/appkit/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { Connection } from '@solana/web3.js';
import { RED_PACKET_PROGRAM_ID, buildApiUrl, RPC_ENDPOINT } from '../config/constants';
import { getTokenInfo, TokenInfo } from '../utils/tokenInfo';

interface RedPacketData {
  creator: string;
  red_packet: string;
  total_amount: number;
  packet_count: number;
  red_packet_type: number;
  expiry_time: number;
  is_sol: boolean;
  red_packet_id: number;
  bump: number;
  mint: string;
  mint_name: string;
  mint_symbol: string;
  claimed_count: number;
  created_at: string;
  with_draw_status?: number; // Withdrawal status: 0-not withdrawn, 1-withdrawn
}

interface ApiResponse {
  data: RedPacketData[];
  message: string;
  success: boolean;
  total: number; // 总页数
}

// 创建全局连接实例
const connection = new Connection(RPC_ENDPOINT);

export const MyCreatedRedPackets: React.FC = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAppKitAccount();
  const [redPackets, setRedPackets] = useState<RedPacketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // 10 items per page
  const [totalPages, setTotalPages] = useState(0);
  const [paginationLoading, setPaginationLoading] = useState(false);

  // Real-time countdown update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 代币信息状态管理
  const [tokenInfoStates, setTokenInfoStates] = useState<{
    [mintAddress: string]: {
      info: TokenInfo | null;
      loading: boolean;
      error: boolean;
    }
  }>({});

  // 获取代币信息的函数 - 只在父组件级别调用
  const fetchTokenInfo = async (mintAddress: string) => {
    // 如果已经有状态（无论是loading、success还是error），都不重复请求
    if (tokenInfoStates[mintAddress]) {
      return;
    }

    console.log('🔍 获取代币信息:', mintAddress.slice(0, 8) + '...');
    
    // 设置loading状态
    setTokenInfoStates(prev => ({
      ...prev,
      [mintAddress]: { info: null, loading: true, error: false }
    }));

    try {
      // 添加延迟，避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const tokenInfo = await getTokenInfo(connection, mintAddress);
      console.log('✅ 代币信息获取成功:', {
        mint: mintAddress.slice(0, 8) + '...',
        decimals: tokenInfo?.decimals
      });
      
      // 更新成功状态
      setTokenInfoStates(prev => ({
        ...prev,
        [mintAddress]: { info: tokenInfo, loading: false, error: !tokenInfo }
      }));
      
    } catch (error) {
      console.error('❌ 代币信息获取失败:', mintAddress.slice(0, 8) + '...', error);
      
      // 更新错误状态
      setTokenInfoStates(prev => ({
        ...prev,
        [mintAddress]: { info: null, loading: false, error: true }
      }));
    }
  };

  // 预加载所有SPL代币信息
  useEffect(() => {
    if (redPackets.length > 0) {
      const splTokens = redPackets
        .filter(packet => !packet.is_sol)
        .map(packet => packet.mint)
        .filter((mint, index, array) => array.indexOf(mint) === index); // 去重

      if (splTokens.length > 0) {
        console.log('🚀 预加载SPL代币信息:', splTokens.length, '个代币');
        
        // 批量预加载，但有延迟避免并发过多
        splTokens.forEach((mint, index) => {
          setTimeout(() => {
            fetchTokenInfo(mint);
          }, index * 100); // 每个请求间隔100ms
        });
      }
    }
  }, [redPackets]);

  // Format timestamp
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  };

  // Format ISO date string
  const formatISODate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  };

  // Calculate remaining time - using real-time
  const calculateTimeRemaining = (expiryTime: number) => {
    const remaining = expiryTime - currentTime;
    
    if (remaining <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    
    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remaining % (60 * 60)) / 60);
    const seconds = remaining % 60;
    
    return { days, hours, minutes, seconds, expired: false };
  };

  // Format token amount with proper decimals
  const formatAmount = (amount: number, isSol: boolean, mintAddress: string) => {
    if (isSol) {
      // SOL always uses 9 decimals
      const decimals = 9;
      const divisor = Math.pow(10, decimals);
      const formattedAmount = (amount / divisor);
      return formattedAmount.toFixed(Math.min(decimals, 6)).replace(/\.?0+$/, '');
    } else {
      // For SPL tokens, get decimals from token info state
      const tokenState = tokenInfoStates[mintAddress];
      const decimals = tokenState?.info?.decimals || 9; // fallback to 9 if not found
      const divisor = Math.pow(10, decimals);
    const formattedAmount = (amount / divisor);
      const result = formattedAmount.toFixed(Math.min(decimals, 6)).replace(/\.?0+$/, '');
      
      // 简化日志，只在使用回退精度时提醒
      if (!tokenState?.info && decimals === 9) {
        console.log('⚠️ SPL代币使用回退精度:', mintAddress.slice(0, 8) + '...');
      }
      
      return result;
    }
  };

  // Calculate claim progress
  const calculateProgress = (claimed: number, total: number) => {
    if (total === 0) return 0;
    // Ensure claimed doesn't exceed total
    const safeClaimed = Math.min(claimed, total);
    return Math.round((safeClaimed / total) * 100);
  };

  // Get status badge
  const getStatusBadge = (claimed: number, total: number) => {
    // Data anomaly check
    if (claimed > total) {
      return <Badge colorScheme="red">Data Error</Badge>;
    }
    if (claimed === 0) {
      return <Badge colorScheme="blue">Unclaimed</Badge>;
    } else if (claimed < total) {
      return <Badge colorScheme="yellow">Partially Claimed</Badge>;
    } else {
      return <Badge colorScheme="green">Fully Claimed</Badge>;
    }
  };

  // Get safe claimed count (prevent exceeding total count)
  const getSafeClaimedCount = (claimed: number, total: number) => {
    return Math.min(claimed || 0, total);
  };

  // Calculate remaining count (ensure not negative)
  const getRemainingCount = (claimed: number, total: number) => {
    const safeClaimed = getSafeClaimedCount(claimed, total);
    return Math.max(0, total - safeClaimed);
  };

  // Get red packet status corner badge
  const getStatusCornerBadge = (redPacket: RedPacketData) => {
    const timeRemaining = calculateTimeRemaining(redPacket.expiry_time);
    const isExpired = timeRemaining.expired;
    const hasRemainingTokens = getRemainingCount(redPacket.claimed_count || 0, redPacket.packet_count) > 0;
    const isWithdrawn = (redPacket.with_draw_status || 0) === 1;

    if (isExpired) {
      // Red packet has expired, display based on with_draw_status
              if (hasRemainingTokens) {
          // When there are remaining tokens, display based on withdrawal status
          if (isWithdrawn) {
            return {
              text: 'Withdrawn',
              bg: 'gray.500',
              color: 'white'
            };
          } else {
            return {
              text: 'Withdrawable',
              bg: 'orange.500',
              color: 'white'
            };
          }
        } else {
          // No remaining tokens, all have been claimed
          return {
            text: 'Completed',
            bg: 'green.500',
            color: 'white'
          };
        }
      } else {
        // Red packet not expired, still ongoing
        return {
          text: 'Active',
          bg: 'blue.500',
          color: 'white'
        };
      }
  };

  // Get created red packet list
  useEffect(() => {
    const fetchCreatedRedPackets = async (page: number = 1) => {
      if (!isConnected || !address) {
        setError('Please connect your wallet first');
        setLoading(false);
        return;
      }

      try {
        // If it's a page change operation, use pagination loading state, otherwise use main loading state
        if (page === 1) {
          setLoading(true);
        } else {
          setPaginationLoading(true);
        }
        setError(null);
        // Build API URL with pagination parameters
        const apiUrl = buildApiUrl(`/api/redpacket/get_created_list/${RED_PACKET_PROGRAM_ID.toString()}/${address}?pageSize=${pageSize}&pageNum=${page}`);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: ApiResponse = await response.json();
        
        if (result.success) {
          // console.log('🎯 My Create Page - API response success (page ' + page + '):', result);
          // console.log('📦 Red packet data details:', result.data);
          
          // 确保 result.data 是数组，如果为空或null则使用空数组
          const rawData = result.data || [];
          
          // 【去重处理】基于 red_packet_id 去重，解决后端JOIN导致的重复问题
          const uniqueRedPackets: RedPacketData[] = [];
          const seenIds = new Set<number>();
          
          rawData.forEach((redPacket: RedPacketData) => {
            if (!seenIds.has(redPacket.red_packet_id)) {
              seenIds.add(redPacket.red_packet_id);
              uniqueRedPackets.push(redPacket);
            }
          });
          
          // console.log('📊 去重前数据量:', rawData.length, '去重后数据量:', uniqueRedPackets.length);
          
          // Detailed logging of each red packet's with_draw_status
          uniqueRedPackets.forEach((redPacket, index) => {
            const timeRemaining = calculateTimeRemaining(redPacket.expiry_time);
            const isExpired = timeRemaining.expired;
            const hasRemainingTokens = getRemainingCount(redPacket.claimed_count || 0, redPacket.packet_count) > 0;
            
            // console.log(`🔍 Red Packet ${index + 1} (ID: ${redPacket.red_packet_id}):`, {
            //   red_packet_address: redPacket.red_packet,
            //   with_draw_status: redPacket.with_draw_status,
            //   claimed_count: redPacket.claimed_count,
            //   packet_count: redPacket.packet_count,
            //   isExpired,
            //   hasRemainingTokens,
            //   expiry_time: redPacket.expiry_time,
            //   current_time: Math.floor(Date.now() / 1000),
            //   badge_should_show: isExpired ? (hasRemainingTokens ? (redPacket.with_draw_status === 1 ? 'Withdrawn' : 'Withdrawable') : 'Completed') : 'Active'
            // });
          });
          
          // 打印获取到的红包数据信息
          console.log('📋 获取到的红包列表:', {
            totalCount: uniqueRedPackets.length,
            page,
            redPackets: uniqueRedPackets.map(packet => ({
              id: packet.red_packet_id,
              isSol: packet.is_sol,
              mint: packet.mint,
              symbol: packet.mint_symbol,
              totalAmount: packet.total_amount,
              packetCount: packet.packet_count,
              claimedCount: packet.claimed_count
            }))
          });
          
          setRedPackets(uniqueRedPackets);
          setTotalPages(result.total || 0);
          setCurrentPage(page);
        } else {
          throw new Error(result.message || 'Failed to get data');
        }
      } catch (err) {
        // console.error('Failed to get created red packet list:', err);
        setError(err instanceof Error ? err.message : 'Failed to get data');
      } finally {
        setLoading(false);
        setPaginationLoading(false);
      }
    };

    fetchCreatedRedPackets(currentPage);
  }, [address, isConnected, currentPage, pageSize]);

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  // View details
  const handleViewDetails = (redPacket: RedPacketData) => {
    const params = new URLSearchParams({
      id: redPacket.red_packet_id.toString(),
      creator: redPacket.creator,
      mode: 'redpacket',
      redPacketType: redPacket.red_packet_type.toString(),
      isSol: redPacket.is_sol.toString(),
      totalAmount: redPacket.total_amount.toString(),
      packetCount: redPacket.packet_count.toString(),
      claimedCount: (redPacket.claimed_count || 0).toString(),
      expiryTime: redPacket.expiry_time.toString(),
      tokenAddress: redPacket.mint,
      tokenName: redPacket.mint_name,
      tokenSymbol: redPacket.mint_symbol,
      redPacketAddress: redPacket.red_packet,
      createdAt: redPacket.created_at,
      withDrawStatus: (redPacket.with_draw_status || 0).toString()
    });
    
    navigate(`/redpacket-details?${params.toString()}`);
  };

  // Pagination component
  const PaginationComponent = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;
      
      if (totalPages <= maxVisiblePages) {
        // If total pages is less than or equal to max visible pages, show all page numbers
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Otherwise show page numbers around current page
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, start + maxVisiblePages - 1);
        
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
      }
      
      return pages;
    };

    return (
      <Flex justify="center" align="center" mt={8}>
        <ButtonGroup spacing={2}>
          {/* Previous page button */}
          <IconButton
            aria-label="Previous page"
            icon={<ChevronLeftIcon />}
            onClick={() => handlePageChange(currentPage - 1)}
            isDisabled={currentPage <= 1 || paginationLoading}
            size="sm"
            bg="gray.600"
            color="white"
            _hover={{ bg: "gray.700" }}
            _disabled={{ bg: "gray.300", color: "gray.500" }}
          />
          
          {/* Page number buttons */}
          {getPageNumbers().map((page) => (
            <Button
              key={page}
              onClick={() => handlePageChange(page)}
              isDisabled={paginationLoading}
              bg={page === currentPage ? "#4079FF" : "gray.600"}
              color="white"
              _hover={{ 
                bg: page === currentPage ? "#3068EE" : "gray.700" 
              }}
              _disabled={{ bg: "gray.300", color: "gray.500" }}
              size="sm"
              minW="40px"
            >
              {page}
            </Button>
          ))}
          
          {/* Next page button */}
          <IconButton
            aria-label="Next page"
            icon={<ChevronRightIcon />}
            onClick={() => handlePageChange(currentPage + 1)}
            isDisabled={currentPage >= totalPages || paginationLoading}
            size="sm"
            bg="gray.600"
            color="white"
            _hover={{ bg: "gray.700" }}
            _disabled={{ bg: "gray.300", color: "gray.500" }}
          />
        </ButtonGroup>
        
        {/* Pagination info */}
        <Text ml={4} fontSize="sm" color="gray.600">
          Page {currentPage} of {totalPages}
        </Text>
      </Flex>
    );
  };

  // 创建红包卡片组件
  const RedPacketCard: React.FC<{ redPacket: RedPacketData }> = ({ redPacket }) => {
    // 获取代币状态
    const tokenState = tokenInfoStates[redPacket.mint];
    
    // 判断是否正在加载
    const isLoadingAmount = !redPacket.is_sol && (!tokenState || tokenState.loading);
    
    // 使用 useMemo 缓存格式化金额的计算结果
    const formattedAmount = useMemo(() => {
      if (isLoadingAmount) return '';
      return formatAmount(redPacket.total_amount, redPacket.is_sol, redPacket.mint);
    }, [
      redPacket.total_amount, 
      redPacket.is_sol, 
      redPacket.mint, 
      isLoadingAmount,
      tokenState?.info?.decimals // 只在精度变化时重新计算
    ]);

                const cornerBadge = getStatusCornerBadge(redPacket);

                return (
                <Box key={redPacket.red_packet_id} position="relative">
                  <Card 
                    bg="white"
                    borderRadius="xl"
                    boxShadow="lg"
                    _hover={{ 
                      transform: 'translateY(-4px)',
                      boxShadow: '2xl'
                    }}
                    transition="all 0.3s ease"
                  >
                    {/* 右上角角标 */}
                    <Box
                      position="absolute"
                      top="-8px"
                      right="-8px"
                      bg={cornerBadge.bg}
                      color={cornerBadge.color}
                      fontSize="xs"
                      fontWeight="bold"
                      px={2}
                      py={1}
                      borderRadius="full"
                      zIndex={1}
                      boxShadow="md"
                    >
                      {cornerBadge.text}
                    </Box>
                    <CardBody p={6}>
                    <VStack spacing={4} align="stretch">
                                            {/* Creation time */}
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium">
                          Created at: {formatISODate(redPacket.created_at)}
                        </Text>
                      </Box>

                      {/* Expiry time countdown */}
                      <Box>
                        <Text fontSize="sm" color="gray.600" fontWeight="medium" mb={1}>
                          Expiry time: {formatDate(redPacket.expiry_time)}
                        </Text>
                        {(() => {
                          const timeRemaining = calculateTimeRemaining(redPacket.expiry_time);
                          return (
                            <HStack spacing={1} align="baseline">
                              <Text fontSize="sm" color="gray.600">Time remaining:</Text>
                              {timeRemaining.expired ? (
                                <Text fontSize="sm" fontWeight="bold" color="red.500">
                                  Expired
                                </Text>
                              ) : (
                                <HStack spacing={1} align="baseline">
                                  <Text fontSize="sm" fontWeight="bold" color="orange.500">
                                    {timeRemaining.days}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">d</Text>
                                  <Text fontSize="sm" fontWeight="bold" color="orange.500">
                                    {timeRemaining.hours}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">h</Text>
                                  <Text fontSize="sm" fontWeight="bold" color="orange.500">
                                    {timeRemaining.minutes}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">m</Text>
                                  <Text fontSize="xs" fontWeight="bold" color="orange.400">
                                    {timeRemaining.seconds}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">s</Text>
                                </HStack>
                              )}
                            </HStack>
                          );
                        })()}
                      </Box>

                      {/* Token information */}
                      <Box>
                        <Text fontSize="sm" color="gray.600" mb={1}>
                          The Token Contract Address
                        </Text>
                        <Text fontSize="xs" color="gray.800" fontFamily="mono">
                          {redPacket.mint === '11111111111111111111111111111111' 
                            ? 'SOL (Native Token)' 
                            : `${redPacket.mint.slice(0, 8)}...${redPacket.mint.slice(-8)}`
                          }
                        </Text>
                      </Box>

                      {/* Red packet details */}
                      <VStack spacing={2} align="stretch">
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="gray.600">Amount:</Text>
                  {isLoadingAmount ? (
                    <HStack spacing={2}>
                      <Spinner size="sm" color="blue.500" />
                      <Text fontSize="sm" color="blue.500">
                        Loading...
                          </Text>
                    </HStack>
                  ) : (
                    <Text fontSize="sm" fontWeight="medium">
                      {tokenState?.error ? (
                        // 如果获取代币信息失败，显示回退金额
                        `${formatAmount(redPacket.total_amount, redPacket.is_sol, redPacket.mint)} ${redPacket.mint_symbol}`
                      ) : (
                        `${formattedAmount} ${redPacket.mint_symbol}`
                      )}
                    </Text>
                  )}
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="gray.600">Recipients:</Text>
                          <Text fontSize="sm" fontWeight="medium">
                            {redPacket.packet_count}
                          </Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="gray.600">Type:</Text>
                          <Text fontSize="sm" fontWeight="medium">
                            {redPacket.red_packet_type === 0 ? 'Fixed' : 
                             redPacket.red_packet_type === 1 ? 'Random' : 'Whitelist'}
                          </Text>
                        </HStack>
                        
                        {/* Claim progress */}
                        <VStack spacing={2} align="stretch">
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.600">Claim Progress:</Text>
                            <HStack spacing={2}>
                              <Text fontSize="sm" fontWeight="medium">
                                {getSafeClaimedCount(redPacket.claimed_count, redPacket.packet_count)}/{redPacket.packet_count}
                              </Text>
                              {getStatusBadge(redPacket.claimed_count || 0, redPacket.packet_count)}
                            </HStack>
                          </HStack>
                          <Progress
                            value={calculateProgress(redPacket.claimed_count || 0, redPacket.packet_count)}
                            colorScheme={redPacket.claimed_count > redPacket.packet_count ? "red" : "green"}
                            size="sm"
                            borderRadius="full"
                          />
                          <Text fontSize="xs" color="gray.500" textAlign="center">
                            {calculateProgress(redPacket.claimed_count || 0, redPacket.packet_count)}% Claimed
                          </Text>
                          {/* Data anomaly warning */}
                          {(redPacket.claimed_count || 0) > redPacket.packet_count && (
                            <Text fontSize="xs" color="red.500" textAlign="center" fontWeight="medium">
                              ⚠️ Data anomaly detected, please contact technical support
                            </Text>
                          )}
                        </VStack>
                        
                        {/* Remaining count */}
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="gray.600">Remaining:</Text>
                          <Text 
                            fontSize="sm" 
                            fontWeight="medium" 
                            color={getRemainingCount(redPacket.claimed_count || 0, redPacket.packet_count) > 0 ? "green.500" : "gray.500"}
                          >
                            {getRemainingCount(redPacket.claimed_count || 0, redPacket.packet_count)}
                          </Text>
                        </HStack>
                      </VStack>

                      {/* View details button */}
                      <Button
                        bg="#4079FF"
                        color="white"
                        borderRadius="md"
                        size="sm"
                        _hover={{ bg: '#3668e6' }}
                        _active={{ bg: '#2c5acc' }}
                        onClick={() => handleViewDetails(redPacket)}
                      >
                        View details
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              </Box>
                );
  };

  if (!isConnected) {
    return (
      <Box 
        minH="100vh" 
        bgGradient="linear(to-b, #f7fafc, #edf2f7)"
        pt="80px"
        px={8}
      >
        <Container maxW="1200px" mx="auto" py={8}>
          <Alert status="warning">
            <AlertIcon />
            Please connect your wallet to view your created red packets
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box 
      minH="100vh" 
      bgGradient="linear(to-b, #f7fafc, #edf2f7)"
      pt="80px"
      px={8}
    >
      <Container maxW="1200px" mx="auto" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Page title */}
          <Text 
            fontSize={{ base: '2xl', md: '3xl', lg: '4xl' }} 
            fontWeight="bold" 
            textAlign="center"
            color="gray.900"
          >
            The <Text as="span" color="red.500">Red Packet</Text> I've Created
          </Text>

          {/* Content area */}
          {loading ? (
            <Flex justify="center" align="center" minH="300px">
              <VStack spacing={4}>
                <Spinner size="xl" color="blue.500" />
                <Text>Loading your red packets...</Text>
              </VStack>
            </Flex>
          ) : error ? (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          ) : redPackets.length === 0 ? (
            <Alert status="info">
              <AlertIcon />
              You haven't created any red packets yet
            </Alert>
          ) : (
            <SimpleGrid 
              columns={{ base: 1, md: 2, lg: 3 }} 
              spacing={6}
            >
              {redPackets.map((redPacket) => (
                <RedPacketCard key={redPacket.red_packet_id} redPacket={redPacket} />
              ))}
            </SimpleGrid>
                      )}

          {/* Pagination component */}
          <PaginationComponent />

          {/* Back to home button */}
          <Flex justify="center" pt={8}>
            <Button
              bg="#4079FF"
              color="white"
              borderRadius="md"
              px={8}
              py={3}
              _hover={{ 
                bg: '#3668e6'
              }}
              _active={{ 
                bg: '#2c5acc'
              }}
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          </Flex>
        </VStack>
      </Container>
    </Box>
  );
}; 