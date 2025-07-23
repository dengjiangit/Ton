import React, { useState, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Spinner,
  useToast,
  Badge,
  Divider,
  Checkbox,
  Link,
  Image,
  SimpleGrid,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Flex,
  Container,
  useBreakpointValue,
  Card,
  CardBody,
  ButtonGroup,
  IconButton,
  CheckboxGroup,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverCloseButton,
  PopoverFooter,
  useDisclosure,
  RadioGroup,
  Radio,
} from '@chakra-ui/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { Connection, PublicKey } from '@solana/web3.js'
import { RPC_ENDPOINT, buildApiUrl, LAUNCHPAD_CrowdFunding_PROGRAM_ID } from '../config/constants'
import { CrowdfundingContract } from '../utils/crowdfundingContract'
import ShareComponent from '../components/ShareComponent'
import { IPFSService } from '../services/ipfsService'

// 众筹参与选项类型
interface CrowdfundingOption {
  id: string
  title: string
  description: string
  amount: number
  buttonText: string
  buttonColor: string
  isAirdropOnly?: boolean
}

// 众筹信息接口
interface CrowdfundingInfo {
  projectName: string
  tokenSymbol: string
  description: string
  fundingGoal: number
  currentAmount: number
  endTime: number
  participantCount: number
  creator: string
  mintAddress: string
  projectId: bigint
}

// IPFS众筹数据接口
interface IPFSCrowdfundingData {
  mintAddress: string
  creator: string
  timestamp: number
  tokenName: string
  tokenSymbol: string
  totalSupply: string
  projectBlurb: string
  targetAmount: string
  communityLinks: {
    twitterUrl: string
    telegramUrl: string
    discordUrl: string
  }
  transactionHash: string
  metadata: {
    type: 'crowdfunding'
    version: '1.0'
    description: 'Crowdfunding launchpad data'
  }
}

// 我的领取记录接口
interface MyClaimRecord {
  transaction: string
  slot: number
  contract_address: string
  type: number // 0是claim领取空投 1是support支持众筹
  user: string
  red_packet: string
  amount: number
  timestamp: number
  created_at: string
  updated_at: string
  token_name: string
  token_symbol: string
  mint: string
}

// 我的领取记录响应接口
interface MyClaimRecordsResponse {
  data: MyClaimRecord[]
  message: string
  success: boolean
  total: number
}

export const ClaimLaunchpad: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('solana')
  const toast = useToast()

  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [crowdfundingInfo, setCrowdfundingInfo] = useState<CrowdfundingInfo | null>(null)
  const [availableOptions, setAvailableOptions] = useState<string[]>(['small', 'large', 'airdrop'])
  const [isSuccess, setIsSuccess] = useState(false)
  const [successType, setSuccessType] = useState<'crowdfunding' | 'airdrop'>('crowdfunding')
  const [transactionSignature, setTransactionSignature] = useState<string>('')
  const [ipfsCrowdfundingData, setIpfsCrowdfundingData] = useState<IPFSCrowdfundingData | null>(null)
  const [loadingIPFS, setLoadingIPFS] = useState(false)
  const [referralInfo, setReferralInfo] = useState<{
    referralCount: number
    eligibleRewards: number
    rewardsClaimed: number
  } | null>(null)
  const [loadingReferralInfo, setLoadingReferralInfo] = useState(false)
  const [claimingReferralReward, setClaimingReferralReward] = useState(false)
  const [currentProjectId, setCurrentProjectId] = useState<bigint | null>(null)
  const [claimedAmount, setClaimedAmount] = useState<string>('')
  const [loadingClaimedAmount, setLoadingClaimedAmount] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // 我的领取记录相关状态
  const [showMyClaims, setShowMyClaims] = useState(false)
  const [myClaimRecords, setMyClaimRecords] = useState<MyClaimRecord[]>([])
  const [loadingMyClaims, setLoadingMyClaims] = useState(false)
  const [myClaimsPage, setMyClaimsPage] = useState(1)
  const [myClaimsTotal, setMyClaimsTotal] = useState(0)

  // 从 URL 参数获取信息
  const creatorAddress = searchParams.get('creator')
  const mintAddress = searchParams.get('mint')
  const ipfsCID = searchParams.get('ipfsCID')
  const referrerAddress = searchParams.get('referrer') // 推荐人地址
  const projectIdParam = searchParams.get('projectId') // 项目ID

  // IPFS服务实例
  const ipfsService = new IPFSService()

  // 创建合约实例
  const connection = new Connection(RPC_ENDPOINT)
  const crowdfundingContract = new CrowdfundingContract(connection)

  // 获取项目ID
  const getProjectId = async (): Promise<bigint> => {
    if (!creatorAddress) {
      throw new Error('创建者地址不能为空')
    }

    // 如果已经获取过，直接返回
    if (currentProjectId !== null) {
      return currentProjectId
    }

    // 1. 如果URL有projectId参数，先验证其有效性
    if (projectIdParam) {
      const urlProjectId = BigInt(projectIdParam)
      try {
        const creatorPubkey = new PublicKey(creatorAddress)
        // 尝试获取该项目信息，验证是否存在
        await crowdfundingContract.getRedPacketInfo(creatorPubkey, urlProjectId)
        console.log('✅ URL中的projectId有效:', urlProjectId.toString())
        setCurrentProjectId(urlProjectId)
        return urlProjectId
      } catch (error) {
        console.warn('⚠️ URL中的projectId无效，尝试从链上获取:', error)
      }
    }

    // 2. 从链上获取最新的projectId
    try {
      const creatorPubkey = new PublicKey(creatorAddress)

      // 方法1: 尝试从0开始查找存在的项目
      for (let i = 0; i < 10; i++) { // 最多查找10个项目
        try {
          const testProjectId = BigInt(i)
          await crowdfundingContract.getRedPacketInfo(creatorPubkey, testProjectId)
          console.log('✅ 找到有效的projectId:', testProjectId.toString())
          setCurrentProjectId(testProjectId)
          return testProjectId
        } catch (error) {
          // 项目不存在，继续查找下一个
          continue
        }
      }

      // 方法2: 如果找不到，尝试获取创建者状态
      // 注意：这里需要实现getCreatorState方法
      console.warn('⚠️ 无法找到有效的项目，使用默认值0')
      const defaultProjectId = BigInt(0)
      setCurrentProjectId(defaultProjectId)
      return defaultProjectId

    } catch (error) {
      console.error('❌ 获取projectId失败:', error)
      throw new Error('无法获取有效的项目ID')
    }
  }

  // 众筹参与选项
  const crowdfundingOptions: CrowdfundingOption[] = [
    {
      id: 'small',
      title: '小额支持',
      description: '参与 0.05 SOL 众筹 + 代币奖励 + 一次性空投',
      amount: 0.05,
      buttonText: 'Commit 0.05 SOL',
      buttonColor: 'blue.500',
    },
    {
      id: 'large',
      title: '大额支持',
      description: '参与 0.5 SOL 众筹 + 代币奖励 + 一次性空投',
      amount: 0.5,
      buttonText: 'Commit 0.5 SOL',
      buttonColor: 'blue.500',
    },
    {
      id: 'airdrop',
      title: '仅空投',
      description: '无需承诺，仅领取一次性空投',
      amount: 0,
      buttonText: 'Airdrop only',
      buttonColor: 'gray.500',
      isAirdropOnly: true,
    },
  ]

  // 检查可用选项
  const checkAvailableOptions = async () => {
    if (!creatorAddress || !isConnected) return

    try {
      const creatorPubkey = new PublicKey(creatorAddress)
      const projectId = await getProjectId()
      const redPacketInfo = await crowdfundingContract.getRedPacketInfo(creatorPubkey, projectId)

      const remainingGoal = redPacketInfo.fundingGoal - redPacketInfo.currentAmount
      console.log('剩余众筹目标:', remainingGoal / 1e9, 'SOL')

      // 如果剩余目标 < 0.5 SOL，只允许小额支持
      if (remainingGoal < 500_000_000) {
        setAvailableOptions(['small', 'airdrop'])
      } else {
        setAvailableOptions(['small', 'large', 'airdrop'])
      }
    } catch (error) {
      console.error('检查可用选项失败:', error)
      setAvailableOptions(['small', 'large', 'airdrop'])
    }
  }

  // 从IPFS加载众筹数据
  const loadCrowdfundingDataFromIPFS = async () => {
    if (!ipfsCID) {
      console.log('没有IPFS CID，跳过数据加载')
      return
    }

    setLoadingIPFS(true)
    try {
      console.log('📥 从IPFS加载众筹数据:', ipfsCID)

      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsCID}`)
      if (!response.ok) {
        throw new Error(`IPFS请求失败: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ IPFS众筹数据加载成功:', data)

      setIpfsCrowdfundingData(data)

      // 如果成功加载到IPFS数据，更新众筹信息
      if (data) {
        setCrowdfundingInfo({
          projectName: data.tokenName,
          tokenSymbol: data.tokenSymbol,
          description: data.projectBlurb,
          fundingGoal: parseFloat(data.targetAmount) * 1e9, // 转换为lamports
          currentAmount: 0, // 从链上获取
          endTime: data.timestamp + (14 * 24 * 60 * 60 * 1000), // 14天后
          participantCount: 0, // 从链上获取
          creator: data.creator,
          mintAddress: data.mintAddress,
          projectId: await getProjectId()
        })
      }

      toast({
        title: '众筹数据加载成功',
        description: `已从IPFS加载 ${data.tokenName} 项目信息`,
        status: 'success',
        duration: 3000,
      })
    } catch (error) {
      console.error('❌ 从IPFS加载众筹数据失败:', error)
      toast({
        title: '数据加载失败',
        description: '无法从IPFS加载众筹数据，将使用链上数据',
        status: 'warning',
        duration: 3000,
      })
    } finally {
      setLoadingIPFS(false)
    }
  }

  // 获取推荐人信息
  const loadReferralInfo = async () => {
    if (!creatorAddress || !isConnected || !address) return

    setLoadingReferralInfo(true)
    try {
      const creatorPubkey = new PublicKey(creatorAddress)
      const userPubkey = new PublicKey(address)
      const projectId = await getProjectId()

      const userState = await crowdfundingContract.getUserState(creatorPubkey, projectId, userPubkey)

      if (userState.exists) {
        setReferralInfo({
          referralCount: userState.referralCount || 0,
          eligibleRewards: userState.eligibleRewards || 0,
          rewardsClaimed: userState.rewardsClaimed || 0
        })
      } else {
        setReferralInfo({
          referralCount: 0,
          eligibleRewards: 0,
          rewardsClaimed: 0
        })
      }
    } catch (error) {
      console.error('获取推荐人信息失败:', error)
      setReferralInfo(null)
    } finally {
      setLoadingReferralInfo(false)
    }
  }

  // 查询用户收到的代币金额
  const loadClaimedAmount = async () => {
    if (!creatorAddress || !isConnected || !address || !mintAddress) {
      console.log('❌ 缺少必要参数，跳过查询')
      setLoadingClaimedAmount(false)
      return
    }

    setLoadingClaimedAmount(true)
    try {
      const creatorPubkey = new PublicKey(creatorAddress)
      const userPubkey = new PublicKey(address)
      const mintPubkey = new PublicKey(mintAddress)
      const projectId = await getProjectId()

      console.log('🔍 查询用户收到的代币金额...')
      console.log('用户地址:', address)
      console.log('代币地址:', mintAddress)
      console.log('项目ID:', projectId.toString())

      // 获取用户状态（空投相关）
      const userState = await crowdfundingContract.getUserState(creatorPubkey, projectId, userPubkey)
      console.log('🔍 用户状态:', userState)

      let totalClaimed = BigInt(0)

      // 只有领取空投才显示代币金额
      if (userState.exists && userState.airdropClaimed) {
        console.log('🎯 用户已领取空投，开始计算金额...')
        // 从众筹信息中获取空投金额
        try {
          const redPacketInfo = await crowdfundingContract.getRedPacketInfo(creatorPubkey, projectId)
          console.log('🔍 众筹红包信息:', redPacketInfo)
          console.log('🔍 分配方案:', redPacketInfo.allocations)

          // 从分配方案中找到空投分配
          const airdropAllocation = redPacketInfo.allocations?.find((alloc: any) => alloc.name === 'airdrop')
          console.log('🔍 找到的空投分配:', airdropAllocation)

          if (airdropAllocation) {
            // 使用合约中的实际空投分配金额
            const airdropAmount = BigInt(airdropAllocation.amount)
            const airdropMaxCount = BigInt(redPacketInfo.airdropMaxCount || 1000)

            // 按照合约逻辑计算每用户空投金额
            const airdropPerUser = airdropAmount / airdropMaxCount
            totalClaimed += airdropPerUser
            console.log('空投金额:', airdropPerUser.toString())
            console.log('空投总金额:', airdropAmount.toString())
            console.log('最大用户数:', airdropMaxCount.toString())
          } else {
            console.log('未找到空投分配信息，尝试查找其他可能的分配名称...')
            // 尝试查找其他可能的分配名称
            const allAllocations = redPacketInfo.allocations || []
            console.log('所有分配方案:', allAllocations)

            // 如果找不到 'airdrop'，尝试使用第一个分配或者查找包含 'airdrop' 的分配
            const alternativeAirdrop = allAllocations.find((alloc: any) =>
              alloc.name.toLowerCase().includes('airdrop') ||
              alloc.name.toLowerCase().includes('空投')
            )

            if (alternativeAirdrop) {
              console.log('找到替代空投分配:', alternativeAirdrop)
              const airdropAmount = BigInt(alternativeAirdrop.amount)
              const airdropMaxCount = BigInt(redPacketInfo.airdropMaxCount || 1000)
              const airdropPerUser = airdropAmount / airdropMaxCount
              totalClaimed += airdropPerUser
              console.log('替代空投金额:', airdropPerUser.toString())
            }
          }
        } catch (error) {
          console.log('获取空投金额失败:', error)
        }
      } else {
        console.log('用户未领取空投，不显示代币金额')
        setClaimedAmount('0')
        setLoadingClaimedAmount(false)
        return
      }

      // 转换为可读格式
      const claimedInTokens = totalClaimed / BigInt(Math.pow(10, 9)) // 假设9位小数
      setClaimedAmount(claimedInTokens.toString())

      // console.log('✅ 用户总共收到代币:', claimedInTokens.toString())
      // console.log('🔍 原始计算值:', totalClaimed.toString())

      // 如果计算出的金额为0，可能是因为链上状态还没更新
      if (claimedInTokens === BigInt(0)) {
        console.log('⚠️ 计算出的金额为0，可能是链上状态还未更新')
      } else {
        // 如果成功获取到非零金额，立即停止loading状态并重置重试计数器
        setRetryCount(0)
        setLoadingClaimedAmount(false)
        console.log('✅ 成功获取到领取金额，停止重试并结束loading状态')
      }

    } catch (error) {
      console.error('❌ 查询用户收到代币金额失败:', error)
      setClaimedAmount('0')
    } finally {
      // 只有在没有获取到非零金额时才设置loading为false
      // 如果已经获取到非零金额，loading状态已经在上面设置为false了
      if (!claimedAmount || claimedAmount === '0' || claimedAmount === '') {
        console.log('🔍 没有获取到有效金额，设置loading状态为false')
        setLoadingClaimedAmount(false)
      } else {
        console.log('🔍 已获取到有效金额，loading状态已设置为false')
      }
      console.log('🔍 最终claimedAmount状态:', claimedAmount)
    }
  }

  // 领取推荐人奖励
  const handleClaimReferralReward = async () => {
    if (!isConnected || !walletProvider || !creatorAddress || !mintAddress) {
      toast({
        title: '请连接钱包',
        description: '需要连接 Solana 钱包才能领取奖励',
        status: 'warning',
        duration: 3000,
      })
      return
    }

    if (!referralInfo || referralInfo.eligibleRewards <= referralInfo.rewardsClaimed) {
      toast({
        title: '没有可领取的奖励',
        description: '您当前没有可领取的推荐人奖励',
        status: 'warning',
        duration: 3000,
      })
      return
    }

    setClaimingReferralReward(true)
    try {
      const wallet = walletProvider as any
      const creatorPubkey = new PublicKey(creatorAddress)
      const mintPubkey = new PublicKey(mintAddress)
      const projectId = await getProjectId()

      const signature = await crowdfundingContract.claimReferralReward(
        wallet,
        creatorPubkey,
        projectId,
        mintPubkey
      )

      toast({
        title: '推荐人奖励领取成功',
        description: `交易签名: ${signature.slice(0, 8)}...`,
        status: 'success',
        duration: 5000,
      })

      // 重新加载推荐人信息
      await loadReferralInfo()
    } catch (error: any) {
      console.error('领取推荐人奖励失败:', error)

      let errorMessage = '领取失败，请重试'

      if (error.message?.includes('NoReferralRewardsToClaim')) {
        errorMessage = '没有可领取的推荐人奖励'
      } else if (error.message?.includes('CrowdfundingFailed')) {
        errorMessage = '众筹尚未成功，无法领取奖励'
      } else if (error.message?.includes('User rejected')) {
        errorMessage = '用户取消了交易'
      }

      toast({
        title: '领取推荐人奖励失败',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      })
    } finally {
      setClaimingReferralReward(false)
    }
  }

  // 初始化项目ID
  const initializeProjectId = async () => {
    if (creatorAddress && isConnected) {
      try {
        await getProjectId()
      } catch (error) {
        console.error('初始化项目ID失败:', error)
      }
    }
  }

  // 页面加载时检查可用选项和加载IPFS数据
  useEffect(() => {
    initializeProjectId()
    checkAvailableOptions()
    loadCrowdfundingDataFromIPFS()
    loadReferralInfo()
    loadClaimedAmount()
  }, [creatorAddress, isConnected, ipfsCID, address, projectIdParam])

  // 当成功状态改变时，重新加载领取金额
  useEffect(() => {
    if (isSuccess && successType === 'airdrop') {
      console.log('🎉 空投领取成功状态触发，开始加载领取金额...')
      setRetryCount(0)

      // 存储所有定时器的ID，以便在成功时清除
      const timers: NodeJS.Timeout[] = []

      // 立即检查一次状态
      loadClaimedAmount()

      // 延迟一点时间确保交易已经确认
      const timer1 = setTimeout(() => {
        console.log('⏰ 延迟1秒后开始加载领取金额 (重试1)')
        setRetryCount(1)
        loadClaimedAmount()
      }, 1000)
      timers.push(timer1)

      // 如果第一次加载失败，3秒后再次尝试
      const timer2 = setTimeout(() => {
        console.log('⏰ 延迟3秒后再次尝试加载领取金额 (重试2)')
        setRetryCount(2)
        loadClaimedAmount()
      }, 3000)
      timers.push(timer2)

      // 如果还是失败，5秒后再次尝试
      const timer3 = setTimeout(() => {
        console.log('⏰ 延迟5秒后再次尝试加载领取金额 (重试3)')
        setRetryCount(3)
        loadClaimedAmount()
      }, 5000)
      timers.push(timer3)

      // 继续重试，10秒后再次尝试
      const timer4 = setTimeout(() => {
        console.log('⏰ 延迟10秒后再次尝试加载领取金额 (重试4)')
        setRetryCount(4)
        loadClaimedAmount()
      }, 10000)
      timers.push(timer4)

      // 继续重试，15秒后再次尝试
      const timer5 = setTimeout(() => {
        console.log('⏰ 延迟15秒后再次尝试加载领取金额 (重试5)')
        setRetryCount(5)
        loadClaimedAmount()
      }, 15000)
      timers.push(timer5)

      // 继续重试，20秒后再次尝试
      const timer6 = setTimeout(() => {
        console.log('⏰ 延迟20秒后再次尝试加载领取金额 (重试6)')
        setRetryCount(6)
        loadClaimedAmount()
      }, 20000)
      timers.push(timer6)

      // 继续重试，30秒后再次尝试
      const timer7 = setTimeout(() => {
        console.log('⏰ 延迟30秒后再次尝试加载领取金额 (重试7)')
        setRetryCount(7)
        loadClaimedAmount()
      }, 30000)
      timers.push(timer7)

      // 继续重试，45秒后再次尝试
      const timer8 = setTimeout(() => {
        console.log('⏰ 延迟45秒后再次尝试加载领取金额 (重试8)')
        setRetryCount(8)
        loadClaimedAmount()
      }, 45000)
      timers.push(timer8)

      // 设置超时保护，60秒后强制结束loading状态
      const timeoutTimer = setTimeout(() => {
        console.log('⏰ 60秒超时，强制结束loading状态')
        setLoadingClaimedAmount(false)
        setRetryCount(0)
        if (!claimedAmount || claimedAmount === '') {
          setClaimedAmount('查询超时，请手动刷新')
        }
      }, 60000)
      timers.push(timeoutTimer)

      // 监听claimedAmount的变化，如果获取到金额就清除所有定时器
      const checkSuccess = () => {
        if (claimedAmount && claimedAmount !== '0' && claimedAmount !== '') {
          console.log('✅ 已获取到领取金额，清除所有重试定时器')
          timers.forEach(timer => clearTimeout(timer))
          setRetryCount(0)
        }
      }

      // 设置一个监听器来检查claimedAmount的变化
      const successCheckTimer = setInterval(checkSuccess, 500)
      timers.push(successCheckTimer)

      // 清理函数
      return () => {
        timers.forEach(timer => {
          if (typeof timer === 'number') {
            clearTimeout(timer)
          } else {
            clearInterval(timer)
          }
        })
      }
    } else if (isSuccess && successType === 'crowdfunding') {
      console.log('💰 众筹参与成功，不需要查询代币金额')
      // 众筹参与成功时，确保loading状态为false
      setLoadingClaimedAmount(false)
      setRetryCount(0)
    }
  }, [isSuccess, successType, claimedAmount])

  // 检查连接状态
  useEffect(() => {
    if (!isConnected) {
      toast({
        title: '请连接钱包',
        description: '需要连接 Solana 钱包才能参与众筹',
        status: 'warning',
        duration: 3000,
      })
    }
  }, [isConnected, toast])

  // 处理参与众筹
  const handleParticipate = async (option: CrowdfundingOption) => {
    if (!isConnected || !walletProvider) {
      toast({
        title: '请连接钱包',
        description: '需要连接 Solana 钱包才能参与众筹',
        status: 'warning',
        duration: 3000,
      })
      return
    }

    if (!creatorAddress || !mintAddress) {
      toast({
        title: '缺少必要参数',
        description: '创建者地址或代币地址不能为空',
        status: 'error',
        duration: 3000,
      })
      return
    }

    setLoading(true)
    try {
      const wallet = walletProvider as any
      const creatorPubkey = new PublicKey(creatorAddress)
      const mintPubkey = new PublicKey(mintAddress)
      const projectId = await getProjectId()

      if (option.isAirdropOnly) {
        // 仅空投逻辑 - 调用 claim_airdrop
        console.log('🎁 开始领取空投...')

        // 检查用户是否已经领取过空投
        const userState = await crowdfundingContract.getUserState(creatorPubkey, projectId, wallet.publicKey)
        if (userState.exists && userState.airdropClaimed) {
          toast({
            title: '已领取过空投',
            description: '您已经领取过这个项目的空投',
            status: 'warning',
            duration: 3000,
          })
          return
        }

        const signature = await crowdfundingContract.claimAirdrop(
          wallet,
          creatorPubkey,
          projectId,
          mintPubkey
        )

        setTransactionSignature(signature)
        setSuccessType('airdrop')
        setIsSuccess(true)

        // 查询用户收到的代币金额
        await loadClaimedAmount()
      } else {
        // 参与众筹逻辑 - 调用 participateInCrowdfunding
        console.log('💰 开始参与众筹...')

        // 先验证众筹项目是否存在
        try {
          const redPacketInfo = await crowdfundingContract.getRedPacketInfo(creatorPubkey, projectId)
          console.log('众筹项目信息:', redPacketInfo)
        } catch (error) {
          toast({
            title: '众筹项目不存在',
            description: '未找到该众筹项目，请检查链接是否正确',
            status: 'error',
            duration: 3000,
          })
          return
        }

        // 检查用户是否已经参与过众筹
        const backerState = await crowdfundingContract.getBackerState(creatorPubkey, projectId, wallet.publicKey)
        if (backerState.exists && backerState.amount > 0) {
          toast({
            title: '已参与过众筹',
            description: '您已经参与过这个项目的众筹',
            status: 'warning',
            duration: 3000,
          })
          return
        }

        // 确保传入的金额精确匹配智能合约要求
        let amountInLamports: number
        if (option.amount === 0.05) {
          amountInLamports = 50_000_000 // SMALL_SUPPORT_AMOUNT
        } else if (option.amount === 0.5) {
          amountInLamports = 500_000_000 // LARGE_SUPPORT_AMOUNT
        } else {
          toast({
            title: '无效的参与金额',
            description: '只支持 0.05 SOL 或 0.5 SOL 的参与金额',
            status: 'error',
            duration: 3000,
          })
          return
        }

        console.log('参与金额 (lamports):', amountInLamports)
        console.log('参与金额 (SOL):', amountInLamports / 1e9)
        console.log('项目ID:', projectId.toString())

        // 处理推荐人参数
        let referrerPubkey: PublicKey | undefined
        if (referrerAddress) {
          try {
            referrerPubkey = new PublicKey(referrerAddress)
            console.log('推荐人地址:', referrerPubkey.toBase58())

            // 验证推荐人不能是自己
            if (referrerPubkey.equals(wallet.publicKey)) {
              console.log('⚠️ 推荐人不能是自己，忽略推荐人参数')
              referrerPubkey = undefined
            }
          } catch (error) {
            console.log('⚠️ 推荐人地址格式无效，忽略推荐人参数:', error)
            referrerPubkey = undefined
          }
        }

        // 使用智能选择方法
        const signature = await crowdfundingContract.participateInCrowdfunding(
          wallet,
          creatorPubkey,
          projectId,
          amountInLamports,
          referrerPubkey
        )

        setTransactionSignature(signature)
        setSuccessType('crowdfunding')
        setIsSuccess(true)

        // 众筹参与成功后不查询代币金额，因为众筹不立即发放代币
        // await loadClaimedAmount()
      }
    } catch (error: any) {
      console.error('参与失败:', error)

      // 根据错误类型提供更友好的错误信息
      let errorMessage = '参与失败，请重试'

      if (error.message?.includes('InvalidSupportAmount')) {
        errorMessage = '参与金额无效，请选择正确的金额'
      } else if (error.message?.includes('InsufficientFunds')) {
        errorMessage = '余额不足，请检查您的 SOL 余额'
      } else if (error.message?.includes('AlreadySupported')) {
        errorMessage = '您已经参与过这个项目的众筹'
      } else if (error.message?.includes('FundingGoalReached')) {
        errorMessage = '众筹目标已达成，无法继续参与'
      } else if (error.message?.includes('User rejected')) {
        errorMessage = '用户取消了交易'
      }

      toast({
        title: '参与失败',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  // 获取我的领取记录
  const loadMyClaimRecords = async (page: number = 1) => {
    if (!address) {
      toast({
        title: '错误',
        description: '请先连接钱包',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setLoadingMyClaims(true)
    try {
      // 获取空投记录 (type=0)
      const airdropUrl = buildApiUrl(`/api/one_launch/crowdfunding_program/investor/list/${LAUNCHPAD_CrowdFunding_PROGRAM_ID.toString()}/${address}/0?pageSize=10&pageNum=${page}`)
      console.log('🔍 获取空投记录:', airdropUrl)

      const airdropResponse = await fetch(airdropUrl)
      const airdropData: MyClaimRecordsResponse = await airdropResponse.json()

      // 获取众筹支持记录 (type=1)
      const supportUrl = buildApiUrl(`/api/one_launch/crowdfunding_program/investor/list/${LAUNCHPAD_CrowdFunding_PROGRAM_ID.toString()}/${address}/1?pageSize=10&pageNum=${page}`)
      console.log('🔍 获取众筹支持记录:', supportUrl)

      const supportResponse = await fetch(supportUrl)
      const supportData: MyClaimRecordsResponse = await supportResponse.json()

      // 合并记录并按时间排序
      const airdropRecords = airdropData.success && Array.isArray(airdropData.data) ? airdropData.data : []
      const supportRecords = supportData.success && Array.isArray(supportData.data) ? supportData.data : []

      const allRecords = [
        ...airdropRecords,
        ...supportRecords
      ].sort((a, b) => b.timestamp - a.timestamp)

      console.log('✅ 获取我的领取记录成功:', {
        airdropCount: airdropRecords.length,
        supportCount: supportRecords.length,
        totalRecords: allRecords.length
      })

      setMyClaimRecords(allRecords)
      setMyClaimsTotal(Math.max(airdropData.total || 0, supportData.total || 0))
      setMyClaimsPage(page)

    } catch (error) {
      console.error('❌ 获取我的领取记录失败:', error)
      toast({
        title: '获取记录失败',
        description: '请稍后重试',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setLoadingMyClaims(false)
    }
  }

  // 格式化金额显示
  const formatAmount = (amount: number, type: number) => {
    if (type === 0) {
      // 空投记录，显示代币数量
      return `${(amount / 1e9).toFixed(2)} ${myClaimRecords.find(r => r.type === 0)?.token_symbol || 'TOKEN'}`
    } else {
      // 众筹支持记录，显示SOL数量
      return `${(amount / 1e9).toFixed(4)} SOL`
    }
  }

  // 格式化时间显示
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN')
  }

  // 获取类型显示文本
  const getTypeText = (type: number) => {
    return type === 0 ? '空投领取' : '众筹支持'
  }

  // 获取类型颜色
  const getTypeColor = (type: number) => {
    return type === 0 ? 'green' : 'blue'
  }

  if (!isConnected) {
    return (
      <Box
        minH="100vh"
        bg="gray.100"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack spacing={4}>
          <Text fontSize="xl" color="gray.700" textAlign="center">
            请连接钱包以参与众筹
          </Text>
          <Button
            colorScheme="blue"
            onClick={() => navigate('/')}
          >
            返回首页
          </Button>
        </VStack>
      </Box>
    )
  }

  // 成功页面
  if (isSuccess) {
    return (
      <Box
        minH="100vh"
        bg="gray.100"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
      >
        <VStack spacing={8} w="full" maxW="600px">
          <Box
            bg="white"
            borderRadius="xl"
            boxShadow="lg"
            p={8}
            w="full"
          >
            <VStack spacing={6}>
              {/* 成功消息 */}
              <HStack spacing={2}>
                <Text fontSize="lg" color="#000000" fontWeight="bold">
                  Congratulations!
                </Text>
                <Image
                  src="/images/duihao.png"
                  alt="Success"
                  w={8}
                  h={8}
                />
              </HStack>

              {/* 收到代币信息卡片 - 只在空投领取时显示 */}
              {successType === 'airdrop' && (
                <Box w="50%" bg="#4079FF1A" borderRadius="lg" p={2} maxH="80px" overflow="hidden" boxShadow="0 4px 8px rgba(0,0,0,0.1)">
                  <VStack spacing={2} align="stretch">
                    {/* 收到的代币金额 */}
                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" color="gray.700" fontWeight="medium">
                        You received
                      </Text>
                      <HStack spacing={2}>
                        <Text fontSize="lg" color="green.600" fontWeight="bold">
                          {loadingClaimedAmount ? (
                            <HStack spacing={2}>
                              <Spinner size="sm" />
                              <VStack spacing={0} align="start">
                                <Text fontSize="sm" color="gray.500">查询中...</Text>
                                <Text fontSize="xs" color="gray.400">
                                  {retryCount > 0 ? `第${retryCount}次重试中` : '系统正在持续尝试获取最新数据'}
                                </Text>
                              </VStack>
                            </HStack>
                          ) : (
                            claimedAmount === '查询超时，请手动刷新' ? (
                              <Text color="orange.500" fontSize="sm">{claimedAmount}</Text>
                            ) : (
                              `${claimedAmount || '0'} ${ipfsCrowdfundingData?.tokenSymbol || ''}`
                            )
                          )}
                        </Text>
                        {!loadingClaimedAmount && (
                          <Button
                            size="xs"
                            variant="ghost"
                            color="gray.500"
                            _hover={{ color: "blue.500" }}
                            onClick={() => {
                              console.log('🔄 手动刷新领取金额')
                              loadClaimedAmount()
                            }}
                          >
                            🔄
                          </Button>
                        )}
                        {loadingClaimedAmount && (
                          <Button
                            size="xs"
                            variant="ghost"
                            color="gray.500"
                            isDisabled
                          >
                            ⏳
                          </Button>
                        )}
                      </HStack>
                    </HStack>

                    {/* 交易哈希 */}
                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" color="gray.700" fontWeight="medium">
                        Hash
                      </Text>
                      <HStack spacing={2}>
                        <Text
                          fontSize="sm"
                          color="blue.600"
                          fontFamily="mono"
                          textDecoration="underline"
                          cursor="pointer"
                          onClick={() => {
                            if (transactionSignature) {
                              window.open(`https://explorer.solana.com/tx/${transactionSignature}`, '_blank');
                            }
                          }}
                        >
                          {transactionSignature ?
                            `${transactionSignature.slice(0, 8)}...${transactionSignature.slice(-8)}` :
                            'Pending...'
                          }
                        </Text>
                        {transactionSignature && (
                          <Button
                            size="xs"
                            variant="ghost"
                            color="gray.500"
                            _hover={{ color: "blue.500" }}
                            onClick={() => {
                              navigator.clipboard.writeText(transactionSignature);
                              toast({
                                title: "复制成功",
                                description: "交易哈希已复制到剪贴板",
                                status: "success",
                                duration: 2000,
                              });
                            }}
                          >
                            📋
                          </Button>
                        )}
                      </HStack>
                    </HStack>
                  </VStack>
                </Box>
              )}

              {/* 众筹参与成功信息 - 只在众筹参与时显示 */}
              {successType === 'crowdfunding' && (
                <Box w="50%" bg="#4079FF1A" borderRadius="lg" p={2} maxH="80px" overflow="hidden" boxShadow="0 4px 8px rgba(0,0,0,0.1)">
                  <VStack spacing={2} align="stretch">
                    {/* 参与成功信息 */}
                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" color="gray.700" fontWeight="medium">
                        Crowdfunding Support
                      </Text>
                      <HStack spacing={2}>
                        <Text fontSize="lg" color="blue.600" fontWeight="bold">
                          Success!
                        </Text>
                      </HStack>
                    </HStack>

                    {/* 交易哈希 */}
                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" color="gray.700" fontWeight="medium">
                        Hash
                      </Text>
                      <HStack spacing={2}>
                        <Text
                          fontSize="sm"
                          color="blue.600"
                          fontFamily="mono"
                          textDecoration="underline"
                          cursor="pointer"
                          onClick={() => {
                            if (transactionSignature) {
                              window.open(`https://explorer.solana.com/tx/${transactionSignature}`, '_blank');
                            }
                          }}
                        >
                          {transactionSignature ?
                            `${transactionSignature.slice(0, 8)}...${transactionSignature.slice(-8)}` :
                            'Pending...'
                          }
                        </Text>
                        {transactionSignature && (
                          <Button
                            size="xs"
                            variant="ghost"
                            color="gray.500"
                            _hover={{ color: "blue.500" }}
                            onClick={() => {
                              navigator.clipboard.writeText(transactionSignature);
                              toast({
                                title: "复制成功",
                                description: "交易哈希已复制到剪贴板",
                                status: "success",
                                duration: 2000,
                              });
                            }}
                          >
                            📋
                          </Button>
                        )}
                      </HStack>
                    </HStack>
                  </VStack>
                </Box>
              )}

              {/* 社区链接 */}
              <VStack spacing={3}>
                <Text fontSize="lg" fontWeight="bold" color="#4079FF" textShadow="0 2px 4px rgba(0,0,0,0.2)">
                  Join the Community:
                </Text>

                <HStack spacing={4}>
                  {/* Twitter */}
                  <Box
                    as="a"
                    href={ipfsCrowdfundingData?.communityLinks?.twitterUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    bg="#1DA1F2"
                    color="white"
                    borderRadius="full"
                    w={12}
                    h={12}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    _hover={{ bg: "#1a91da" }}
                    cursor="pointer"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                  </Box>

                  {/* Telegram */}
                  <Box
                    as="a"
                    href={ipfsCrowdfundingData?.communityLinks?.telegramUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    bg="#0088cc"
                    color="white"
                    borderRadius="full"
                    w={12}
                    h={12}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    _hover={{ bg: "#0077b3" }}
                    cursor="pointer"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                  </Box>

                  {/* Discord */}
                  <Box
                    as="a"
                    href={ipfsCrowdfundingData?.communityLinks?.discordUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    bg="#5865F2"
                    color="white"
                    borderRadius="full"
                    w={12}
                    h={12}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    _hover={{ bg: "#4752C4" }}
                    cursor="pointer"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9554 2.4189-2.1568 2.4189Z" />
                    </svg>
                  </Box>
                </HStack>

                <Text fontSize="lg" color="#4079FF" textAlign="center">
                  (This community link was provided by the creator)
                </Text>
              </VStack>



              {/* 推荐人奖励信息 - 仅打印到控制台 */}
              {referralInfo && (() => {
                console.log('🎯 推荐人奖励状态:', {
                  推荐人数: referralInfo.referralCount,
                  可领取奖励: referralInfo.eligibleRewards,
                  已领取奖励: referralInfo.rewardsClaimed,
                  剩余可领取: referralInfo.eligibleRewards - referralInfo.rewardsClaimed
                })
                return null
              })()}

              {/* 分享功能 - 直接合并到同一个卡片中 */}
              <VStack spacing={4}>
                {/* 分享标题 */}
                <Text fontSize="xl" fontWeight="bold" color="black" textAlign="center">
                  {successType === 'airdrop'
                    ? 'Share your personal airdrop Claim Link!'
                    : 'Share your personal crowdfunding support link!'
                  }
                </Text>

                {/* 使用ShareComponent替换原有的分享内容 */}
                <ShareComponent
                  shareUrl={`${window.location.origin}/claim-launchpad?creator=${creatorAddress}&mint=${mintAddress}${currentProjectId !== null ? `&projectId=${currentProjectId}` : ''}${ipfsCID ? `&ipfsCID=${ipfsCID}` : ''}${isSuccess && address ? `&referrer=${address}` : ''}`}
                />

                {/* 说明文字 */}
                <Text fontSize="sm" color="gray.500" textAlign="center" px={4}>
                  {successType === 'airdrop'
                    ? 'For every 10 people you invite, you\'ll get an extra airdrop after the crowdfunding is successfully completed.'
                    : 'Invite friends to support this project and earn referral rewards!'
                  }
                </Text>
              </VStack>
            </VStack>
          </Box>

          {/* 底部按钮 */}
          <VStack spacing={3} w="full">
            <Button
              bg="#4079FF"
              color="white"
              size="lg"
              w="50%"
              borderRadius="lg"
              py={6}
              _hover={{ bg: "#4079FF" }}
              _active={{ bg: "#4079FF" }}
              _focus={{ bg: "#4079FF" }}
              leftIcon={<Box>🏠</Box>}
              onClick={() => navigate('/')}
            >
              Home
            </Button>

            <Button
              bg="#4079FF"
              color="white"
              size="lg"
              w="50%"
              borderRadius="lg"
              py={6}
              _hover={{ bg: "#4079FF" }}
              _active={{ bg: "#4079FF" }}
              _focus={{ bg: "#4079FF" }}
              onClick={() => {
                navigate('/my-claimed-crowdfunding')
              }}
            >
              My Claim Launchpad
            </Button>
          </VStack>
        </VStack>
      </Box>

    )
  }

  return (
    <>
      {/* 主页面内容 */}
      <Box
        minH="100vh"
        bg="gray.100"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
      >
        <Box
          bg="white"
          borderRadius="xl"
          boxShadow="lg"
          p={8}
          w="full"
          maxW="600px"
        >
          <VStack spacing={6}>
            {/* 标题 */}
            <Text fontSize="2xl" fontWeight="bold" color="blue.500" textAlign="center">
              Choose crowdfunding amount
            </Text>

            {/* 主要内容区域 */}
            <SimpleGrid columns={2} spacing={8} w="full">
              {/* Option One */}
              <VStack spacing={4} align="stretch">
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" textAlign="center">
                  Option One
                </Text>
                <Text fontSize="sm" color="gray.600" textAlign="center" px={2}>
                  Token rewards depend on your chosen tier, plus a one-time airdrop
                </Text>

                <VStack spacing={3}>
                  <Button
                    bg="#2063FF"
                    color="white"
                    size="lg"
                    w="full"
                    isDisabled={!availableOptions.includes('large')}
                    isLoading={loading}
                    onClick={() => handleParticipate(crowdfundingOptions[1])}
                    borderRadius="lg"
                    py={6}
                    _hover={{ bg: '#2063FF' }}
                    _active={{ bg: '#2063FF' }}
                    _focus={{ bg: '#2063FF' }}
                  >
                    Commit 0.5 SOL
                  </Button>

                  <Button
                    bg="#6F9AFF"
                    color="white"
                    size="lg"
                    w="full"
                    isDisabled={!availableOptions.includes('small')}
                    isLoading={loading}
                    onClick={() => handleParticipate(crowdfundingOptions[0])}
                    borderRadius="lg"
                    py={6}
                    _hover={{ bg: '#6F9AFF' }}
                    _active={{ bg: '#6F9AFF' }}
                    _focus={{ bg: '#6F9AFF' }}
                  >
                    Commit 0.05 SOL
                  </Button>
                </VStack>
              </VStack>

              {/* Option Two */}
              <VStack spacing={4} align="stretch">
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" textAlign="center">
                  Option Two
                </Text>
                <Text fontSize="sm" color="gray.600" textAlign="center" px={2}>
                  No commitment needed
                </Text>

                <Button
                  bg="gray.400"
                  color="white"
                  size="lg"
                  w="full"
                  _hover={{ bg: 'gray.500' }}
                  isLoading={loading}
                  onClick={() => handleParticipate(crowdfundingOptions[2])}
                  borderRadius="lg"
                  py={6}
                  mt={12}
                >
                  Airdrop only
                </Button>
              </VStack>
            </SimpleGrid>

            {/* 底部信息 */}
            <VStack spacing={3} w="full">
              <Text fontSize="xs" color="gray.500" textAlign="center">
                Once the{' '}
                <Link color="blue.500" textDecoration="underline">
                  [Cumulative airdrop claims: 480 / 500]
                </Link>
                {' '}hit the limit, no more can be claimed. Only the crowdfunding will remain open.
              </Text>

              <HStack spacing={2} justify="center">
                <Checkbox
                  isChecked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  colorScheme="blue"
                  size="sm"
                />
                <Text fontSize="xs" color="gray.500">
                  I've already gone through the{' '}
                  <Link color="blue.500" textDecoration="underline">
                    project information
                  </Link>
                  {' '}and the{' '}
                  <Link color="blue.500" textDecoration="underline">
                    OneLaunch protocol
                  </Link>
                </Text>
              </HStack>
            </VStack>
          </VStack>
        </Box>
      </Box>

      {/* 我的领取记录弹窗 */}
      <Modal isOpen={showMyClaims} onClose={() => setShowMyClaims(false)} size="6xl">
        <ModalOverlay />
        <ModalContent maxW="90vw" maxH="90vh">
          <ModalHeader>
            <Text fontSize="2xl" fontWeight="bold" color="gray.800">
              My Claimed Red Packets & AirDrops
            </Text>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {loadingMyClaims ? (
              <Flex justify="center" align="center" minH="200px">
                <VStack spacing={4}>
                  <Spinner size="xl" color="blue.500" />
                  <Text>Loading records...</Text>
                </VStack>
              </Flex>
            ) : myClaimRecords.length === 0 ? (
              <VStack spacing={4} py={8}>
                <Text fontSize="lg" color="gray.500">No records found</Text>
                <Text fontSize="sm" color="gray.400">You haven't participated in any airdrops or crowdfunding yet</Text>
              </VStack>
            ) : (
              <VStack spacing={6} align="stretch">
                <Text fontSize="sm" color="gray.600">
                  Found {myClaimsTotal} records
                </Text>

                <Box
                  bg="white"
                  borderRadius="xl"
                  boxShadow="lg"
                  overflow="hidden"
                  w="full"
                >
                  <TableContainer>
                    <Table variant="simple">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>
                            Token
                          </Th>
                          <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>
                            Type
                          </Th>
                          <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>
                            Amount
                          </Th>
                          <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>
                            Date Claimed
                          </Th>
                          <Th color="gray.700" fontWeight="600" fontSize="sm" py={4}>
                            Action
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {myClaimRecords.map((record: MyClaimRecord, index: number) => (
                          <Tr key={`${record.transaction}-${index}`} _hover={{ bg: 'gray.50' }}>
                            {/* Token column */}
                            <Td py={6}>
                              <HStack spacing={3}>
                                <Box
                                  w="32px"
                                  h="32px"
                                  borderRadius="full"
                                  bg="orange.400"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  color="white"
                                  fontSize="lg"
                                  fontWeight="bold"
                                >
                                  {record.type === 0 ? 'A' : 'S'}
                                </Box>
                                <VStack spacing={1} align="start">
                                  <Text fontWeight="medium" color="gray.800" fontSize="md">
                                    {record.token_name || 'Unknown Token'}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500" fontFamily="mono">
                                    {record.token_symbol || record.mint?.slice(0, 8) + '...' || 'Unknown'}
                                  </Text>
                                </VStack>
                              </HStack>
                            </Td>

                            {/* Type column */}
                            <Td py={6}>
                              <Badge
                                px={3}
                                py={1}
                                borderRadius="full"
                                fontSize="xs"
                                fontWeight="medium"
                                bg={record.type === 1 ? "green.50" : "blue.50"}
                                color={record.type === 1 ? "green.600" : "blue.600"}
                                border="1px solid"
                                borderColor={record.type === 1 ? "green.200" : "blue.200"}
                              >
                                {getTypeText(record.type)}
                              </Badge>
                            </Td>

                            {/* Amount column */}
                            <Td py={6}>
                              <Text color="gray.800" fontSize="md" fontWeight="medium">
                                {formatAmount(record.amount, record.type)}
                              </Text>
                            </Td>

                            {/* Date Claimed column */}
                            <Td py={6}>
                              <Text color="gray.600" fontSize="sm">
                                {formatTime(record.timestamp)}
                              </Text>
                            </Td>

                            {/* Action column */}
                            <Td py={6}>
                              <Button
                                size="sm"
                                bg="blue.500"
                                color="white"
                                _hover={{ bg: "blue.600" }}
                                onClick={() => {
                                  navigator.clipboard.writeText(record.transaction);
                                  toast({
                                    title: "Copied Successfully",
                                    description: "Transaction hash copied to clipboard",
                                    status: "success",
                                    duration: 2000,
                                    isClosable: true,
                                  });
                                }}
                                px={4}
                                py={1}
                              >
                                Copy Hash
                              </Button>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>

                {/* 分页控制 */}
                {myClaimsTotal > 10 && (
                  <Flex justify="center" align="center" pt={6}>
                    <ButtonGroup spacing={2}>
                      <Button
                        size="sm"
                        bg="gray.600"
                        color="white"
                        _hover={{ bg: "gray.700" }}
                        _disabled={{ bg: "gray.300", color: "gray.500" }}
                        isDisabled={myClaimsPage <= 1}
                        onClick={() => loadMyClaimRecords(myClaimsPage - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        bg="#4079FF"
                        color="white"
                        _hover={{ bg: "#3068EE" }}
                        _disabled={{ bg: "gray.300", color: "gray.500" }}
                        isDisabled
                      >
                        {myClaimsPage} / {Math.ceil(myClaimsTotal / 10)}
                      </Button>
                      <Button
                        size="sm"
                        bg="gray.600"
                        color="white"
                        _hover={{ bg: "gray.700" }}
                        _disabled={{ bg: "gray.300", color: "gray.500" }}
                        isDisabled={myClaimsPage >= Math.ceil(myClaimsTotal / 10)}
                        onClick={() => loadMyClaimRecords(myClaimsPage + 1)}
                      >
                        Next
                      </Button>
                    </ButtonGroup>
                  </Flex>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}

