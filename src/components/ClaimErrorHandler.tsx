import React from 'react';
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Button,
  VStack,
  Text,
  Link,
  Code,
  useToast,
} from '@chakra-ui/react';
import { ExternalLinkIcon, RepeatIcon } from '@chakra-ui/icons';

interface ClaimErrorHandlerProps {
  error: Error | null;
  onRetry?: () => void;
  redPacketId?: string;
  creatorAddress?: string;
}

export const ClaimErrorHandler: React.FC<ClaimErrorHandlerProps> = ({
  error,
  onRetry,
  redPacketId,
  creatorAddress
}) => {
  const toast = useToast();

  if (!error) return null;

  const getErrorInfo = (error: Error) => {
    const message = error.message.toLowerCase();
    
    if (message.includes('already claimed') || message.includes('0x0')) {
      return {
        title: '您已经领取过这个红包了',
        description: '每个地址只能领取一次红包。请检查您的钱包交易历史确认是否已经收到代币。',
        severity: 'info' as const,
        solutions: [
          '检查钱包交易历史',
          '查看钱包余额变化',
          '如果确实未收到，请联系技术支持'
        ]
      };
    }
    
    if (message.includes('insufficient funds in claimer') || message.includes('insufficient claimer funds')) {
      return {
        title: 'SOL余额不足',
        description: '您的钱包中SOL余额不足以支付领取费用。',
        severity: 'warning' as const,
        solutions: [
          '向钱包充值至少 0.002 SOL',
          '确保网络连接正常',
          '检查钱包是否连接到正确的网络'
        ]
      };
    }
    
    if (message.includes('red packet has expired')) {
      return {
        title: '红包已过期',
        description: '这个红包的领取时间已经结束，无法继续领取。',
        severity: 'error' as const,
        solutions: [
          '联系红包创建者了解详情',
          '寻找其他可用的红包',
          '关注最新的空投信息'
        ]
      };
    }
    
    if (message.includes('no packets remaining') || message.includes('已被抢完')) {
      return {
        title: '红包已被抢完',
        description: '这个红包的所有份额都已经被领取完毕。',
        severity: 'error' as const,
        solutions: [
          '寻找其他可用的红包',
          '关注最新的空投信息',
          '下次尽早参与领取'
        ]
      };
    }
    
    if (message.includes('user rejected') || message.includes('user cancelled')) {
      return {
        title: '交易被取消',
        description: '您在钱包中取消了交易签名。',
        severity: 'info' as const,
        solutions: [
          '重新尝试领取',
          '在钱包弹窗中点击"确认"',
          '检查交易详情后再确认'
        ]
      };
    }
    
    if (message.includes('network') || message.includes('rpc') || message.includes('timeout')) {
      return {
        title: '网络连接问题',
        description: '网络连接不稳定或RPC节点响应缓慢。',
        severity: 'warning' as const,
        solutions: [
          '等待几分钟后重试',
          '检查网络连接',
          '刷新页面后重试',
          '尝试在网络较空闲时重试'
        ]
      };
    }
    
    if (message.includes('simulation failed')) {
      return {
        title: '交易模拟失败',
        description: '交易在提交前的模拟过程失败，但实际交易可能仍会成功。',
        severity: 'warning' as const,
        solutions: [
          '检查钱包是否收到代币',
          '查看交易历史确认状态',
          '如果确实失败，请重试',
          '检查钱包余额和网络状态'
        ]
      };
    }
    
    // 默认错误处理
    return {
      title: '领取失败',
      description: '遇到未知错误，请查看详细信息或联系技术支持。',
      severity: 'error' as const,
      solutions: [
        '刷新页面后重试',
        '清除浏览器缓存',
        '检查钱包连接状态',
        '联系技术支持并提供错误信息'
      ]
    };
  };

  const errorInfo = getErrorInfo(error);

  const copyErrorToClipboard = () => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      redPacketId,
      creatorAddress,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        toast({
          title: '错误信息已复制',
          description: '您可以将此信息发送给技术支持',
          status: 'success',
          duration: 3000,
        });
      })
      .catch(() => {
        toast({
          title: '复制失败',
          description: '请手动复制错误信息',
          status: 'error',
          duration: 3000,
        });
      });
  };

  return (
    <Box mt={4}>
      <Alert status={errorInfo.severity} borderRadius="md">
        <AlertIcon />
        <Box flex="1">
          <AlertTitle>{errorInfo.title}</AlertTitle>
          <AlertDescription mt={2}>
            {errorInfo.description}
          </AlertDescription>
        </Box>
      </Alert>

      <Box mt={4} p={4} bg="gray.50" borderRadius="md">
        <Text fontWeight="bold" mb={2}>💡 解决建议：</Text>
        <VStack align="start" spacing={1}>
          {errorInfo.solutions.map((solution, index) => (
            <Text key={index} fontSize="sm">
              {index + 1}. {solution}
            </Text>
          ))}
        </VStack>
      </Box>

      <VStack mt={4} spacing={3}>
        {onRetry && (
          <Button
            leftIcon={<RepeatIcon />}
            colorScheme="blue"
            onClick={onRetry}
            width="full"
          >
            重试领取
          </Button>
        )}
        
        <Button
          variant="outline"
          onClick={copyErrorToClipboard}
          width="full"
        >
          复制错误信息
        </Button>
        
        <Link
          href="https://github.com/your-repo/issues"
          isExternal
          color="blue.500"
          fontSize="sm"
        >
          报告问题 <ExternalLinkIcon mx="2px" />
        </Link>
      </VStack>

      {/* 开发模式下显示详细错误 */}
      {process.env.NODE_ENV === 'development' && (
        <Box mt={4} p={3} bg="red.50" borderRadius="md" borderLeft="4px solid" borderLeftColor="red.500">
          <Text fontSize="xs" fontWeight="bold" color="red.700" mb={1}>
            开发调试信息：
          </Text>
          <Code fontSize="xs" p={2} bg="white" borderRadius="sm" display="block" whiteSpace="pre-wrap">
            {error.message}
          </Code>
          {error.stack && (
            <Code fontSize="xs" p={2} bg="white" borderRadius="sm" display="block" whiteSpace="pre-wrap" mt={2}>
              {error.stack.split('\n').slice(0, 5).join('\n')}
            </Code>
          )}
        </Box>
      )}
    </Box>
  );
}; 