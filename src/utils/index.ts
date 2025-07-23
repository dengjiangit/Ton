import { PublicKey } from '@solana/web3.js'

// 格式化SOL金额
export const formatSOL = (amount: number): string => {
  return amount.toFixed(6)
}

// 格式化时间
export const formatTime = (date: Date): string => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 格式化地址（显示前后几位）
export const formatAddress = (address: string, chars = 4): string => {
  if (!address) return ''
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

// 验证Solana地址
export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

// 复制到剪贴板
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy text: ', err)
    return false
  }
}

// 生成随机ID
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9)
}

// 计算剩余时间
export const timeRemaining = (date: Date): string => {
  const now = new Date()
  const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000)
  
  if (diffInSeconds <= 0) {
    return '已过期'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}分钟`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}小时`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}天`
  }
}

// 验证红包参数
export const validateRedPacketParams = (amount: number, count: number): string | null => {
  if (amount <= 0 || amount > 100) {
    return '红包金额必须在 0.001 到 100 SOL 之间'
  }
  
  if (count <= 0 || count > 100) {
    return '红包数量必须在 1 到 100 之间'
  }
  
  if (amount / count < 0.001) {
    return '每个红包金额不能少于 0.001 SOL'
  }
  
  return null
}

// 生成分享链接
export const generateShareLink = (redPacketId: string): string => {
  return `${window.location.origin}/claim?id=${redPacketId}`
}

// 解析分享链接中的红包ID
export const parseRedPacketIdFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('id')
}

// 计算时间差
export const timeAgo = (date: Date): string => {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return '刚刚'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}分钟前`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}小时前`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}天前`
  }
} 