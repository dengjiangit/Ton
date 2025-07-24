import React from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { useNavigate } from 'react-router-dom';
import { formatAddress } from '../utils';

export const Header: React.FC = () => {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { disconnect } = useDisconnect()
  const navigate = useNavigate()

  const handleDisconnect = async () => {
    // 真正断开钱包连接
    await disconnect()
  }

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={10}
      bg="rgba(0, 0, 0, 0.8)"
      backdropFilter="blur(10px)"
    >
      <Flex
        maxW="1200px"
        mx="auto"
        px={6}
        py={4}
        justify="space-between"
        align="center"
      >
        <Text
          fontSize="2xl"
          fontWeight="bold"
          color="white"
          cursor="pointer"
          onClick={() => navigate('/')}
        >
          AIDR
        </Text>

        <Flex align="center" gap={4}>
          {isConnected && address ? (
            <Menu>
              <MenuButton
                as={Button}
                variant="outline"
                rightIcon={<ChevronDownIcon />}
                color="white"
                borderColor="cyan.400"
                bg="rgba(0, 0, 0, 0.3)"
                _hover={{
                  bg: 'rgba(0, 255, 255, 0.1)',
                  borderColor: 'cyan.300',
                  boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
                }}
                _active={{
                  bg: 'rgba(0, 255, 255, 0.2)',
                  borderColor: 'cyan.200'
                }}
                transition="all 0.3s ease"
              >
                {formatAddress(address)}
              </MenuButton>
              <MenuList
                bg="rgba(10, 25, 50, 0.95)"
                backdropFilter="blur(15px)"
                border="1px solid rgba(0, 255, 255, 0.3)"
                borderRadius="xl"
                boxShadow="0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 255, 255, 0.2)"
                p={2}
                minW="200px"
                overflow="hidden"
                _before={{
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '1px',
                  bgGradient: 'linear(to-r, transparent, cyan.400, transparent)',
                  zIndex: 1
                }}
              >
                <MenuItem
                  onClick={() => navigate('/my-created-redpackets')}
                  bg="transparent"
                  color="white"
                  _hover={{
                    bg: 'rgba(0, 255, 255, 0.1)',
                    color: 'cyan.300',
                    transform: 'translateX(8px)',
                    boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)'
                  }}
                  _focus={{
                    bg: 'rgba(0, 255, 255, 0.2)'
                  }}
                  borderRadius="lg"
                  mx={1}
                  my={1}
                  px={4}
                  py={3}
                  fontSize="sm"
                  fontWeight="medium"
                  transition="all 0.3s ease"
                  position="relative"
                >
                  🎁 My Red Packets
                </MenuItem>
                <MenuItem
                  onClick={() => navigate('/my-created-crowdfunding')}
                  bg="transparent"
                  color="white"
                  _hover={{
                    bg: 'rgba(0, 255, 255, 0.1)',
                    color: 'cyan.300',
                    transform: 'translateX(8px)',
                    boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)'
                  }}
                  _focus={{
                    bg: 'rgba(0, 255, 255, 0.2)'
                  }}
                  borderRadius="lg"
                  mx={1}
                  my={1}
                  px={4}
                  py={3}
                  fontSize="sm"
                  fontWeight="medium"
                  transition="all 0.3s ease"
                  position="relative"
                >
                  🚀 My Crowdfunding
                </MenuItem>
                <MenuItem
                  onClick={() => navigate('/my-claimed-redpackets')}
                  bg="transparent"
                  color="white"
                  _hover={{
                    bg: 'rgba(0, 255, 255, 0.1)',
                    color: 'cyan.300',
                    transform: 'translateX(8px)',
                    boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)'
                  }}
                  _focus={{
                    bg: 'rgba(0, 255, 255, 0.2)'
                  }}
                  borderRadius="lg"
                  mx={1}
                  my={1}
                  px={4}
                  py={3}
                  fontSize="sm"
                  fontWeight="medium"
                  transition="all 0.3s ease"
                  position="relative"
                >
                  💎 My Claim
                </MenuItem>
                <MenuItem
                  onClick={() => navigate('/my-claimed-crowdfunding')}
                  bg="transparent"
                  color="white"
                  _hover={{
                    bg: 'rgba(0, 255, 255, 0.1)',
                    color: 'cyan.300',
                    transform: 'translateX(8px)',
                    boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)'
                  }}
                  _focus={{
                    bg: 'rgba(0, 255, 255, 0.2)'
                  }}
                  borderRadius="lg"
                  mx={1}
                  my={1}
                  px={4}
                  py={3}
                  fontSize="sm"
                  fontWeight="medium"
                  transition="all 0.3s ease"
                  position="relative"
                >
                  🚀 My Crowdfunding Records
                </MenuItem>
                <Box
                  height="1px"
                  bgGradient="linear(to-r, transparent, rgba(0, 255, 255, 0.5), transparent)"
                  my={2}
                  mx={2}
                />
                <MenuItem
                  onClick={handleDisconnect}
                  bg="transparent"
                  color="red.300"
                  _hover={{
                    bg: 'rgba(255, 100, 100, 0.1)',
                    color: 'red.200',
                    transform: 'translateX(8px)',
                    boxShadow: '0 0 15px rgba(255, 100, 100, 0.2)'
                  }}
                  _focus={{
                    bg: 'rgba(255, 100, 100, 0.2)'
                  }}
                  borderRadius="lg"
                  mx={1}
                  my={1}
                  px={4}
                  py={3}
                  fontSize="sm"
                  fontWeight="medium"
                  transition="all 0.3s ease"
                  position="relative"
                >
                  🔌 Log out
                </MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <Button
              bg="white"
              color="black"
              borderRadius="md"
              px={6}
              py={2}
              fontSize="sm"
              fontWeight="medium"
              _hover={{ bg: 'gray.100' }}
              onClick={() => open()}
            >
              Connect Wallet
            </Button>
          )}
        </Flex>
      </Flex>
    </Box>
  )
} 