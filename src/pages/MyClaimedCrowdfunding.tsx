import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  VStack,
  HStack,
  Spinner,
  Alert,
  AlertIcon,
  Container,
  useBreakpointValue,
  Card,
  CardBody,
  ButtonGroup,
  IconButton,
  useToast,
  Badge,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAppKitAccount } from '@reown/appkit/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { LAUNCHPAD_CrowdFunding_PROGRAM_ID, buildApiUrl } from '../config/constants';

interface ClaimedCrowdfundingData {
  transaction: string;
  slot: number;
  contract_address: string;
  type: number; // 0是claim领取空投 1是support支持众筹
  user: string;
  red_packet: string;
  amount: number;
  timestamp: number;
  created_at: string;
  updated_at: string;
  token_name: string;
  token_symbol: string;
  mint: string;
}

interface ApiResponse {
  data: ClaimedCrowdfundingData[];
  message: string;
  success: boolean;
  total: number;
}

export const MyClaimedCrowdfunding: React.FC = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAppKitAccount();
  const toast = useToast();
  
  // 状态管理
  const [claimedCrowdfunding, setClaimedCrowdfunding] = useState<ClaimedCrowdfundingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  
  // Responsive layout
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Format time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Check if it's SOL
  const isSOL = (item: ClaimedCrowdfundingData) => {
    return item.mint === 'So11111111111111111111111111111111111111112' || !item.mint;
  };

  // Get token icon
  const getTokenIcon = (item: ClaimedCrowdfundingData) => {
    if (isSOL(item)) {
      return '◎';
    }
    return item.token_symbol ? item.token_symbol.charAt(0).toUpperCase() : 'T';
  };

  // Get token name
  const getTokenName = (item: ClaimedCrowdfundingData) => {
    if (isSOL(item)) {
      return 'SOL';
    }
    return item.token_name || item.token_symbol || 'Unknown Token';
  };

  // Get token description
  const getTokenDescription = (item: ClaimedCrowdfundingData) => {
    if (isSOL(item)) {
      return 'Native SOL';
    }
    return item.mint ? `${item.mint.slice(0, 8)}...${item.mint.slice(-8)}` : 'Unknown Address';
  };

  // Format amount
  const formatAmount = (item: ClaimedCrowdfundingData) => {
    if (isSOL(item)) {
      return `${(item.amount / 1e9).toFixed(4)} SOL`;
    }
    return `${(item.amount / 1e9).toFixed(2)} ${item.token_symbol || 'TOKEN'}`;
  };

  // Get crowdfunding type display
  const getCrowdfundingTypeDisplay = (item: ClaimedCrowdfundingData) => {
    switch (item.type) {
      case 1:
        return {
          label: 'Crowdfunding Support',
          bg: 'blue.50',
          color: 'blue.600',
          borderColor: 'blue.200'
        };
      case 0:
        return {
          label: 'Airdrop Claim',
          bg: 'green.50',
          color: 'green.600',
          borderColor: 'green.200'
        };
      default:
        return {
          label: 'Unknown',
          bg: 'gray.50',
          color: 'gray.600',
          borderColor: 'gray.200'
        };
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  // 获取数据
  useEffect(() => {
    const fetchClaimedCrowdfunding = async () => {
      if (!isConnected || !address) {
        setError('Please connect your wallet first');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      
      try {
        // 获取空投记录 (type=0: claim)
        const airdropUrl = buildApiUrl(`/api/one_launch/crowdfunding_program/investor/list/${LAUNCHPAD_CrowdFunding_PROGRAM_ID.toString()}/${address}/0?pageSize=${pageSize}&pageNum=${currentPage}`);
        console.log('🔍 获取空投记录(type=0):', airdropUrl);
        
        const airdropResponse = await fetch(airdropUrl);
        const airdropResult: ApiResponse = await airdropResponse.json();
        console.log('🔍 空投API响应数据(type=0):', airdropResult);
        

        
        // 获取众筹支持记录 (尝试type=1)
        const supportUrl = buildApiUrl(`/api/one_launch/crowdfunding_program/investor/list/${LAUNCHPAD_CrowdFunding_PROGRAM_ID.toString()}/${address}/1?pageSize=${pageSize}&pageNum=${currentPage}`);
        console.log('🔍 获取众筹支持记录:', supportUrl);
        
        const supportResponse = await fetch(supportUrl);
        const supportResult: ApiResponse = await supportResponse.json();
        
        console.log('🔍 众筹支持API响应数据:', supportResult);
        
        // 合并记录并按时间排序
        const airdropRecords = airdropResult.success && Array.isArray(airdropResult.data) ? airdropResult.data : [];
        const supportRecords = supportResult.success && Array.isArray(supportResult.data) ? supportResult.data : [];
        
        const allRecords = [
          ...airdropRecords,
          ...supportRecords
        ].sort((a, b) => b.timestamp - a.timestamp);
        
        console.log('🔍 合并后的数据:', {
          airdropCount: airdropRecords.length,
          supportCount: supportRecords.length,
          totalRecords: allRecords.length,
          allRecords: allRecords
        });
        
        setClaimedCrowdfunding(allRecords);
        // 使用较大的total值作为总页数
        setTotalPages(Math.max(
          airdropResult.total || 0,
          supportResult.total || 0
        ));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchClaimedCrowdfunding();
  }, [address, isConnected, currentPage, pageSize]);

  if (!isConnected) {
    return (
      <Box minH="100vh" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Text fontSize="xl" color="gray.700" textAlign="center">
            请连接钱包以查看众筹记录
          </Text>
          <Button colorScheme="blue" onClick={() => navigate('/')}>
            返回首页
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.100">
      {/* Header */}
      <Box bg="black" color="white" px={4} py={4}>
        <Text fontSize="xl" fontWeight="bold">AIDR</Text>
      </Box>

      {/* Main Content */}
      <Container maxW="1200px" mx="auto" py={8} px={4}>
        <VStack spacing={8} align="stretch">
          {/* Page Title */}
          <Text fontSize={{ base: '2xl', md: '3xl', lg: '4xl' }} fontWeight="bold" textAlign="center" color="gray.900">
            <Text as="span" color="blue.500">My Claimed</Text> Crowdfunding
          </Text>

          {/* Content */}
          {loading ? (
            <Flex justify="center" align="center" minH="300px">
              <VStack spacing={4}>
                <Spinner size="xl" color="blue.500" />
                <Text>Loading your crowdfunding records...</Text>
              </VStack>
            </Flex>
          ) : error ? (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          ) : claimedCrowdfunding.length === 0 ? (
            <Alert status="info">
              <AlertIcon />
              You haven't participated in any crowdfunding activities yet
            </Alert>
          ) : (
            <>
              {/* Desktop Table View */}
              {!isMobile && (
                <Box bg="white" borderRadius="xl" boxShadow="lg" overflow="hidden" w="full">
                  <Box p={6} borderBottom="1px solid" borderColor="gray.200">
                    <Text fontSize="lg" fontWeight="bold" color="gray.800">
                      All Crowdfunding Activities
                    </Text>
                  </Box>
                  <TableContainer>
                    <Table variant="simple">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>Token</Th>
                          <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>Type</Th>
                          <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>Amount</Th>
                          <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>Date</Th>
                          <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>Action</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {claimedCrowdfunding.map((item) => (
                          <Tr key={item.transaction} _hover={{ bg: 'gray.50' }}>
                            <Td py={6}>
                              <HStack spacing={3}>
                                <Box
                                  w="32px"
                                  h="32px"
                                  borderRadius="full"
                                  bg="orange.400"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  color="white"
                                  fontSize="lg"
                                  fontWeight="bold"
                                >
                                  {getTokenIcon(item)}
                                </Box>
                                <VStack spacing={1} align="start">
                                  <Text fontWeight="medium" color="gray.800" fontSize="md">
                                    {getTokenName(item)}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500" fontFamily="mono">
                                    {getTokenDescription(item)}
                                  </Text>
                                </VStack>
                              </HStack>
                            </Td>
                            <Td py={6}>
                              <Badge
                                px={3}
                                py={1}
                                borderRadius="full"
                                fontSize="xs"
                                fontWeight="medium"
                                bg={getCrowdfundingTypeDisplay(item).bg}
                                color={getCrowdfundingTypeDisplay(item).color}
                                border="1px solid"
                                borderColor={getCrowdfundingTypeDisplay(item).borderColor}
                              >
                                {getCrowdfundingTypeDisplay(item).label}
                              </Badge>
                            </Td>
                            <Td py={6}>
                              <Text color="gray.800" fontSize="md" fontWeight="medium">
                                {formatAmount(item)}
                              </Text>
                            </Td>
                            <Td py={6}>
                              <Text color="gray.600" fontSize="sm">
                                {item.created_at ? formatDate(item.created_at) : 'N/A'}
                              </Text>
                            </Td>
                            <Td py={6}>
                              <Button
                                size="sm"
                                bg="blue.500"
                                color="white"
                                _hover={{ bg: "blue.600" }}
                                onClick={() => {
                                  navigator.clipboard.writeText(item.transaction);
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

              {/* Pagination */}
              {totalPages > 1 && (
                <Flex justify="center" align="center" mt={8}>
                  <ButtonGroup spacing={2}>
                    <IconButton
                      aria-label="Previous page"
                      icon={<ChevronLeftIcon />}
                      onClick={() => handlePageChange(currentPage - 1)}
                      isDisabled={currentPage <= 1 || loading}
                      size="sm"
                      bg="gray.600"
                      color="white"
                      _hover={{ bg: "gray.700" }}
                      _disabled={{ bg: "gray.300", color: "gray.500" }}
                    />
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          isDisabled={loading}
                          bg={page === currentPage ? "#4079FF" : "gray.600"}
                          color="white"
                          _hover={{ bg: page === currentPage ? "#3068EE" : "gray.700" }}
                          _disabled={{ bg: "gray.300", color: "gray.500" }}
                          size="sm"
                          minW="40px"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <IconButton
                      aria-label="Next page"
                      icon={<ChevronRightIcon />}
                      onClick={() => handlePageChange(currentPage + 1)}
                      isDisabled={currentPage >= totalPages || loading}
                      size="sm"
                      bg="gray.600"
                      color="white"
                      _hover={{ bg: "gray.700" }}
                      _disabled={{ bg: "gray.300", color: "gray.500" }}
                    />
                  </ButtonGroup>
                </Flex>
              )}
            </>
          )}

          {/* Back to Home Button */}
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