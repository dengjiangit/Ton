import React from 'react';
import {
  Box,
  Card,
  CardBody,
  Text,
  Badge,
  Button,
  VStack,
  HStack,
  Progress,
  useToast,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import { FiCopy, FiShare2, FiGift } from 'react-icons/fi';
import { RedPacket, RedPacketState } from '../types';
import { formatSOL, formatTime, timeRemaining, copyToClipboard, generateShareLink } from '../utils';

interface RedPacketCardProps {
  redPacket: RedPacket
  onClaim?: (id: string) => void
  showClaimButton?: boolean
  isLoading?: boolean
}

export const RedPacketCard: React.FC<RedPacketCardProps> = ({
  redPacket,
  onClaim,
  showClaimButton = false,
  isLoading = false,
}) => {
  const toast = useToast()

  const getStateColor = (state: RedPacketState) => {
    switch (state) {
      case RedPacketState.Active:
        return 'green'
      case RedPacketState.Expired:
        return 'red'
      case RedPacketState.Completed:
        return 'blue'
      default:
        return 'gray'
    }
  }

  const getStateText = (state: RedPacketState) => {
    switch (state) {
      case RedPacketState.Active:
        return '进行中'
      case RedPacketState.Expired:
        return '已过期'
      case RedPacketState.Completed:
        return '已抢完'
      default:
        return '未知'
    }
  }

  const handleCopy = async () => {
    const success = await copyToClipboard(redPacket.id)
    toast({
      title: success ? '复制成功' : '复制失败',
      status: success ? 'success' : 'error',
      duration: 2000,
    })
  }

  const handleShare = async () => {
    const shareLink = generateShareLink(redPacket.id)
    const success = await copyToClipboard(shareLink)
    toast({
      title: success ? 'Share link copied' : 'Copy failed',
              description: success ? 'You can send it to friends to claim the red packet' : undefined,
      status: success ? 'success' : 'error',
      duration: 3000,
    })
  }

  const progress = (redPacket.claimedCount / redPacket.totalCount) * 100
  const remainingTime = timeRemaining(redPacket.expiresAt)

  return (
    <Card
      variant="outline"
      bg="white"
      shadow="md"
      _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
      transition="all 0.2s"
    >
      <CardBody>
        <VStack spacing={4} align="stretch">
          {/* 头部信息 */}
          <HStack justify="space-between" align="start">
            <HStack>
              <Icon as={FiGift} color="red.500" boxSize={5} />
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                红包
              </Text>
            </HStack>
            <Badge colorScheme={getStateColor(redPacket.state)} variant="solid">
              {getStateText(redPacket.state)}
            </Badge>
          </HStack>

          {/* 红包消息 */}
          {redPacket.message && (
            <Box
              bg="red.50"
              p={3}
              borderRadius="md"
              borderLeft="4px solid"
              borderLeftColor="red.500"
            >
              <Text fontSize="sm" color="gray.700" fontStyle="italic">
                "{redPacket.message}"
              </Text>
            </Box>
          )}

          {/* 金额信息 */}
          <VStack spacing={2} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">
                总金额
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="red.500">
                {formatSOL(redPacket.totalAmount)} SOL
              </Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">
                剩余金额
              </Text>
              <Text fontSize="md" fontWeight="semibold" color="green.500">
                {formatSOL(redPacket.remainingAmount)} SOL
              </Text>
            </HStack>
          </VStack>

          {/* 进度条 */}
          <VStack spacing={2} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">
                领取进度
              </Text>
              <Text fontSize="sm" color="gray.600">
                {redPacket.claimedCount}/{redPacket.totalCount}
              </Text>
            </HStack>
            <Progress
              value={progress}
              colorScheme="red"
              size="sm"
              borderRadius="full"
            />
          </VStack>

          {/* 时间信息 */}
          <VStack spacing={1} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">
                创建时间
              </Text>
              <Text fontSize="sm" color="gray.600">
                {formatTime(redPacket.createdAt)}
              </Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">
                剩余时间
              </Text>
              <Text
                fontSize="sm"
                color={remainingTime === '已过期' ? 'red.500' : 'green.500'}
                fontWeight="semibold"
              >
                {remainingTime}
              </Text>
            </HStack>
          </VStack>

          {/* 操作按钮 */}
          <HStack spacing={2}>
            {showClaimButton && redPacket.state === RedPacketState.Active && (
              <Button
                colorScheme="red"
                flex={1}
                onClick={() => onClaim?.(redPacket.id)}
                isLoading={isLoading}
                loadingText="领取中..."
              >
                领取红包
              </Button>
            )}
            
            <Tooltip label="复制红包ID">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                leftIcon={<Icon as={FiCopy} />}
              >
                复制ID
              </Button>
            </Tooltip>
            
                          <Tooltip label="Share Red Packet">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                leftIcon={<Icon as={FiShare2} />}
              >
                                  Share
              </Button>
            </Tooltip>
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  )
} 