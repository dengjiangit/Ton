import React from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Image,
  Spinner,
  Badge,
  Tooltip,
  Alert,
  AlertIcon,
  Code,
} from '@chakra-ui/react';
import { useTokenInfo } from '../hooks/useTokenInfo';

interface TokenInfoProps {
  mintAddress: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const TokenInfo: React.FC<TokenInfoProps> = ({ 
  mintAddress, 
  showDetails = false,
  size = 'md' 
}) => {
  const { tokenInfo, loading, error, displayName } = useTokenInfo(mintAddress);

  if (loading) {
    return (
      <HStack spacing={2}>
        <Spinner size="sm" />
        <Text fontSize={size === 'sm' ? 'sm' : 'md'}>获取代币信息中...</Text>
      </HStack>
    );
  }

  if (error) {
    return (
      <Alert status="warning" size="sm">
        <AlertIcon />
        <Text fontSize="sm">{error}</Text>
      </Alert>
    );
  }

  if (!tokenInfo) {
    return (
      <VStack align="start" spacing={1}>
        <Text fontSize={size === 'sm' ? 'sm' : 'md'} color="gray.500">
          未知代币
        </Text>
        <Code fontSize="xs" color="gray.400">
          {mintAddress.slice(0, 8)}...{mintAddress.slice(-8)}
        </Code>
      </VStack>
    );
  }

  const imageSize = size === 'sm' ? '20px' : size === 'md' ? '24px' : '32px';
  const textSize = size === 'sm' ? 'sm' : size === 'md' ? 'md' : 'lg';

  return (
    <HStack spacing={2} align="center">
      {tokenInfo.logoURI && (
        <Image
          src={tokenInfo.logoURI}
          alt={tokenInfo.symbol}
          boxSize={imageSize}
          borderRadius="full"
          fallback={
            <Box
              boxSize={imageSize}
              borderRadius="full"
              bg="gray.200"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="xs" color="gray.500">
                {tokenInfo.symbol.charAt(0)}
              </Text>
            </Box>
          }
        />
      )}
      
      <VStack align="start" spacing={0}>
        <HStack spacing={2}>
          <Text fontSize={textSize} fontWeight="semibold">
            {tokenInfo.symbol}
          </Text>
          {tokenInfo.verified && (
            <Tooltip label="已验证代币">
              <Badge colorScheme="green" size="sm">
                ✓
              </Badge>
            </Tooltip>
          )}
        </HStack>
        
        {showDetails && (
          <VStack align="start" spacing={1} mt={1}>
            <Text fontSize="xs" color="gray.600">
              {tokenInfo.name}
            </Text>
            <Code fontSize="xs" color="gray.400">
              {mintAddress.slice(0, 8)}...{mintAddress.slice(-8)}
            </Code>
            <Text fontSize="xs" color="gray.500">
              精度: {tokenInfo.decimals}
            </Text>
            {tokenInfo.tags && tokenInfo.tags.length > 0 && (
              <HStack spacing={1} flexWrap="wrap">
                {tokenInfo.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} size="sm" colorScheme="blue">
                    {tag}
                  </Badge>
                ))}
              </HStack>
            )}
          </VStack>
        )}
      </VStack>
    </HStack>
  );
};

// 简化版本的组件，只显示名称
export const TokenName: React.FC<{ mintAddress: string }> = ({ mintAddress }) => {
  const { displayName, loading } = useTokenInfo(mintAddress);

  if (loading) {
    return <Spinner size="sm" />;
  }

  return <Text>{displayName}</Text>;
}; 