import React from 'react'
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
} from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { ArrowBackIcon } from '@chakra-ui/icons'

export const MyRedPackets: React.FC = () => {
  const navigate = useNavigate()

  // 模拟数据
  const redPackets = [
    {
      id: 'RP001',
      token: 'USDC',
      totalAmount: 1000,
      claimed: 45,
      total: 100,
      status: 'Active',
      createdAt: '2024-01-15',
    },
    {
      id: 'RP002',
      token: 'SOL',
      totalAmount: 50,
      claimed: 20,
      total: 20,
      status: 'Completed',
      createdAt: '2024-01-10',
    },
  ]

  return (
    <Box pt="80px" minHeight="100vh">
      <Container maxW="1000px" mx="auto" px={6} py={8}>
        <VStack spacing={8} align="stretch">
          <HStack>
            <Button
              leftIcon={<ArrowBackIcon />}
              variant="ghost"
              color="white"
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          </HStack>

          <Text
            fontSize="3xl"
            fontWeight="bold"
            textAlign="center"
            color="white"
          >
            My Red Packets
          </Text>

          <Card>
            <CardBody>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>ID</Th>
                    <Th>Token</Th>
                    <Th>Total Amount</Th>
                    <Th>Progress</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {redPackets.map((packet) => (
                    <Tr key={packet.id}>
                      <Td>{packet.id}</Td>
                      <Td>{packet.token}</Td>
                      <Td>{packet.totalAmount}</Td>
                      <Td>{packet.claimed}/{packet.total}</Td>
                      <Td>
                        <Badge
                          colorScheme={packet.status === 'Active' ? 'green' : 'gray'}
                        >
                          {packet.status}
                        </Badge>
                      </Td>
                      <Td>{packet.createdAt}</Td>
                      <Td>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  )
} 