import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  Container,
  Heading,
  Code,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { TokenInfo, TokenName } from '../components/TokenInfo';
import { useTokenInfo } from '../hooks/useTokenInfo';
import { SOL_MINT_ADDRESS } from '../config/constants';

/**
 * 代币信息使用示例组件
 * 展示如何在前端项目中获取和显示 SPL Token 的信息
 */
export const TokenInfoExample: React.FC = () => {
  const [inputAddress, setInputAddress] = useState('');
  const [testAddress, setTestAddress] = useState('');

  // 常见的测试代币地址
  const testTokens = [
    {
      name: 'USDC',
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    },
    {
      name: 'USDT',
      address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    },
    {
      name: 'SOL',
      address: SOL_MINT_ADDRESS,
    },
    {
      name: 'RAY',
      address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    },
  ];

  const handleTest = (address: string) => {
    setTestAddress(address);
  };

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={8} align="stretch">
        <Heading textAlign="center">SPL Token 信息获取示例</Heading>
        
        {/* 手动输入测试 */}
        <Box bg="gray.50" p={6} borderRadius="lg">
          <VStack spacing={4} align="stretch">
            <Heading size="md">手动输入代币地址</Heading>
            <HStack>
              <Input
                placeholder="输入 SPL Token 地址"
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
              />
              <Button onClick={() => handleTest(inputAddress)} colorScheme="blue">
                测试
              </Button>
            </HStack>
          </VStack>
        </Box>

        {/* 预设代币测试 */}
        <Box bg="gray.50" p={6} borderRadius="lg">
          <VStack spacing={4} align="stretch">
            <Heading size="md">常见代币测试</Heading>
            <VStack spacing={2}>
              {testTokens.map((token) => (
                <HStack key={token.address} justify="space-between" w="100%">
                  <Text fontWeight="semibold">{token.name}</Text>
                  <Code fontSize="sm">{token.address.slice(0, 8)}...{token.address.slice(-8)}</Code>
                  <Button size="sm" onClick={() => handleTest(token.address)}>
                    测试
                  </Button>
                </HStack>
              ))}
            </VStack>
          </VStack>
        </Box>

        {/* 结果显示 */}
        {testAddress && (
          <Box bg="white" border="1px solid" borderColor="gray.200" p={6} borderRadius="lg">
            <VStack spacing={4} align="stretch">
              <Heading size="md">代币信息结果</Heading>
              
              <Box>
                <Text fontWeight="semibold" mb={2}>原始地址:</Text>
                <Code p={2} borderRadius="md" w="100%" wordBreak="break-all">
                  {testAddress}
                </Code>
              </Box>

              <Box>
                <Text fontWeight="semibold" mb={2}>使用 TokenInfo 组件 (简化版):</Text>
                <Box bg="gray.50" p={3} borderRadius="md">
                  <TokenInfo mintAddress={testAddress} size="md" />
                </Box>
              </Box>

              <Box>
                <Text fontWeight="semibold" mb={2}>使用 TokenInfo 组件 (详细版):</Text>
                <Box bg="gray.50" p={3} borderRadius="md">
                  <TokenInfo mintAddress={testAddress} showDetails={true} size="md" />
                </Box>
              </Box>

              <Box>
                <Text fontWeight="semibold" mb={2}>使用 TokenName 组件:</Text>
                <Box bg="gray.50" p={3} borderRadius="md">
                  <TokenName mintAddress={testAddress} />
                </Box>
              </Box>

              <Box>
                <Text fontWeight="semibold" mb={2}>使用 useTokenInfo Hook:</Text>
                <TokenInfoHookExample mintAddress={testAddress} />
              </Box>
            </VStack>
          </Box>
        )}

        {/* 使用说明 */}
        <Alert status="info">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text fontWeight="semibold">使用说明:</Text>
            <Text fontSize="sm">
              1. <Code>TokenInfo</Code> 组件：完整的代币信息显示，支持简化和详细两种模式
            </Text>
            <Text fontSize="sm">
              2. <Code>TokenName</Code> 组件：只显示代币名称的简化组件
            </Text>
            <Text fontSize="sm">
              3. <Code>useTokenInfo</Code> Hook：在组件中获取代币信息的自定义Hook
            </Text>
            <Text fontSize="sm">
              4. 支持 Jupiter API 和 Metaplex Token Metadata 两种数据源
            </Text>
          </VStack>
        </Alert>
      </VStack>
    </Container>
  );
};

// 展示如何使用 useTokenInfo Hook 的子组件
const TokenInfoHookExample: React.FC<{ mintAddress: string }> = ({ mintAddress }) => {
  const { tokenInfo, loading, error, displayName, refetch } = useTokenInfo(mintAddress);

  if (loading) {
    return <Text>正在加载代币信息...</Text>;
  }

  if (error) {
    return (
      <VStack align="start" spacing={2}>
        <Alert status="error" size="sm">
          <AlertIcon />
          <Text fontSize="sm">{error}</Text>
        </Alert>
        <Button size="sm" onClick={refetch}>重试</Button>
      </VStack>
    );
  }

  return (
    <Box bg="gray.50" p={3} borderRadius="md">
      <VStack align="start" spacing={2}>
        <Text><strong>显示名称:</strong> {displayName}</Text>
        {tokenInfo && (
          <>
            <Text><strong>符号:</strong> {tokenInfo.symbol}</Text>
            <Text><strong>名称:</strong> {tokenInfo.name}</Text>
            <Text><strong>精度:</strong> {tokenInfo.decimals}</Text>
            <Text><strong>已验证:</strong> {tokenInfo.verified ? '是' : '否'}</Text>
            {tokenInfo.logoURI && (
              <HStack>
                <Text><strong>图标:</strong></Text>
                <img src={tokenInfo.logoURI} alt={tokenInfo.symbol} width="24" height="24" />
              </HStack>
            )}
          </>
        )}
        <Button size="sm" onClick={refetch}>刷新信息</Button>
      </VStack>
    </Box>
  );
}; 