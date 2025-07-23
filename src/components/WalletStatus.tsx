import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Alert,
  AlertIcon,
  Skeleton,
} from '@chakra-ui/react';
import { useAppKitAccount } from '@reown/appkit/react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { formatAddress, formatSOL } from '../utils';
import { RPC_ENDPOINT } from '../config/constants';

interface WalletStatusProps {
  showConnectButton?: boolean
}

export const WalletStatus: React.FC<WalletStatusProps> = ({ 
  showConnectButton = false 
}) => {
  const { address, isConnected } = useAppKitAccount()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // RPC连接
  const connection = useMemo(() => new Connection(
    process.env.NEXT_PUBLIC_RPC_URL || RPC_ENDPOINT,
    "confirmed"
  ), [])

  useEffect(() => {
    if (isConnected && address) {
      setLoading(true)
      const publicKey = new PublicKey(address)
      connection
        .getBalance(publicKey)
        .then((balance: number) => setBalance(balance / LAMPORTS_PER_SOL))
        .catch((error: unknown) => {
          console.error('获取余额失败:', error)
          setBalance(0)
        })
        .finally(() => setLoading(false))
    } else {
      setBalance(null)
    }
  }, [isConnected, address, connection])

  if (!isConnected) {
    return (
      <Alert status="warning">
        <AlertIcon />
        <VStack align="start" spacing={1}>
          <Text>钱包未连接</Text>
          {showConnectButton && (
            <Text fontSize="sm">请在右上角连接钱包</Text>
          )}
        </VStack>
      </Alert>
    )
  }

  return (
    <Box p={4} bg="green.50" borderRadius="md" border="1px solid" borderColor="green.200">
      <VStack align="start" spacing={2}>
        <HStack>
          <Text fontWeight="bold" color="green.600">
            钱包状态:
          </Text>
          <Badge colorScheme="green">已连接</Badge>
        </HStack>
        
        {address && (
          <HStack justify="space-between" w="full">
            <Text fontSize="sm" color="gray.600">
              地址:
            </Text>
            <Text fontSize="sm" fontFamily="mono">
              {formatAddress(address)}
            </Text>
          </HStack>
        )}
        
        <HStack justify="space-between" w="full">
          <Text fontSize="sm" color="gray.600">
            余额:
          </Text>
          {loading ? (
            <Skeleton height="20px" width="80px" />
          ) : (
            <Text fontSize="sm" fontWeight="semibold">
              {balance !== null ? `${formatSOL(balance)} SOL` : '获取失败'}
            </Text>
          )}
        </HStack>
      </VStack>
    </Box>
  )
} 