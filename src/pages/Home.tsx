import React, { useState, useEffect, useRef } from 'react'
import { Box, Flex, Center, Text, Button, HStack, VStack, Spacer, Image, Tab, Tabs, TabList, TabPanel, TabPanels, useToast, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, useDisclosure } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'

export const Home: React.FC = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [currentSection, setCurrentSection] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  // 监听滚动事件来更新当前section
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const scrollTop = containerRef.current.scrollTop
        const scrollHeight = containerRef.current.scrollHeight
        const clientHeight = containerRef.current.clientHeight
        const section = Math.round(scrollTop / clientHeight)
        const currentSection = section > 4 ? 4 : section
        setCurrentSection(currentSection)
      }
    }
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // 滚动到指定section
  const scrollToSection = (sectionIndex: number) => {
    const container = containerRef.current
    if (container) {
      container.scrollTo({
        top: sectionIndex * container.clientHeight,
        behavior: 'smooth'
      })
    }
  }

  // 第一页：原首页内容
  const FirstSection = () => (
    <Box
      minH="100vh"
      bgGradient="linear(to-b, #0a1833, #1a2747)"
      position="relative"
      display="flex"
      flexDirection="column"
    >
      {/* 左上角模式图片与文字 */}
      {/* 头部导航现在由Header组件处理 */}

      {/* 主视觉区 */}
      <Flex
        direction={{ base: 'column', md: 'row' }}
        align="center"
        justify="center"
        flex={1}
        pt="100px"
        px={8}
      >
        {/* 左侧文案 */}
        <VStack align="center" spacing={8} maxW="lg">
          <Text fontSize={{ base: '3xl', md: '4xl' }} fontWeight="bold" color="white" lineHeight="1.2">
            All-in-One <Text as="span" color="yellow.300">Decentralized Infrastructure</Text> for Web3 Projects
          </Text>
          <VStack spacing={4} align="start">
            <Button
              variant="outline"
              color="white"
              borderColor="white"
              borderRadius="full"
              size="lg"
              rightIcon={<span style={{ fontSize: 18 }}>→</span>}
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => navigate('/create?type=redpacket')}
              w="200px"
            >
              Red Packet
            </Button>
            <Button
              variant="outline"
              color="white"
              borderColor="white"
              borderRadius="full"
              size="lg"
              rightIcon={<span style={{ fontSize: 18 }}>→</span>}
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => navigate('/create?type=airdrop')}
              w="200px"
            >
              Airdrop
            </Button>
            <Button
              variant="outline"
              color="white"
              borderColor="white"
              borderRadius="full"
              size="lg"
              rightIcon={<span style={{ fontSize: 18 }}>→</span>}
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => navigate('/launchpad')} //onOpen
              w="200px"
            >
              OneLaunch
            </Button>
          </VStack>
        </VStack>
        {/* 右侧插画 */}
        <Box ml={{ md: 20 }} mt={{ base: 12, md: 0 }} position="relative" w="340px" h="260px" minW="240px" minH="180px">
          {/* 最大的红包（居中） */}
          <Image
            src="/redpacket-parachute.png"
            alt="Red Packet"
            position="absolute"
            left="110px"
            top="0"
            boxSize="120px"
            zIndex={2}
          />
          {/* 左下角红包 */}
          <Image
            src="/redpacket-parachute.png"
            alt="Red Packet"
            position="absolute"
            left="0"
            top="80px"
            boxSize="90px"
            zIndex={1}
          />
          {/* 右下角红包 */}
          <Image
            src="/redpacket-parachute.png"
            alt="Red Packet"
            position="absolute"
            left="200px"
            top="100px"
            boxSize="80px"
            zIndex={1}
          />
        </Box>
      </Flex>

      {/* 底部功能条 */}
      <Box
        bg="rgba(10,24,51,0.95)"
        py={4}
        px={{ base: 4, md: 8 }}
      >
        <Flex
          maxW="1200px"
          mx="auto"
          direction="row"
          align="center"
          justify="space-between"
          color="whiteAlpha.800"
          fontSize={{ base: 'xs', md: 'sm' }}
          letterSpacing="0.5px"
          gap={{ base: 2, md: 6 }}
        >
          {/* 第一个特性 */}
          <Flex
            align="center"
            flex={1}
            justify="center"
          >
            <Box
              w={{ base: '24px', md: '28px' }}
              h={{ base: '24px', md: '28px' }}
              borderRadius="full"
              bg="yellow.400"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mr={{ base: 2, md: 3 }}
              fontSize={{ base: 'sm', md: 'md' }}
            >
              🌟
            </Box>
            <Box textAlign="left">
              <Text
                fontWeight="semibold"
                color="white"
                fontSize={{ base: 'xs', md: 'sm' }}
                lineHeight="1.2"
              >
                Super fast user acquisition
              </Text>
            </Box>
          </Flex>

          {/* 第二个特性 */}
          <Flex
            align="center"
            flex={1}
            justify="center"
          >
            <Box
              w={{ base: '24px', md: '28px' }}
              h={{ base: '24px', md: '28px' }}
              borderRadius="full"
              bg="blue.400"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mr={{ base: 2, md: 3 }}
              fontSize={{ base: 'sm', md: 'md' }}
            >
              ✈️
            </Box>
            <Box textAlign="left">
              <Text
                fontWeight="semibold"
                color="white"
                fontSize={{ base: 'xs', md: 'sm' }}
                lineHeight="1.2"
              >
                Airdrop to 100k users costs just 0.01 SOL
              </Text>
            </Box>
          </Flex>

          {/* 第三个特性 */}
          <Flex
            align="center"
            flex={1}
            justify="center"
          >
            <Box
              w={{ base: '24px', md: '28px' }}
              h={{ base: '24px', md: '28px' }}
              borderRadius="full"
              bg="green.400"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mr={{ base: 2, md: 3 }}
              fontSize={{ base: 'sm', md: 'md' }}
            >
              ⚡
            </Box>
            <Box textAlign="left">
              <Text
                fontWeight="semibold"
                color="white"
                fontSize={{ base: 'xs', md: 'sm' }}
                lineHeight="1.2"
              >
                One-click lightning-fast cold start
              </Text>
            </Box>
          </Flex>
        </Flex>
      </Box>
    </Box>
  )

  // 第二页：价格对比页面
  const PriceComparisonSection = () => (
    <Box
      minH="100vh"
      bgGradient="linear(to-b, #0a1833, #1a2747)"
      position="relative"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Flex
        direction="column"
        align="center"
        justify="center"
        minH="100vh"
        px={8}
        py={20}
      >
        {/* 标题 */}
        <Text
          fontSize={{ base: '2xl', md: '3xl', lg: '4xl' }}
          fontWeight="bold"
          color="white"
          mb={16}
          textAlign="center"
          maxW="800px"
        >
          Estimated cost for handling 100,000 addresses
        </Text>

        {/* 价格对比卡片 */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          gap={12}
          mb={16}
          maxW="900px"
          w="full"
        >
          {/* Traditional Method */}
          <Box
            bg="rgba(15, 25, 45, 0.9)"
            borderRadius="2xl"
            p={12}
            flex={1}
            textAlign="center"
            border="2px solid rgba(255, 100, 100, 0.3)"
            boxShadow="0 8px 32px rgba(255, 100, 100, 0.1)"
            _hover={{
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(255, 100, 100, 0.2)'
            }}
            transition="all 0.3s ease"
          >
            <Text fontSize="xl" color="red.300" mb={6} fontWeight="semibold">
              Traditional Method
            </Text>
            <Flex align="center" justify="center" mb={2}>
              <Text fontSize="5xl" fontWeight="bold" color="red.400">
                $10000
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="red.300" ml={2}>
                +
              </Text>
            </Flex>
          </Box>

          {/* AIDR Protocol */}
          <Box
            bg="rgba(15, 25, 45, 0.9)"
            borderRadius="2xl"
            p={12}
            flex={1}
            textAlign="center"
            border="2px solid rgba(100, 255, 150, 0.3)"
            boxShadow="0 8px 32px rgba(100, 255, 150, 0.1)"
            _hover={{
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(100, 255, 150, 0.2)'
            }}
            transition="all 0.3s ease"
          >
            <Text fontSize="xl" color="green.300" mb={6} fontWeight="semibold">
              AIDR Protocol
            </Text>
            <Text fontSize="5xl" fontWeight="bold" color="green.400">
              $1
            </Text>
          </Box>
        </Flex>

        {/* 节省说明 */}
        <Text
          fontSize={{ base: 'xl', md: '2xl' }}
          fontWeight="bold"
          color="white"
          mb={12}
          textAlign="center"
        >
          Same work, 99.99% cheaper
        </Text>

        {/* Learn More 按钮 */}
        <Button
          variant="outline"
          color="teal.300"
          borderColor="teal.300"
          borderRadius="full"
          size="lg"
          px={8}
          py={6}
          fontSize="lg"
          _hover={{
            bg: 'teal.900',
            borderColor: 'teal.200',
            transform: 'scale(1.05)'
          }}
          transition="all 0.3s ease"
          leftIcon={<span style={{ fontSize: '20px' }}>📚</span>}
          rightIcon={<span style={{ fontSize: '20px' }}>📚</span>}
        >
          Learn How AIDR Works
        </Button>
      </Flex>
    </Box>
  )

  // 第三页：红包类型展示页面
  const RedPacketTypesSection = () => {
    const [activeTab, setActiveTab] = useState(0)

    return (
      <Box
        minH="100vh"
        bgGradient="linear(to-b, #0a1833, #1a2747)"
        position="relative"
        display="flex"
        alignItems="center"
        justifyContent="center"
        py={20}
      >
        <Flex
          direction="column"
          align="center"
          justify="center"
          minH="100vh"
          px={{ base: 6, md: 8 }}
          maxW="1200px"
          w="full"
          py={{ base: 10, md: 20 }}
        >
          {/* 标题 */}
          <Text
            fontSize={{ base: '2xl', md: '3xl', lg: '4xl' }}
            fontWeight="bold"
            color="white"
            mb={{ base: 10, md: 12 }}
            textAlign="center"
            px={{ base: 4, md: 0 }}
          >
            Getting Started with AIDR
          </Text>

          {/* 主要内容区域 */}
          <Flex
            direction={{ base: 'column', lg: 'row' }}
            gap={{ base: 8, md: 10, lg: 12 }}
            w="full"
            align="center"
            justify="center"
          >
            {/* 左侧Tab区域 */}
            <Box flex={1} maxW={{ base: "100%", md: "600px" }} w="full">
              <Tabs
                index={activeTab}
                onChange={setActiveTab}
                variant="soft-rounded"
                colorScheme="blue"
              >
                {/* Tab列表 */}
                <TabList
                  bg="rgba(255, 255, 255, 0.1)"
                  borderRadius="full"
                  p={{ base: 2, md: 2 }}
                  mb={{ base: 6, md: 8 }}
                  justifyContent="center"
                  flexWrap={{ base: "wrap", md: "nowrap" }}
                  gap={{ base: 2, md: 0 }}
                >
                  <Tab
                    color="whiteAlpha.700"
                    _selected={{
                      color: 'white',
                      bg: 'rgba(100, 150, 255, 0.8)',
                      fontWeight: 'bold'
                    }}
                    borderRadius="full"
                    px={{ base: 4, md: 6 }}
                    py={{ base: 3, md: 3 }}
                    fontSize={{ base: "sm", md: "sm" }}
                    transition="all 0.3s ease"
                    minW={{ base: "auto", md: "auto" }}
                  >
                    Giveaway Red Packet
                  </Tab>
                  <Tab
                    color="whiteAlpha.700"
                    _selected={{
                      color: 'white',
                      bg: 'rgba(100, 150, 255, 0.8)',
                      fontWeight: 'bold'
                    }}
                    borderRadius="full"
                    px={{ base: 4, md: 6 }}
                    py={{ base: 3, md: 3 }}
                    fontSize={{ base: "sm", md: "sm" }}
                    transition="all 0.3s ease"
                    minW={{ base: "auto", md: "auto" }}
                  >
                    Airdrop Red Packet
                  </Tab>
                  <Tab
                    color="whiteAlpha.700"
                    _selected={{
                      color: 'white',
                      bg: 'rgba(100, 150, 255, 0.8)',
                      fontWeight: 'bold'
                    }}
                    borderRadius="full"
                    px={{ base: 4, md: 6 }}
                    py={{ base: 3, md: 3 }}
                    fontSize={{ base: "sm", md: "sm" }}
                    transition="all 0.3s ease"
                    minW={{ base: "auto", md: "auto" }}
                  >
                    Launchpad
                  </Tab>
                </TabList>

                {/* Tab内容面板 */}
                <TabPanels>
                  {/* Giveaway Red Packet */}
                  <TabPanel p={0}>
                    <Box
                      bg="rgba(255, 255, 255, 0.95)"
                      borderRadius="xl"
                      overflow="hidden"
                      boxShadow="0 8px 32px rgba(0, 0, 0, 0.3)"
                      position="relative"
                    >
                      <Image
                        src="/images/createredpacket.gif"
                        alt="Create Red Packet Flow"
                        w="100%"
                        h={{ base: "300px", md: "350px", lg: "400px" }}
                        objectFit="cover"
                        objectPosition="center"
                      />
                    </Box>
                  </TabPanel>

                  {/* Airdrop Red Packet */}
                  <TabPanel p={0}>
                    <Box
                      bg="rgba(255, 255, 255, 0.95)"
                      borderRadius="xl"
                      overflow="hidden"
                      boxShadow="0 8px 32px rgba(0, 0, 0, 0.3)"
                      position="relative"
                    >
                      <Image
                        src="/images/createairdrop.gif"
                        alt="Create Airdrop Flow"
                        w="100%"
                        h={{ base: "300px", md: "350px", lg: "400px" }}
                        objectFit="cover"
                        objectPosition="center"
                      />
                    </Box>
                  </TabPanel>

                  {/* Launchpad */}
                  <TabPanel p={0}>
                    <Box
                      bg="rgba(255, 255, 255, 0.1)"
                      backdropFilter="blur(15px)"
                      borderRadius="xl"
                      p={{ base: 6, md: 8 }}
                      boxShadow="0 8px 32px rgba(0, 0, 0, 0.3)"
                      border="1px solid rgba(255, 255, 255, 0.2)"
                      textAlign="center"
                      h={{ base: "300px", md: "350px", lg: "400px" }}
                      display="flex"
                      flexDirection="column"
                      justifyContent="center"
                      alignItems="center"
                      cursor="pointer"
                      transition="all 0.3s ease"
                      _hover={{
                        transform: 'scale(1.02)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
                      }}
                      onClick={() => navigate('/launchpad')}
                    >
                      <Text
                        fontSize={{ base: '4xl', md: '5xl' }}
                        mb={4}
                        role="img"
                        aria-label="rocket"
                      >
                        🚀
                      </Text>
                      <Text
                        fontSize={{ base: 'xl', md: '2xl' }}
                        fontWeight="bold"
                        color="white"
                        mb={3}
                      >
                        Token Launchpad
                      </Text>
                      <Text
                        fontSize={{ base: 'sm', md: 'md' }}
                        color="whiteAlpha.800"
                        lineHeight="1.6"
                        maxW="300px"
                        mb={4}
                      >
                        Launch your own token with our easy-to-use launchpad. Set metadata, target amount, and community links.
                      </Text>
                      <Button
                        colorScheme="blue"
                        size="md"
                        bg="rgba(100, 150, 255, 0.8)"
                        _hover={{ bg: "rgba(100, 150, 255, 1)" }}
                        backdropFilter="blur(10px)"
                        border="1px solid rgba(255, 255, 255, 0.2)"
                      >
                        Launch Token
                      </Button>
                    </Box>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>

            {/* 右侧特性展示 */}
            <VStack
              spacing={{ base: 6, md: 6 }}
              flex={1}
              align="start"
              maxW={{ base: "100%", lg: "400px" }}
              w="full"
              mt={{ base: 4, lg: 0 }}
            >
              <Box>
                <HStack spacing={{ base: 2, md: 3 }} mb={{ base: 1, md: 2 }}>
                  <Text fontSize={{ base: "md", md: "lg" }}>⭐</Text>
                  <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color="white">
                    Very low cost per address
                  </Text>
                </HStack>
                <Text fontSize={{ base: "sm", md: "md" }} color="green.300" fontWeight="bold" ml={{ base: 6, md: 8 }}>
                  just $0.0001
                </Text>
              </Box>

              <Box>
                <HStack spacing={{ base: 2, md: 3 }} mb={{ base: 1, md: 2 }}>
                  <Text fontSize={{ base: "md", md: "lg" }}>⭐</Text>
                  <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color="white">
                    Supports multi-format import
                  </Text>
                </HStack>
                <Text fontSize={{ base: "sm", md: "md" }} color="green.300" fontWeight="bold" ml={{ base: 6, md: 8 }}>
                  CSV and Merkle Tree
                </Text>
              </Box>

              <Box>
                <HStack spacing={{ base: 2, md: 3 }} mb={{ base: 1, md: 2 }}>
                  <Text fontSize={{ base: "md", md: "lg" }}>⭐</Text>
                  <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color="white">
                    Anti-sybil system that cuts
                  </Text>
                </HStack>
                <Text fontSize={{ base: "sm", md: "md" }} color="green.300" fontWeight="bold" ml={{ base: 6, md: 8 }}>
                  90% of invalid spending
                </Text>
              </Box>
            </VStack>
          </Flex>
        </Flex>
      </Box>
    )
  }

  // 第四页：如何领取页面
  const HowToClaimSection = () => {
    const [activeTab, setActiveTab] = useState(0)

    return (
      <Box
        minH="100vh"
        bgGradient="linear(to-b, #0a1833, #1a2747)"
        position="relative"
        display="flex"
        alignItems="center"
        justifyContent="center"
        py={20}
      >
        <Flex
          direction="column"
          align="center"
          justify="center"
          minH="100vh"
          px={{ base: 6, md: 8 }}
          maxW="1200px"
          w="full"
          py={{ base: 10, md: 20 }}
        >
          {/* 标题 */}
          <Text
            fontSize={{ base: '2xl', md: '3xl', lg: '4xl' }}
            fontWeight="bold"
            color="white"
            mb={{ base: 10, md: 12 }}
            textAlign="center"
            px={{ base: 4, md: 0 }}
          >
            How to Claim
          </Text>

          {/* 选项卡 */}
          <Flex
            direction="row"
            bg="rgba(255, 255, 255, 0.1)"
            borderRadius="full"
            p={{ base: 2, md: 2 }}
            mb={{ base: 6, md: 8 }}
            justifyContent="center"
            gap={{ base: 2, md: 0 }}
          >
            <Box
              as="button"
              onClick={() => setActiveTab(0)}
              bg={activeTab === 0 ? 'rgba(167, 139, 255, 0.8)' : 'transparent'}
              color={activeTab === 0 ? 'white' : 'whiteAlpha.700'}
              fontWeight={activeTab === 0 ? 'bold' : 'normal'}
              borderRadius="full"
              px={{ base: 6, md: 8 }}
              py={{ base: 3, md: 3 }}
              fontSize={{ base: "sm", md: "md" }}
              transition="all 0.3s ease"
              minW={{ base: "auto", md: "200px" }}
              _hover={{ bg: activeTab === 0 ? 'rgba(167, 139, 255, 0.9)' : 'rgba(255, 255, 255, 0.1)' }}
            >
              Red Packet and AirDrop
            </Box>
            <Box
              as="button"
              onClick={() => setActiveTab(1)}
              bg={activeTab === 1 ? 'rgba(167, 139, 255, 0.8)' : 'transparent'}
              color={activeTab === 1 ? 'white' : 'whiteAlpha.700'}
              fontWeight={activeTab === 1 ? 'bold' : 'normal'}
              borderRadius="full"
              px={{ base: 6, md: 8 }}
              py={{ base: 3, md: 3 }}
              fontSize={{ base: "sm", md: "md" }}
              transition="all 0.3s ease"
              minW={{ base: "auto", md: "160px" }}
              _hover={{ bg: activeTab === 1 ? 'rgba(167, 139, 255, 0.9)' : 'rgba(255, 255, 255, 0.1)' }}
            >
              OneLaunch
            </Box>
          </Flex>

          {/* 主要内容区域 */}
          <Flex
            direction={{ base: 'column', lg: 'row' }}
            gap={{ base: 8, md: 10, lg: 12 }}
            w="full"
            align="center"
            justify="center"
          >
            {/* 左侧内容展示区域 */}
            <Box flex={1} maxW={{ base: "100%", md: "600px" }} w="full">
              <Box
                bg="rgba(255, 255, 255, 0.95)"
                borderRadius="xl"
                overflow="hidden"
                boxShadow="0 8px 32px rgba(0, 0, 0, 0.3)"
                position="relative"
                h={{ base: "300px", md: "350px", lg: "400px" }}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {activeTab === 0 ? (
                  <Image
                    src="/images/claimredpacket.gif"
                    alt="Claim Red Packet Flow"
                    w="100%"
                    h="100%"
                    objectFit="cover"
                    objectPosition="center"
                  />
                ) : (
                  <VStack spacing={6} p={8} color="black" textAlign="center">
                    <Text fontSize="2xl" fontWeight="bold">
                      🚀 OneLaunch
                    </Text>
                    <Text fontSize="md" color="gray.600">
                      Revolutionary Token Launch Platform
                    </Text>
                    <Box
                      bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      p={6}
                      borderRadius="xl"
                      w="full"
                      textAlign="center"
                      color="white"
                      boxShadow="lg"
                    >
                      <VStack spacing={3}>
                        <Text fontSize="xl" fontWeight="bold">
                          Coming Soon
                        </Text>
                        <Text fontSize="sm" opacity={0.9}>
                          Feature under development, stay tuned!
                        </Text>
                        <Text fontSize="xs" opacity={0.7}>
                          We're working hard to bring you a better experience
                        </Text>
                      </VStack>
                    </Box>
                  </VStack>
                )}
              </Box>
            </Box>

            {/* 右侧步骤说明 */}
            <VStack
              spacing={8}
              align="start"
              flex={1}
              maxW={{ base: "100%", md: "400px" }}
              w="full"
            >
              {/* 步骤 1 */}
              <HStack spacing={4} align="center">
                <Text fontSize="2xl" color="yellow.300">⭐</Text>
                <Text
                  fontSize={{ base: "lg", md: "xl" }}
                  fontWeight="bold"
                  color="white"
                >
                  Open the link
                </Text>
              </HStack>

              {/* 步骤 2 */}
              <HStack spacing={4} align="center">
                <Text fontSize="2xl" color="yellow.300">⭐</Text>
                <Text
                  fontSize={{ base: "lg", md: "xl" }}
                  fontWeight="bold"
                  color="white"
                >
                  Click to claim
                </Text>
              </HStack>
            </VStack>
          </Flex>
        </Flex>
      </Box>
    )
  }

  // 第五页：独特优势页面
  const UniqueAdvantagesSection = () => (
    <Box
      minH="100vh"
      bgGradient="linear(to-b, #0a1833, #1a2747)"
      position="relative"
      display="flex"
      flexDirection="column"
    >
      {/* 主要内容区域 */}
      <Flex
        direction="column"
        align="center"
        justify="center"
        flex={1}
        px={8}
        py={20}
      >
        {/* 标题 */}
        <Text
          fontSize={{ base: '2xl', md: '3xl', lg: '4xl' }}
          fontWeight="bold"
          color="white"
          mb={16}
          textAlign="center"
        >
          Unique advantages
        </Text>

        {/* 三个特色卡片 */}
        <Flex
          direction={{ base: 'column', lg: 'row' }}
          gap={8}
          maxW="1200px"
          w="full"
          mb={16}
        >
          {/* 第一个卡片 */}
          <Box
            borderRadius="xl"
            _hover={{
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(100, 80, 150, 0.3)'
            }}
            transition="all 0.3s ease"
          >
            <Image
              src="/images/card01.png"
              alt="Card 01"
              borderRadius="xl"
              w="auto"
              h="auto"
              maxW="100%"
              objectFit="contain"
            />
          </Box>

          {/* 第二个卡片 */}
          <Box
            borderRadius="xl"
            _hover={{
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(100, 80, 150, 0.3)'
            }}
            transition="all 0.3s ease"
          >
            <Image
              src="/images/card02.png"
              alt="Card 02"
              borderRadius="xl"
              w="auto"
              h="auto"
              maxW="100%"
              objectFit="contain"
            />
          </Box>

          {/* 第三个卡片 */}
          <Box
            borderRadius="xl"
            _hover={{
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(100, 80, 150, 0.3)'
            }}
            transition="all 0.3s ease"
          >
            <Image
              src="/images/card03.png"
              alt="Card 03"
              borderRadius="xl"
              w="auto"
              h="auto"
              maxW="100%"
              objectFit="contain"
            />
          </Box>
        </Flex>
      </Flex>

      {/* 底部区域 */}
      <Box
        bg="rgba(0, 0, 0, 0.9)"
        py={8}
        px={8}
      >
        <Flex
          maxW="1200px"
          mx="auto"
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          align={{ base: 'start', md: 'center' }}
          gap={8}
        >
          {/* 左侧 - AIDR Logo 和版权信息 */}
          <VStack align="start" spacing={3}>
            <Text fontSize="2xl" fontWeight="bold" color="white" letterSpacing="2px">
              AIDR
            </Text>
            <Text fontSize="xs" color="whiteAlpha.600" maxW="300px">
              Copyright © 2025 AIDR Corporation. Except for the "AIDR" trademark, AIDR website, and ownership rights of any kind to the other trademarks appearing on this website. Such trademarks belong to their respective owners.
            </Text>
          </VStack>

          {/* 中间 - Join Community */}
          <VStack align="start" spacing={3}>
            <Text fontSize="sm" fontWeight="bold" color="white">
              Join Community
            </Text>
            <HStack spacing={4}>
              {/* X (Twitter) */}
              <Box
                as="button"
                w="8"
                h="8"
                bg="whiteAlpha.200"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
                _hover={{ bg: '#000000', transform: 'scale(1.1)' }}
                transition="all 0.3s ease"
                onClick={() => window.open('https://x.com/AIDR_protocal', '_blank')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </Box>

              {/* Telegram */}
              <Box
                as="button"
                w="8"
                h="8"
                bg="whiteAlpha.200"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
                _hover={{ bg: '#0088cc', transform: 'scale(1.1)' }}
                transition="all 0.3s ease"
                onClick={() => window.open('https://t.me/AidrProtocal', '_blank')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.787L24 5.08c.311-1.241-.446-1.82-1.335-1.363z" />
                </svg>
              </Box>

              {/* Discord */}
              <Box
                as="button"
                w="8"
                h="8"
                bg="whiteAlpha.200"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
                _hover={{ bg: '#7289DA', transform: 'scale(1.1)' }}
                transition="all 0.3s ease"
                onClick={() => window.open('https://discord.gg/4CqhvrJP7x', '_blank')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </Box>
            </HStack>
          </VStack>

          {/* 最右侧 - 联系我们 */}
          <VStack align="start" spacing={3}>
            <Text fontSize="sm" fontWeight="bold" color="white">
              CONTACT US
            </Text>
            <Text fontSize="xs" color="whiteAlpha.600">
              Get support and updates
            </Text>
          </VStack>
        </Flex>

        {/* 底部分割线和额外信息 */}
        <Box
          borderTop="1px solid"
          borderColor="whiteAlpha.200"
          mt={8}
          pt={4}
          textAlign="center"
        >
          <Text fontSize="xs" color="whiteAlpha.500">
            Powered by Solana • Built for the future of digital gifts
          </Text>
        </Box>
      </Box>


    </Box>
  )

  return (
    <Box
      ref={containerRef}
      css={{
        scrollBehavior: 'smooth',
        scrollSnapType: 'y mandatory',
        height: '100vh',
        overflowY: 'scroll',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* 导航点 */}
      <Box
        position="fixed"
        right="20px"
        top="50%"
        transform="translateY(-50%)"
        zIndex={20}
        display="flex"
        flexDirection="column"
        gap={3}
      >
        {[0, 1, 2, 3, 4].map((index) => (
          <Box
            key={index}
            w="12px"
            h="12px"
            borderRadius="50%"
            bg={currentSection === index ? 'white' : 'whiteAlpha.400'}
            cursor="pointer"
            onClick={() => scrollToSection(index)}
            transition="all 0.3s ease"
            _hover={{ bg: 'white', transform: 'scale(1.2)' }}
          />
        ))}
      </Box>

      {/* 页面内容 */}
      <Box
        css={{
          overflowY: 'hidden',
          '&::-webkit-scrollbar': {
            display: 'none' // Chrome, Safari, Edge
          },
          '& > div': {
            scrollSnapAlign: 'start',
            scrollSnapStop: 'always'
          }
        }}
      >
        <FirstSection />
        <PriceComparisonSection />
        <RedPacketTypesSection />
        <HowToClaimSection />
        <UniqueAdvantagesSection />
      </Box>

      {/* Coming Soon Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent
          bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          color="white"
          borderRadius="xl"
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          mx={4}
        >
          <ModalHeader
            fontSize="2xl"
            fontWeight="bold"
            textAlign="center"
            pb={2}
          >
            🚀 OneLaunch
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody textAlign="center" py={6}>
            <VStack spacing={4}>
              <Text fontSize="lg" fontWeight="semibold">
                Revolutionary Token Launch Platform
              </Text>
              <Box
                bg="rgba(255, 255, 255, 0.1)"
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="whiteAlpha.200"
              >
                <Text fontSize="md" opacity={0.9} fontWeight="semibold">
                  Coming Soon
                </Text>
                <Text fontSize="sm" opacity={0.7} mt={2}>
                  Feature under development, stay tuned!
                </Text>
              </Box>
              <Text fontSize="sm" opacity={0.7}>
                We're working hard to bring you a better experience
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter justifyContent="center">
            <Button
              colorScheme="whiteAlpha"
              variant="solid"
              onClick={onClose}
              size="lg"
              bg="whiteAlpha.200"
              _hover={{ bg: "whiteAlpha.300" }}
              color="white"
              fontWeight="bold"
            >
              Got it
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
} 