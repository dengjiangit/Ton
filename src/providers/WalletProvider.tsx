import React from 'react'
import { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks'
// import {  } from '@reown/appkit/utils'
// 配置 Solana 适配器
const solanaWeb3JsAdapter = new SolanaAdapter({})
const networks = [solanaTestnet, solanaDevnet, solana]
// 配置项目信息
const projectId = (import.meta as any).env?.VITE_PROJECT_ID || 'your-project-id-here' // 请在.env文件中配置VITE_PROJECT_ID=你的真实projectId
const solanaAdapter = new SolanaAdapter({
  ssr: true,
  networks: [solanaTestnet, solanaDevnet, solana],
  projectId
});
// 元数据
const metadata = {
  name: 'AIDR',
  description: '基于Solana区块链的数字红包平台',
  url: 'https://your-app-url.com',
  icons: ['https://your-app-icon.com/icon.png']
}

// 创建 AppKit 实例
createAppKit({
  adapters: [solanaAdapter],
  projectId,
  networks: [solanaTestnet, solanaDevnet, solana],
  defaultNetwork: solanaDevnet,
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: false,
    emailShowWallets: false,
  },
  enableWalletConnect: false,
  enableInjected: true,
  enableEIP6963: true,
  enableCoinbase: false,
  themeMode: 'dark'
})

interface Props {
  children: React.ReactNode
}

export const AppWalletProvider: React.FC<Props> = ({ children }) => {
  return <>{children}</>
} 