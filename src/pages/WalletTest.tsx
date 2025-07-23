import React, { useEffect, useState, useMemo } from 'react'
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  Alert,
  AlertIcon,
  Code,
  Divider,
} from '@chakra-ui/react'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useNavigate } from 'react-router-dom'
import { ArrowBackIcon } from '@chakra-ui/icons'
import { formatAddress, formatSOL } from '../utils'
import { RPC_ENDPOINT } from '../config/constants'

export const WalletTest: React.FC = () => {
  const navigate = useNavigate()
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // RPC连接
  const connection = useMemo(() =>
    new Connection(
      process.env.NEXT_PUBLIC_RPC_URL || RPC_ENDPOINT,
      "confirmed"
    ), []
  )

  useEffect(() => {
    if (isConnected && address) {
      setLoading(true)
      const publicKey = new PublicKey(address)
      connection
        .getBalance(publicKey)
        .then((balance: number) => setBalance(balance / LAMPORTS_PER_SOL))
        .catch((error: unknown) => {
          console.error('获取余额失败:', error)
          setBalance(null)
        })
        .finally(() => setLoading(false))
    } else {
      setBalance(null)
    }
  }, [isConnected, address, connection])

  const handleRefreshBalance = () => {
    if (isConnected && address) {
      setLoading(true)
      const publicKey = new PublicKey(address)
      connection
        .getBalance(publicKey)
        .then((balance: number) => setBalance(balance / LAMPORTS_PER_SOL))
        .catch((error: unknown) => console.error('获取余额失败:', error))
        .finally(() => setLoading(false))
    }
  }

  return (
    <Box pt="80px" minHeight="100vh">
      <Container maxW="800px" mx="auto" px={6} py={8}>
        <VStack spacing={8} align="stretch">
          <HStack>
            <Button
              leftIcon={<ArrowBackIcon />}
              variant="ghost"
              color="white"
              onClick={() => navigate('/')}
            >
              返回首页
            </Button>
          </HStack>

          <Text
            fontSize="3xl"
            fontWeight="bold"
            textAlign="center"
            color="white"
          >
            钱包连接测试
          </Text>

          <Card>
            <CardBody p={8}>
              <VStack spacing={6} align="stretch">
                {/* 钱包连接按钮 */}
                <VStack spacing={4}>
                  <Text fontSize="lg" fontWeight="bold">
                    钱包连接
                  </Text>
                  <Button
                    colorScheme="blue"
                    onClick={() => open()}
                  >
                    {isConnected ? '钱包设置' : '连接钱包'}
                  </Button>
                </VStack>

                <Divider />

                {/* 连接状态 */}
                <VStack spacing={4} align="stretch">
                  <Text fontSize="lg" fontWeight="bold">
                    连接状态
                  </Text>
                  
                  <Alert status={isConnected ? "success" : "info"}>
                    <AlertIcon />
                    {isConnected ? "钱包已连接" : "钱包未连接"}
                  </Alert>

                  {isConnected && address && (
                    <VStack spacing={3} align="stretch">
                      <HStack justify="space-between">
                        <Text fontWeight="semibold">钱包类型:</Text>
                        <Text>@reown/appkit</Text>
                      </HStack>
                      
                      <HStack justify="space-between">
                        <Text fontWeight="semibold">钱包地址:</Text>
                        <Code fontSize="sm">
                          {formatAddress(address, 8)}
                        </Code>
                      </HStack>
                      
                      <HStack justify="space-between">
                        <Text fontWeight="semibold">完整地址:</Text>
                        <Code fontSize="xs" wordBreak="break-all">
                          {address}
                        </Code>
                      </HStack>
                      
                      <HStack justify="space-between">
                        <Text fontWeight="semibold">账户余额:</Text>
                        <VStack align="end" spacing={1}>
                          <Text>
                            {loading ? '加载中...' : 
                             balance !== null ? `${formatSOL(balance)} SOL` : '获取失败'}
                          </Text>
                          <Button size="sm" onClick={handleRefreshBalance} isLoading={loading}>
                            刷新余额
                          </Button>
                        </VStack>
                      </HStack>
                    </VStack>
                  )}
                </VStack>

                <Divider />

                {/* 操作按钮 */}
                <VStack spacing={4}>
                  <Text fontSize="lg" fontWeight="bold">
                    测试操作
                  </Text>
                  
                  <HStack spacing={4} wrap="wrap">
                    <Button 
                      colorScheme="blue" 
                      onClick={() => navigate('/create?type=redpacket')}
                      isDisabled={!isConnected}
                    >
                      创建红包
                    </Button>
                    <Button 
                      colorScheme="green" 
                      onClick={() => navigate('/claim')}
                      isDisabled={!isConnected}
                    >
                      领取红包
                    </Button>
                    <Button 
                      colorScheme="purple" 
                      onClick={() => navigate('/my-redpackets')}
                      isDisabled={!isConnected}
                    >
                      我的红包
                    </Button>
                    {isConnected && (
                      <Button 
                        colorScheme="red" 
                        variant="outline"
                        onClick={() => open()}
                      >
                        钱包设置
                      </Button>
                    )}
                  </HStack>
                </VStack>

                {/* 说明信息 */}
                <Alert status="info">
                  <AlertIcon />
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="semibold">使用说明:</Text>
                    <Text fontSize="sm">
                      1. 点击上方按钮连接支持的钱包（推荐使用 Phantom）
                    </Text>
                    <Text fontSize="sm">
                      2. 连接成功后会显示钱包信息和余额
                    </Text>
                    <Text fontSize="sm">
                      3. 确保钱包网络设置为 Devnet
                    </Text>
                    <Text fontSize="sm">
                      4. 如需测试SOL，可前往 Solana Faucet 获取
                    </Text>
                  </VStack>
                </Alert>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  )
} 