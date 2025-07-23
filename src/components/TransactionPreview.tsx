import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Button,
  Divider,
  Icon,
  Box,
  Badge,
} from '@chakra-ui/react';
import { CheckIcon, WarningIcon } from '@chakra-ui/icons';

interface TransactionPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: 'create' | 'claim';
  amount: string;
  tokenSymbol: string;
  redPacketType?: string;
  packetCount?: number;
  isLoading?: boolean;
  networkFee?: string;
}

export const TransactionPreview: React.FC<TransactionPreviewProps> = ({
  isOpen,
  onClose,
  onConfirm,
  type,
  amount,
  tokenSymbol,
  redPacketType,
  packetCount,
  isLoading = false,
  networkFee = '~0.001 SOL'
}) => {
  const isCreate = type === 'create';
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent mx={4} maxW="400px">
        <ModalHeader>
          <HStack spacing={3}>
            <Icon 
              as={isCreate ? CheckIcon : CheckIcon} 
              color={isCreate ? 'blue.500' : 'green.500'} 
              boxSize={5} 
            />
            <Text fontSize="lg" fontWeight="bold">
              {isCreate ? '确认创建红包' : '确认领取红包'}
            </Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {/* 主要信息 */}
            <Box bg="gray.50" p={4} borderRadius="lg">
              <VStack spacing={3}>
                <HStack justify="space-between" w="100%">
                  <Text color="gray.600" fontSize="sm">
                    {isCreate ? '创建金额' : '领取金额'}
                  </Text>
                  <Text fontSize="xl" fontWeight="bold" color="gray.800">
                    {amount} {tokenSymbol}
                  </Text>
                </HStack>
                
                {isCreate && packetCount && (
                  <HStack justify="space-between" w="100%">
                    <Text color="gray.600" fontSize="sm">红包数量</Text>
                    <Text fontWeight="semibold">{packetCount} 个</Text>
                  </HStack>
                )}
                
                {redPacketType && (
                  <HStack justify="space-between" w="100%">
                    <Text color="gray.600" fontSize="sm">红包类型</Text>
                    <Badge colorScheme={
                      redPacketType === '固定金额' ? 'blue' : 
                      redPacketType === '随机金额' ? 'green' : 'purple'
                    }>
                      {redPacketType}
                    </Badge>
                  </HStack>
                )}
              </VStack>
            </Box>

            <Divider />

            {/* 费用信息 */}
            <VStack spacing={2} align="stretch">
              <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                费用明细
              </Text>
              
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.600">网络费用</Text>
                <Text fontSize="sm">{networkFee}</Text>
              </HStack>
              
              {isCreate && (
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">创建费用</Text>
                  <Text fontSize="sm">包含在网络费用中</Text>
                </HStack>
              )}
              
              {!isCreate && (
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">领取手续费</Text>
                  <Text fontSize="sm">包含在网络费用中</Text>
                </HStack>
              )}
            </VStack>

            {/* 警告信息 */}
            <Box bg="yellow.50" p={3} borderRadius="md" borderLeft="4px" borderColor="yellow.400">
              <HStack spacing={2} align="start">
                <Icon as={WarningIcon} color="yellow.500" mt={0.5} />
                <VStack align="start" spacing={1}>
                  <Text fontSize="sm" fontWeight="semibold" color="yellow.800">
                    注意事项
                  </Text>
                  <Text fontSize="xs" color="yellow.700">
                    {isCreate 
                      ? '创建后红包金额将从您的账户转出，请确认金额无误'
                      : '确认钱包交易后即可领取红包，请勿重复操作'
                    }
                  </Text>
                </VStack>
              </HStack>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3} w="100%">
            <Button variant="outline" onClick={onClose} flex={1}>
              取消
            </Button>
            <Button
              colorScheme={isCreate ? 'blue' : 'green'}
              onClick={onConfirm}
              flex={1}
              isLoading={isLoading}
              loadingText="处理中..."
            >
              {isCreate ? '确认创建' : '确认领取'}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 