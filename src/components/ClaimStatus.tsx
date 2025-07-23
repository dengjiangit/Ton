import React, { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Alert,
  AlertIcon,
  Code,
  Divider,
  useToast
} from '@chakra-ui/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRedPacket } from '../hooks/useRedPacket';

interface ClaimStatusProps {
  redPacketId: string;
  creator: string;
}

export const ClaimStatus: React.FC<ClaimStatusProps> = ({ redPacketId, creator }) => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { publicKey } = useWallet();
  const { checkClaimStatus } = useRedPacket();
  const toast = useToast();

  const handleCheck = async () => {
    if (!publicKey) {
      toast({
        title: '错误',
        description: '请先连接钱包',
        status: 'error',
      });
      return;
    }

    setChecking(true);
    try {
      const status = await checkClaimStatus(redPacketId, creator);
      setResult(status);
      
      if (status) {
        toast({
          title: '检查完成',
          description: status.message,
          status: status.success ? 'success' : 'info',
        });
      }
    } catch (error) {
      toast({
        title: '检查失败',
        description: '无法检查领取状态',
        status: 'error',
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Box p={4} border="1px" borderColor="gray.200" borderRadius="md">
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Text fontSize="lg" fontWeight="semibold">
            领取状态检查
          </Text>
          <Button
            size="sm"
            colorScheme="blue"
            onClick={handleCheck}
            isLoading={checking}
            loadingText="检查中..."
          >
            检查状态
          </Button>
        </HStack>

        {result && (
          <>
            <Divider />
            <VStack spacing={3} align="stretch">
              <HStack justify="space-between">
                <Text>红包存在:</Text>
                <Badge colorScheme={result.redPacketExists ? 'green' : 'red'}>
                  {result.redPacketExists ? '是' : '否'}
                </Badge>
              </HStack>
              
              <HStack justify="space-between">
                <Text>用户已领取:</Text>
                <Badge colorScheme={result.userClaimed ? 'green' : 'gray'}>
                  {result.userClaimed ? '是' : '否'}
                </Badge>
              </HStack>
              
              <HStack justify="space-between">
                <Text>整体状态:</Text>
                <Badge colorScheme={result.success ? 'green' : 'yellow'}>
                  {result.message}
                </Badge>
              </HStack>
            </VStack>

            {result.userClaimed && (
              <Alert status="info">
                <AlertIcon />
                您已经成功领取过这个红包了！
              </Alert>
            )}

            {!result.redPacketExists && (
              <Alert status="error">
                <AlertIcon />
                红包不存在，请检查红包ID和创建者地址是否正确。
              </Alert>
            )}

            {result.redPacketExists && !result.userClaimed && (
              <Alert status="warning">
                <AlertIcon />
                红包存在但您尚未领取，如果领取失败请检查SOL余额是否充足。
              </Alert>
            )}
          </>
        )}

        <Box fontSize="sm" color="gray.600">
          <Text mb={2}>调试信息:</Text>
          <Code fontSize="xs" p={2} borderRadius="md" display="block">
            红包ID: {redPacketId}<br/>
            创建者: {creator}<br/>
            当前用户: {publicKey?.toString() || '未连接'}
          </Code>
        </Box>
      </VStack>
    </Box>
  );
}; 