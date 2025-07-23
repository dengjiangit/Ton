import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  Text,
  Alert,
  AlertIcon,
  Box,
  List,
  ListItem,
  ListIcon,
  Button,
  HStack,
  Badge,
  Divider
} from '@chakra-ui/react';
import { FiCheckCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';

interface TransactionHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorType?: 'simulation_failed' | 'already_processed' | 'general';
}

export const TransactionHelpModal: React.FC<TransactionHelpModalProps> = ({
  isOpen,
  onClose,
  errorType = 'general'
}) => {
  const getContent = () => {
    switch (errorType) {
      case 'simulation_failed':
        return {
          title: '交易模拟失败说明',
          status: 'warning' as const,
          description: '交易模拟失败并不意味着实际交易失败',
          content: (
            <VStack spacing={4} align="stretch">
              <Alert status="info">
                <AlertIcon />
                <Text>
                  <strong>重要：</strong>即使显示"交易模拟失败"，您的交易可能已经成功！
                </Text>
              </Alert>
              
              <Box>
                <Text fontWeight="semibold" mb={2}>为什么会出现这种情况？</Text>
                <List spacing={2}>
                  <ListItem>
                    <ListIcon as={FiInfo} color="blue.500" />
                    模拟环境与实际区块链环境存在差异
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FiInfo} color="blue.500" />
                    网络延迟或RPC节点同步问题
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FiInfo} color="blue.500" />
                    并发交易导致的状态不一致
                  </ListItem>
                </List>
              </Box>
            </VStack>
          )
        };
        
      case 'already_processed':
        return {
          title: '交易已处理说明',
          status: 'success' as const,
          description: '这通常意味着您的交易已经成功',
          content: (
            <VStack spacing={4} align="stretch">
              <Alert status="success">
                <AlertIcon />
                <Text>
                  <strong>好消息：</strong>"Transaction already been processed" 通常表示交易已经成功！
                </Text>
              </Alert>
              
              <Box>
                <Text fontWeight="semibold" mb={2}>这个错误的含义：</Text>
                <List spacing={2}>
                  <ListItem>
                    <ListIcon as={FiCheckCircle} color="green.500" />
                    您的交易已经在区块链上处理完成
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FiCheckCircle} color="green.500" />
                    代币可能已经转入您的钱包
                  </ListItem>
                  <ListItem>
                    <ListIcon as={FiCheckCircle} color="green.500" />
                    系统尝试重复提交相同的交易
                  </ListItem>
                </List>
              </Box>
            </VStack>
          )
        };
        
      default:
        return {
          title: '交易问题排查指南',
          status: 'info' as const,
          description: '遇到交易问题时的检查步骤',
          content: (
            <VStack spacing={4} align="stretch">
              <Alert status="warning">
                <AlertIcon />
                <Text>即使显示错误，也请先检查您的钱包余额！</Text>
              </Alert>
            </VStack>
          )
        };
    }
  };

  const content = getContent();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack>
            <Text>{content.title}</Text>
            <Badge colorScheme={content.status === 'success' ? 'green' : content.status === 'warning' ? 'yellow' : 'blue'}>
              帮助
            </Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {content.content}
            
            <Divider />
            
            <Box>
              <Text fontWeight="semibold" mb={3}>请按以下步骤检查：</Text>
              <List spacing={2}>
                <ListItem>
                  <ListIcon as={FiCheckCircle} color="blue.500" />
                  <strong>第一步：</strong>检查钱包中的代币余额是否增加
                </ListItem>
                <ListItem>
                  <ListIcon as={FiCheckCircle} color="blue.500" />
                  <strong>第二步：</strong>查看钱包的交易历史记录
                </ListItem>
                <ListItem>
                  <ListIcon as={FiCheckCircle} color="blue.500" />
                  <strong>第三步：</strong>如果收到代币，说明领取成功
                </ListItem>
                <ListItem>
                  <ListIcon as={FiAlertTriangle} color="orange.500" />
                  <strong>第四步：</strong>如果没有收到，可以尝试刷新页面重新领取
                </ListItem>
              </List>
            </Box>
            
            <Alert status="info">
              <AlertIcon />
              <Box>
                <Text fontWeight="semibold">技术说明</Text>
                <Text fontSize="sm">
                  Solana网络的高速特性有时会导致前端显示与实际状态不同步。
                  这是正常现象，不影响交易的实际执行结果。
                </Text>
              </Box>
            </Alert>
            
            <HStack justify="center" pt={4}>
              <Button colorScheme="blue" onClick={onClose}>
                我明白了
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}; 