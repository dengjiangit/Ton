import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useToast,
  Code,
  Divider,
} from '@chakra-ui/react';
import { FiCopy } from 'react-icons/fi';
import QRCodeWithLogo from './QRCodeWithLogo';
import DiscordLogo from '../assets/discord-v2-svgrepo-com.svg';
import TelegramLogo from '../assets/telegram-logo-svgrepo-com.svg';
import TwitterLogo from '../assets/twitter-color-svgrepo-com.svg';
import FacebookLogo from '../assets/facebook-1-svgrepo-com.svg';

interface ShareComponentProps {
  shareUrl: string;
}

const ShareComponent: React.FC<ShareComponentProps> = ({ shareUrl }) => {
  const toast = useToast();

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: 'Copy Successful',
        description: 'Share link copied to clipboard',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }).catch(() => {
      toast({
        title: 'Copy Failed',
        description: 'Please copy the link manually',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    });
  };

  const saveQRCode = () => {
    const qrContainer = document.getElementById('qr-code-styled');
    if (qrContainer) {
      const canvas = qrContainer.querySelector('canvas') as HTMLCanvasElement;
      if (canvas) {
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.download = 'aidr-red-packet-qr-code.png';
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        toast({
          title: 'QR Code Saved',
          description: 'QR code has been saved to your downloads',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const message = 'Come grab your AIDR red packet! 🧧✨';
    const encodedMessage = encodeURIComponent(message);

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedMessage}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`, '_blank');
        break;
      case 'discord':
        // Discord没有直接的分享URL API，但我们可以提供更好的用户体验
        copyLink();
        
        // 检测设备类型并尝试打开Discord
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /mobile|android|iphone|ipad/.test(userAgent);
        
        if (isMobile) {
          // 移动端尝试打开Discord应用
          setTimeout(() => {
            window.location.href = 'discord://';
          }, 100);
        } else {
          // 桌面端尝试打开Discord网页版或应用
          setTimeout(() => {
            window.open('https://discord.com/app', '_blank');
          }, 100);
        }
        
        toast({
          title: '已为您打开Discord',
          description: '红包链接已复制！请在Discord中粘贴分享给朋友。',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
        break;
      case 'reddit':
        window.open(`https://reddit.com/submit?url=${encodedUrl}&title=${encodedMessage}`, '_blank');
        break;
      default:
        break;
    }
  };

  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="lg"
      p={{ base: 2, md: 3 }}
      bg="white"
      w="100%"
      maxW="100%"
      overflow="hidden"
    >
      <VStack spacing={{ base: 3, md: 4 }} align="center" w="100%">
        {/* 移动端垂直布局 */}
        <VStack spacing={3} align="stretch" w="100%" display={{ base: "flex", md: "none" }}>
          {/* Claim Link 部分 */}
          <VStack spacing={3} w="100%">
            <VStack spacing={2} align="stretch" w="100%">
              <Text fontSize="sm" color="gray.700" fontWeight="bold" textAlign="left">
                Claim Link
              </Text>
              <HStack justify="space-between" align="center" w="100%">
                  <Text 
                  fontSize="sm" 
                  color="#4079FF"
                    fontFamily="mono"
                    wordBreak="break-all"
                    flex={1}
                    pr={2}
                    noOfLines={1}
                  fontWeight="bold"
                  >
                    {shareUrl}
                  </Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={copyLink}
                    _hover={{ bg: 'gray.200' }}
                    minW="auto"
                    px={2}
                  >
                    <FiCopy size={14} />
                  </Button>
                </HStack>
            </VStack>

            <Button
              onClick={copyLink}
              bg="#4079FF"
              color="white"
              width="169px"
              height="48px"
              fontSize="md"
              fontWeight="medium"
              borderRadius="lg"
              _hover={{ 
                bg: '#3668e6',
                transform: 'translateY(-1px)',
                boxShadow: 'md'
              }}
              transition="all 0.2s ease"
            >
              🔗 Copy Link
            </Button>
          </VStack>

          {/* QR Code 部分 */}
          <VStack spacing={1} align="center" w="100%">
            <Text fontSize="sm" color="gray.700" fontWeight="bold" textAlign="center">
              Scan QR Code
            </Text>
            <Box
              bg="white"
              p="8px"
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.200"
              boxShadow="sm"
              display="flex"
              justifyContent="center"
              alignItems="center"
              w="100%"
              maxW="220px"
              mx="auto"
            >
              <QRCodeWithLogo
                value={shareUrl}
                size={204}
                id="qr-code-styled"
              />
            </Box>
            <Button
              onClick={saveQRCode}
              bg="white"
              color="blue.500"
              border="1px solid"
              borderColor="#C6C6C6"
              width="169px"
              height="48px"
              fontSize="md"
              fontWeight="medium"
              borderRadius="lg"
              _hover={{ 
                bg: 'blue.50',
                transform: 'translateY(-1px)',
                boxShadow: 'md'
              }}
              transition="all 0.2s ease"
            >
              📱 Save QR code
            </Button>
          </VStack>
        </VStack>

        {/* 桌面端水平布局 */}
        <HStack 
          spacing={4} 
          align="start" 
          w="100%" 
          justify="center"
          display={{ base: "none", md: "flex" }}
        >
          {/* 左侧 - Claim Link 部分 */}
          <VStack spacing={3} flex={1} maxW="240px" w="100%">
            <VStack spacing={2} align="stretch" w="100%">
              <Text fontSize="sm" color="gray.700" fontWeight="bold" textAlign="left">
                Claim Link
              </Text>
              <HStack justify="space-between" align="center" w="100%">
                  <Text 
                  fontSize="sm" 
                  color="#4079FF"
                    fontFamily="mono"
                    wordBreak="break-all"
                    flex={1}
                    pr={2}
                    noOfLines={1}
                  fontWeight="bold"
                  >
                    {shareUrl}
                  </Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={copyLink}
                    _hover={{ bg: 'gray.200' }}
                    minW="auto"
                    px={2}
                  >
                    <FiCopy size={16} />
                  </Button>
                </HStack>
            </VStack>

            <Button
              onClick={copyLink}
              bg="#4079FF"
              color="white"
              width="169px"
              height="48px"
              fontSize="md"
              fontWeight="medium"
              borderRadius="lg"
              _hover={{ 
                bg: '#3668e6',
                transform: 'translateY(-1px)',
                boxShadow: 'md'
              }}
              transition="all 0.2s ease"
            >
              🔗 Copy Link
            </Button>

            <Button
              onClick={saveQRCode}
              bg="white"
              color="blue.500"
              border="1px solid"
              borderColor="#C6C6C6"
              width="169px"
              height="48px"
              fontSize="md"
              fontWeight="medium"
              borderRadius="lg"
              _hover={{ 
                bg: 'blue.50',
                transform: 'translateY(-1px)',
                boxShadow: 'md'
              }}
              transition="all 0.2s ease"
            >
              📱 Save QR code
            </Button>
          </VStack>

          {/* 右侧 - QR Code */}
          <VStack spacing={1} align="center" flex="0 0 auto">
            <Text fontSize="sm" color="gray.700" fontWeight="bold" textAlign="center">
              Scan QR Code
            </Text>
            <Box
              bg="white"
              p="8px"
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.200"
              boxShadow="sm"
              w="220px"
              h="220px"
              display="flex"
              justifyContent="center"
              alignItems="center"
            >
              <QRCodeWithLogo
                value={shareUrl}
                size={204}
                id="qr-code-styled"
              />
            </Box>
          </VStack>
        </HStack>

        {/* 分割线 */}
        <Divider borderColor="gray.200" />

        {/* Share To Social Platforms */}
        <VStack spacing={2} align="stretch" w="100%">
          <Text fontSize="sm" color="gray.700" fontWeight="bold" textAlign={{ base: "center", md: "left" }}>
            Share To
          </Text>
          <HStack spacing={3} align="center" justify="center" w="100%" flexWrap="wrap">
            <Button
              onClick={() => handleShare('twitter')}
              size="md"
              width={{ base: "40px", md: "48px" }}
              height={{ base: "40px", md: "48px" }}
              borderRadius="full"
              bg="white"
              border="none"
              p={1}
              _hover={{ 
                transform: 'scale(1.1)',
                boxShadow: 'xl'
              }}
              transition="all 0.3s ease"
              title="Share on Twitter"
            >
              <img 
                src={TwitterLogo} 
                alt="Twitter" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain' 
                }} 
              />
            </Button>
            <Button
              onClick={() => handleShare('telegram')}
              size="md"
              width={{ base: "40px", md: "48px" }}
              height={{ base: "40px", md: "48px" }}
              borderRadius="full"
              bg="white"
              border="none"
              p={1}
              _hover={{ 
                transform: 'scale(1.1)',
                boxShadow: 'xl'
              }}
              transition="all 0.3s ease"
              title="Share on Telegram"
            >
              <img 
                src={TelegramLogo} 
                alt="Telegram" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain' 
                }} 
              />
            </Button>
            <Button
              onClick={() => handleShare('facebook')}
              size="md"
              width={{ base: "40px", md: "48px" }}
              height={{ base: "40px", md: "48px" }}
              borderRadius="full"
              bg="white"
              border="none"
              p={1}
              _hover={{ 
                transform: 'scale(1.1)',
                boxShadow: 'xl'
              }}
              transition="all 0.3s ease"
              title="Share on Facebook"
            >
              <img 
                src={FacebookLogo} 
                alt="Facebook" 
                style={{ 
                  width: '120%', 
                  height: '120%', 
                  objectFit: 'contain' 
                }} 
              />
            </Button>
            <Button
              onClick={() => handleShare('discord')}
              size="md"
              width={{ base: "40px", md: "48px" }}
              height={{ base: "40px", md: "48px" }}
              borderRadius="full"
              bg="white"
              border="none"
              p={1}
              _hover={{ 
                transform: 'scale(1.1)',
                boxShadow: 'xl'
              }}
              transition="all 0.3s ease"
              title="Share on Discord"
            >
              <img 
                src={DiscordLogo} 
                alt="Discord" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain' 
                }} 
              />
            </Button>
          </HStack>
        </VStack>
      </VStack>
    </Box>
  );
};

export default ShareComponent; 