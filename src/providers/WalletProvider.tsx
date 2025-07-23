import React from 'react'
import { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { solana, solanaTestnet, solanaDevnet, mainnet, arbitrum, scroll, morph, berachainTestnetbArtio, mantle, soneium, zircuit, rootstock, abstract, viction, monadTestnet, celo, apeChain, base } from '@reown/appkit/networks'

// 配置 Solana 适配器
const solanaWeb3JsAdapter = new SolanaAdapter({})

// 配置项目信息
const projectId = (import.meta as any).env?.VITE_PROJECT_ID || '32aa6337e9b58311c4287aa3c06065c4' // 请在.env文件中配置VITE_PROJECT_ID=你的真实projectId
console.log('项目ID:', projectId)
// 元数据
const metadata = {
  name: 'AIDR',
  description: '基于Solana区块链的数字红包平台',
  url: 'https://ton-taupe.vercel.app/',
  icons: ['https://your-app-icon.com/icon.png']
}

// 创建 AppKit 实例
createAppKit({
  adapters: [solanaWeb3JsAdapter],
  projectId,
  networks: [solanaTestnet, solanaDevnet, solana, mainnet, arbitrum, scroll, morph, berachainTestnetbArtio, mantle, soneium, zircuit, rootstock, abstract, viction, monadTestnet, celo, apeChain, base],
  defaultNetwork: solanaDevnet,
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: false,
    emailShowWallets: false,
  },
  themeMode: 'dark'
})

interface Props {
  children: React.ReactNode
}

export const AppWalletProvider: React.FC<Props> = ({ children }) => {
  return <>{children}</>
} 