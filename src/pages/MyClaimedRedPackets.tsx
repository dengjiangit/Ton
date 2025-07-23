import React, { useState, useEffect, useMemo, Fragment } from 'react';
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
  Icon,
  useBreakpointValue,
  Card,
  CardBody,
  SimpleGrid,
  ButtonGroup,
  IconButton,
  useToast,
  Checkbox,
  CheckboxGroup,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverCloseButton,
  PopoverFooter,
  useDisclosure,
  Badge,
  RadioGroup,
  Radio,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAppKitAccount } from '@reown/appkit/react';
import { ChevronLeftIcon, ChevronRightIcon, CopyIcon, SettingsIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { RED_PACKET_PROGRAM_ID, buildApiUrl, RPC_ENDPOINT } from '../config/constants';
import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';

// Token information interface
interface TokenInfo {
  decimals: number;
  supply: bigint;
  mintAuthority: PublicKey | null;
  freezeAuthority: PublicKey | null;
}

interface ClaimedRedPacketData {
  id: number;
  claimer: string;
  red_packet: string;
  amount: number;
  red_packet_id: number;
  created_at: string;
  updated_at: string;
  transaction?: string;         // Transaction hash field
  block_time?: string;          // Block time
  // Token fields returned by API
  mint?: string;                // Token contract address
  mint_name?: string;           // Token name
  mint_symbol?: string;         // Token symbol
  mint_type?: string;           // Token type
  red_packet_type?: string;     // Red packet type field for filtering
}

interface ApiResponse {
  data: ClaimedRedPacketData[];
  message: string;
  success: boolean;
  total: number; // Total pages
  totalCount?: number; // Total record count (if available)
}

// 创建全局连接实例
const connection = new Connection(RPC_ENDPOINT);

// 红包类型映射常量
// 后端API使用数字类型：0=随机红包, 1=固定红包, 2=空投红包
const RED_PACKET_TYPE_MAPPING = {
  FRONTEND_TO_BACKEND: {
    'random': '0',
    'fixed': '1',
    'airdrop': '2'
  } as Record<string, string>,
  BACKEND_TO_FRONTEND: {
    '0': 'random',
    '1': 'fixed',
    '2': 'airdrop'
  } as Record<string, string>
};

export const MyClaimedRedPackets: React.FC = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAppKitAccount();
  const toast = useToast();
  // 状态管理
  const [claimedRedPackets, setClaimedRedPackets] = useState<ClaimedRedPacketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  // 过滤器状态
  const FILTER_OPTIONS = [
    { value: 'all', label: 'All Types' },
    { value: 'random', label: 'Random Red Packet' },
    { value: 'fixed', label: 'Fixed Red Packet' },
    { value: 'airdrop', label: 'AirDrop' },
  ];
  const [filterType, setFilterType] = useState<string[]>(['all']);
  const [tempFilterType, setTempFilterType] = useState<string[]>(['all']);
  
  // 代币信息状态管理
  const [tokenInfoStates, setTokenInfoStates] = useState<{
    [mintAddress: string]: {
      info: TokenInfo | null;
      loading: boolean;
      error: boolean;
    }
  }>({});
  
  // Responsive layout: mobile uses cards, desktop uses table
  const isMobile = useBreakpointValue({ base: true, md: false });

  // 获取代币信息的函数
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
      
      const mintPublicKey = new PublicKey(mintAddress);
      const tokenInfo = await getMint(connection, mintPublicKey);
      
      console.log('✅ 代币信息获取成功:', {
        mint: mintAddress.slice(0, 8) + '...',
        decimals: tokenInfo.decimals
      });
      
      // 更新成功状态
      setTokenInfoStates(prev => ({
        ...prev,
        [mintAddress]: { info: tokenInfo, loading: false, error: false }
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

  // 预加载代币信息（只针对当前页）
  useEffect(() => {
    if (claimedRedPackets.length > 0) {
      const splTokens = claimedRedPackets
        .filter((packet: ClaimedRedPacketData) => !isSOL(packet) && packet.mint)
        .map((packet: ClaimedRedPacketData) => packet.mint!)
        .filter((mint: string, index: number, array: string[]) => array.indexOf(mint) === index);
      if (splTokens.length > 0) {
        splTokens.forEach((mint: string, index: number) => {
          setTimeout(() => {
            fetchTokenInfo(mint);
          }, index * 100);
        });
      }
    }
  }, [claimedRedPackets]);

  // Format time - Display MM/DD/YYYY HH:MM AM/PM format according to UI design
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
  const isSOL = (redPacket: ClaimedRedPacketData) => {
    return redPacket.mint_type === 'SOL' || 
           redPacket.mint === '11111111111111111111111111111111' || 
           !redPacket.mint || 
           redPacket.mint.trim() === '';
  };

  // Get token icon - Return corresponding icon based on token type
  const getTokenIcon = (redPacket: ClaimedRedPacketData) => {
    if (isSOL(redPacket)) {
    return '◎'; // SOL symbol
    }
    // Other tokens use generic icon
    return '🪙';
  };

  // Get token name
  const getTokenName = (redPacket: ClaimedRedPacketData) => {
    if (isSOL(redPacket)) {
      return 'SOL';
    }
    return redPacket.mint_symbol || redPacket.mint_name || 'Unknown Token';
  };

  // Get token type description
  const getTokenDescription = (redPacket: ClaimedRedPacketData) => {
    if (isSOL(redPacket)) {
      return 'Native SOL';
    }
    if (redPacket.mint) {
      return `${redPacket.mint.slice(0, 4)}...${redPacket.mint.slice(-4)}`;
    }
    return 'SPL Token';
  };

  // Format token amount with proper decimals
  const formatAmount = (redPacket: ClaimedRedPacketData) => {
    if (isSOL(redPacket)) {
      // SOL always uses 9 decimals
      const decimals = 9;
      const divisor = Math.pow(10, decimals);
      const amount = (redPacket.amount || 0) / divisor;
      return amount.toFixed(Math.min(decimals, 6)).replace(/\.?0+$/, '');
    } else {
      // For SPL tokens, get decimals from token info state
      const tokenState = redPacket.mint ? tokenInfoStates[redPacket.mint] : null;
      const decimals = tokenState?.info?.decimals || 6; // fallback to 6 if not found
      const divisor = Math.pow(10, decimals);
      const amount = (redPacket.amount || 0) / divisor;
      
      // Choose display precision based on amount size
      if (amount >= 1) {
        return amount.toFixed(Math.min(decimals, 6)).replace(/\.?0+$/, '');
      } else {
        return amount.toFixed(Math.min(decimals, 9)).replace(/\.?0+$/, '');
      }
    }
  };

  // Get transaction hash
  const getTransactionHash = (redPacket: ClaimedRedPacketData): string | null => {
    return redPacket.transaction || null;
  };

  // Get formatted red packet type display
  const getRedPacketTypeDisplay = (redPacket: ClaimedRedPacketData) => {
    const rawType = redPacket.red_packet_type || '';
    const friendlyType = RED_PACKET_TYPE_MAPPING.BACKEND_TO_FRONTEND[rawType] || rawType;
    
    // Return with appropriate styling and badge
    switch (friendlyType) {
      case 'random':
        return {
          label: 'Random Red Packet',
          colorScheme: 'orange',
          bg: 'orange.50',
          color: 'orange.600',
          borderColor: 'orange.200'
        };
      case 'fixed':
        return {
          label: 'Fixed Red Packet',
          colorScheme: 'red',
          bg: 'red.50',
          color: 'red.600',
          borderColor: 'red.200'
        };
      case 'airdrop':
        return {
          label: 'AirDrop',
          colorScheme: 'blue',
          bg: 'blue.50',
          color: 'blue.600',
          borderColor: 'blue.200'
        };
      default:
        return {
          label: 'Unknown',
          colorScheme: 'gray',
          bg: 'gray.50',
          color: 'gray.600',
          borderColor: 'gray.200'
        };
    }
  };

  // Get dynamic title based on filter selection
  const getDynamicTitle = () => {
    if (filterType.length === 0 || filterType.length === 3) {
      return "All Red Packets & AirDrops";
    } else if (filterType.length === 1) {
      if (filterType.includes('random')) return "Random Red Packets";
      if (filterType.includes('fixed')) return "Fixed Red Packets";
      if (filterType.includes('airdrop')) return "AirDrops";
    } else if (filterType.length === 2) {
      if (filterType.includes('random') && filterType.includes('fixed')) {
        return "All Red Packets";
      } else if (filterType.includes('random') && filterType.includes('airdrop')) {
        return "Random Red Packets & AirDrops";
      } else if (filterType.includes('fixed') && filterType.includes('airdrop')) {
        return "Fixed Red Packets & AirDrops";
      }
    }
    return "All Red Packets & AirDrops";
  };

  // Apply client-side filtering from all data
  const filteredRedPackets = useMemo(() => {
    // 直接返回claimedRedPackets，不做前端分页
    if (!claimedRedPackets || claimedRedPackets.length === 0) {
      return claimedRedPackets;
    }
    if (filterType.length === 0 || filterType.length === 3) {
      return claimedRedPackets;
    }
    if (filterType.length === 1 && filterType[0] === 'all') {
      return claimedRedPackets;
    }
    return claimedRedPackets.filter((item: ClaimedRedPacketData) => {
      const itemType = String(item.red_packet_type);
      const mappedFilterTypes = filterType.map(type => String(RED_PACKET_TYPE_MAPPING.FRONTEND_TO_BACKEND[type] || type));
      return mappedFilterTypes.includes(itemType);
    });
  }, [claimedRedPackets, filterType]);
  
  // 后端分页，直接用filteredRedPackets
  const paginatedRedPackets = filteredRedPackets;
  
  // Calculate total pages based on filtered data
  const totalPagesMemo = useMemo(() => {
    if (!filteredRedPackets || filteredRedPackets.length === 0) {
      return 0;
    }
    return Math.ceil(filteredRedPackets.length / pageSize);
  }, [filteredRedPackets, pageSize]);
  
  // Log filtering and pagination results
  useEffect(() => {
    console.log('🔍 Filtering and pagination results:', {
      totalItems: claimedRedPackets?.length || 0,
      filteredItems: filteredRedPackets?.length || 0,
      paginatedItems: paginatedRedPackets?.length || 0,
      currentPage,
      totalPages: totalPagesMemo,
      filterType,
      mappedFilterTypes: filterType.map(type => RED_PACKET_TYPE_MAPPING.FRONTEND_TO_BACKEND[type] || type)
    });
  }, [claimedRedPackets, filteredRedPackets, paginatedRedPackets, currentPage, totalPagesMemo, filterType]);

  // Handle filter confirmation
  const handleFilterConfirm = () => {
    // 如果没选，默认all
    if (!tempFilterType || tempFilterType.length === 0) {
      setFilterType(['all']);
    } else {
      setFilterType(tempFilterType);
    }
    setCurrentPage(1);
    onClose();
  };

  // Handle filter cancel
  const handleFilterCancel = () => {
    setTempFilterType(filterType);
    onClose(); // Close the popover
  };

  // Popover state
  const { isOpen, onOpen, onClose } = useDisclosure();

  // 获取当前页数据（后端分页+过滤）
  useEffect(() => {
    const fetchClaimedRedPackets = async () => {
      if (!isConnected || !address) {
        setError('Please connect your wallet first');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      // 过滤参数映射
      let filterParamValue = '-1';
      if (filterType.length === 1 && filterType[0] === 'all') {
        filterParamValue = '-1';
      } else if (filterType.length > 0) {
        filterParamValue = filterType.map(type => RED_PACKET_TYPE_MAPPING.FRONTEND_TO_BACKEND[type] || type).join(',');
      }
      const apiUrl = buildApiUrl(`/api/redpacket/get_claimed_list/${RED_PACKET_PROGRAM_ID.toString()}/${address}/${filterParamValue}?pageSize=${pageSize}&pageNum=${currentPage}`);
      console.log('分页请求apiUrl:', apiUrl);
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result: ApiResponse = await response.json();
        console.log('分页返回result.data:', result.data);
        if (result.success) {
          const dataArray = Array.isArray(result.data) ? result.data : [];
          setClaimedRedPackets(dataArray);
          setTotalPages(result.total || 0);
        } else {
          throw new Error(result.message || 'Failed to fetch data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };
    fetchClaimedRedPackets();
  }, [address, isConnected, currentPage, pageSize, filterType]);

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  // View red packet details
  const handleViewRedPacket = (redPacket: ClaimedRedPacketData) => {
    // Build red packet details link using red packet ID and contract address
    const shareUrl = `${window.location.origin}/claim?id=${redPacket.red_packet_id}&redPacketAddress=${redPacket.red_packet}`;
    window.open(shareUrl, '_blank');
  };

  // 创建金额显示组件
  const AmountDisplay: React.FC<{ 
    redPacket: ClaimedRedPacketData; 
    fontSize?: string;
    fontWeight?: string;
  }> = ({ redPacket, fontSize = "md", fontWeight = "medium" }) => {
    // 检查是否需要加载代币信息
    const needsTokenInfo = !isSOL(redPacket) && redPacket.mint;
    const tokenState = needsTokenInfo ? tokenInfoStates[redPacket.mint!] : null;
    const isLoading = needsTokenInfo && (!tokenState || tokenState.loading);
    
    // 使用 useMemo 缓存格式化金额的计算结果
    const formattedAmount = useMemo(() => {
      if (isLoading) return '';
      return formatAmount(redPacket);
    }, [
      redPacket.amount,
      redPacket.mint,
      isLoading,
      tokenState?.info?.decimals
    ]);

    if (isLoading) {
      return (
        <HStack spacing={2}>
          <Spinner size="sm" color="blue.500" />
          <Text fontSize="sm" color="blue.500">
            Loading...
          </Text>
        </HStack>
      );
    }

    return (
      <Text fontWeight={fontWeight} color="gray.800" fontSize={fontSize}>
        {formattedAmount}
      </Text>
    );
  };

  // Filter button and popover content
  const FilterPopoverComponent = () => (
    <Popover
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      placement="bottom-start"
      closeOnBlur={false}
    >
      <PopoverTrigger>
        <Button
          leftIcon={<SettingsIcon />}
          rightIcon={<ChevronDownIcon />}
          size="sm"
          bg="blue.500"
          color="white"
          _hover={{ bg: "blue.600" }}
          borderRadius="md"
        >
          Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        bg="white" 
        border="1px solid" 
        borderColor="gray.200" 
        boxShadow="xl"
        borderRadius="lg"
        w="300px"
      >
        <PopoverHeader 
          pt={4} 
          pb={2}
          fontSize="md" 
          fontWeight="bold" 
          color="gray.800"
          borderBottom="1px solid"
          borderColor="gray.200"
        >
          Red Packet Type
        </PopoverHeader>
        <PopoverCloseButton />
        <PopoverBody p={4}>
          <RadioGroup
            value={tempFilterType[0]}
            onChange={(value) => setTempFilterType([value])}
          >
            <VStack align="start" spacing={3}>
              <Radio value="all">
                <Text fontSize="sm" color="gray.700">All Types</Text>
              </Radio>
              <Box pl={6} w="full">
                <VStack align="start" spacing={2}>
                  <Radio value="random">
                    <Text fontSize="sm" color="gray.700">Random Red Packet</Text>
                  </Radio>
                  <Radio value="fixed">
                    <Text fontSize="sm" color="gray.700">Fixed Red Packet</Text>
                  </Radio>
                  <Radio value="airdrop">
                    <Text fontSize="sm" color="gray.700">AirDrop</Text>
                  </Radio>
                </VStack>
              </Box>
            </VStack>
          </RadioGroup>
        </PopoverBody>
        <PopoverFooter 
          p={4}
          pt={2}
          borderTop="1px solid"
          borderColor="gray.200"
        >
          <HStack spacing={3} justify="flex-end">
            <Button
              size="sm"
              bg="gray.500"
              color="white"
              _hover={{ bg: "gray.600" }}
              onClick={handleFilterCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              bg="blue.500"
              color="white"
              _hover={{ bg: "blue.600" }}
              onClick={handleFilterConfirm}
            >
              Confirm
            </Button>
          </HStack>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  );

  // Mobile card component
  const MobileCardView = () => (
    <Box
      bg="white"
      borderRadius="xl"
      boxShadow="lg"
      overflow="hidden"
      w="full"
    >
      <Box p={4} borderBottom="1px solid" borderColor="gray.200">
        <HStack spacing={4} align="center">
          <FilterPopoverComponent />
          <Text fontSize="lg" fontWeight="bold" color="gray.800">
            {getDynamicTitle()}
          </Text>
        </HStack>
      </Box>
      <VStack spacing={4} w="full" p={4}>
        {paginatedRedPackets && Array.isArray(paginatedRedPackets) && paginatedRedPackets.length > 0 && paginatedRedPackets.map((redPacket) => (
          <Card 
            key={redPacket.id}
            bg="gray.50"
            borderRadius="lg"
            boxShadow="sm"
            w="full"
            _hover={{ 
              transform: 'translateY(-2px)',
              boxShadow: 'md'
            }}
            transition="all 0.3s ease"
          >
            <CardBody p={4}>
              <VStack spacing={4} align="stretch">
                {/* Top: Token information */}
                <HStack spacing={3}>
                  <Box
                    w="40px"
                    h="40px"
                    borderRadius="full"
                    bg="orange.400"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    color="white"
                    fontSize="xl"
                    fontWeight="bold"
                  >
                    {getTokenIcon(redPacket)}
                  </Box>
                  <VStack spacing={1} align="start" flex={1}>
                    <HStack spacing={2} align="center">
                      <Text fontWeight="bold" color="gray.800" fontSize="lg">
                        {getTokenName(redPacket)}
                      </Text>
                      <Badge
                        px={2}
                        py={1}
                        borderRadius="full"
                        fontSize="xs"
                        fontWeight="medium"
                        bg={getRedPacketTypeDisplay(redPacket).bg}
                        color={getRedPacketTypeDisplay(redPacket).color}
                        border="1px solid"
                        borderColor={getRedPacketTypeDisplay(redPacket).borderColor}
                      >
                        {getRedPacketTypeDisplay(redPacket).label}
                      </Badge>
                    </HStack>
                    <Text fontSize="xs" color="gray.500" fontFamily="mono">
                      {getTokenDescription(redPacket)}
                    </Text>
                  </VStack>
                  <VStack spacing={0} align="end">
                    <AmountDisplay 
                      redPacket={redPacket} 
                      fontSize="xl" 
                      fontWeight="bold" 
                    />
                  </VStack>
                </HStack>

                {/* Bottom: Date information and Action */}
                <Box
                  borderTop="1px solid"
                  borderColor="gray.100"
                  pt={3}
                >
                  <HStack justify="space-between" align="center">
                    <VStack spacing={0} align="start">
                      <Text fontSize="xs" color="gray.500">
                        Date Claimed
                      </Text>
                      <Text fontSize="sm" color="gray.700" fontWeight="medium">
                        {redPacket.created_at ? formatDate(redPacket.created_at) : 'N/A'}
                      </Text>
                    </VStack>
                    {getTransactionHash(redPacket) ? (
                      <Button
                        size="sm"
                        bg="blue.500"
                        color="white"
                        _hover={{ bg: "blue.600" }}
                        onClick={() => {
                          navigator.clipboard.writeText(getTransactionHash(redPacket) || '');
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
                    ) : (
                      <Text color="gray.400" fontSize="sm">
                        No Hash
                      </Text>
                    )}
                  </HStack>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </VStack>
    </Box>
  );

  // Desktop table component
  const DesktopTableView = () => (
    <Box
      bg="white"
      borderRadius="xl"
      boxShadow="lg"
      overflow="hidden"
      w="full"
    >
      <Box p={6} borderBottom="1px solid" borderColor="gray.200">
        <HStack spacing={4} align="center">
          <FilterPopoverComponent />
          <Text fontSize="lg" fontWeight="bold" color="gray.800">
            {getDynamicTitle()}
          </Text>
        </HStack>
      </Box>
      <TableContainer>
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>
                Token
              </Th>
              <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>
                Type
              </Th>
              <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>
                Amount
              </Th>
              <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>
                Date Claimed
              </Th>
              <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>
                Action
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginatedRedPackets && Array.isArray(paginatedRedPackets) && paginatedRedPackets.length > 0 && paginatedRedPackets.map((redPacket) => (
            <Tr key={redPacket.id} _hover={{ bg: 'gray.50' }}>
              {/* Token column */}
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
                    {getTokenIcon(redPacket)}
                  </Box>
                  <VStack spacing={1} align="start">
                    <Text fontWeight="medium" color="gray.800" fontSize="md">
                      {getTokenName(redPacket)}
                    </Text>
                    <Text fontSize="xs" color="gray.500" fontFamily="mono">
                      {getTokenDescription(redPacket)}
                    </Text>
                  </VStack>
                </HStack>
              </Td>
              
              {/* Type column */}
              <Td py={6}>
                <Badge
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="medium"
                  bg={getRedPacketTypeDisplay(redPacket).bg}
                  color={getRedPacketTypeDisplay(redPacket).color}
                  border="1px solid"
                  borderColor={getRedPacketTypeDisplay(redPacket).borderColor}
                >
                  {getRedPacketTypeDisplay(redPacket).label}
                </Badge>
              </Td>
              
              {/* Amount column */}
              <Td py={6}>
                <AmountDisplay 
                  redPacket={redPacket} 
                  fontSize="md" 
                  fontWeight="medium" 
                />
              </Td>
              
              {/* Date Claimed column */}
              <Td py={6}>
                <Text color="gray.600" fontSize="sm">
                  {redPacket.created_at ? formatDate(redPacket.created_at) : 'N/A'}
                </Text>
              </Td>
              
              {/* Action column */}
              <Td py={6}>
                {getTransactionHash(redPacket) ? (
                  <Button
                    size="sm"
                    bg="blue.500"
                    color="white"
                    _hover={{ bg: "blue.600" }}
                    onClick={() => {
                      navigator.clipboard.writeText(getTransactionHash(redPacket) || '');
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
                ) : (
                  <Text color="gray.400" fontSize="sm">
                    No Hash
                  </Text>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
    </Box>
  );

  // Pagination component
  const PaginationComponent = () => {
    // 只用后端分页
    const needsPagination = totalPages > 1 || currentPage > 1;
    if (!needsPagination) return null;
    const calculatedTotalPages = totalPages;
    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;
      if (calculatedTotalPages <= maxVisiblePages) {
        for (let i = 1; i <= calculatedTotalPages; i++) {
          pages.push(i);
        }
      } else {
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(calculatedTotalPages, start + maxVisiblePages - 1);
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
            isDisabled={currentPage <= 1 || loading}
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
              isDisabled={loading}
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
            isDisabled={currentPage >= calculatedTotalPages || loading}
            size="sm"
            bg="gray.600"
            color="white"
            _hover={{ bg: "gray.700" }}
            _disabled={{ bg: "gray.300", color: "gray.500" }}
          />
        </ButtonGroup>
        {/* Pagination info */}
        <Text ml={4} fontSize="sm" color="gray.600">
          Page {currentPage} of {calculatedTotalPages}
        </Text>
      </Flex>
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
            Please connect your wallet to view your claimed red packets
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
      px={{ base: 4, md: 8 }}
    >
      <Container maxW="1200px" mx="auto" py={8}>
        <VStack spacing={8} align="stretch">
          {/* Page title */}
          <Text 
            fontSize={{ base: '2xl', md: '3xl', lg: '4xl' }} 
            fontWeight="bold" 
            textAlign="center"
            color="gray.900"
            px={{ base: 2, md: 0 }}
          >
            My Claimed Red Packets & AirDrops
          </Text>

          {/* Content area */}
          {loading ? (
            <Flex justify="center" align="center" minH="300px" key="main-loading">
              <VStack spacing={4}>
                <Spinner size="xl" color="blue.500" />
                <Text textAlign="center" px={4} color="gray.700">Loading your claimed red packets...</Text>
              </VStack>
            </Flex>
          ) : error ? (
            <Alert status="error" key="error-alert">
              <AlertIcon />
              {error}
            </Alert>
          ) : !claimedRedPackets || !Array.isArray(claimedRedPackets) || claimedRedPackets.length === 0 ? (
            <Alert status="info" key="no-packets-alert">
              <AlertIcon />
              You haven't claimed any red packets yet
            </Alert>
          ) : initialized && Array.isArray(claimedRedPackets) && claimedRedPackets.length > 0 ? (
            <Fragment key="content-area">
              {/* Client-side filtering warning */}
              {/* This block is removed as per the edit hint to remove client-side filtering related hints. */}
              
              {/* Check if filtered data is empty */}
              {!filteredRedPackets || filteredRedPackets.length === 0 ? (
                <Alert status="info" key="no-data-alert">
                  <AlertIcon />
                  No data found for the selected filter
                </Alert>
              ) : (
                // Content layout with integrated filter
                <Fragment key="content-view">
                  {isMobile ? (
                    <MobileCardView />
                  ) : (
                    <DesktopTableView />
                  )}
                </Fragment>
              )}
            </Fragment>
          ) : (
            <Flex justify="center" align="center" minH="200px" key="loading-spinner">
              <Spinner size="lg" color="blue.500" />
            </Flex>
          )}

          {/* Pagination component */}
          <PaginationComponent />

          {/* Back to home button */}
          <Flex justify="center" pt={8}>
            <Button
              bg="#4079FF"
              color="white"
              borderRadius="xl"
              px={{ base: 6, md: 8 }}
              py={3}
              size={{ base: 'md', md: 'lg' }}
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