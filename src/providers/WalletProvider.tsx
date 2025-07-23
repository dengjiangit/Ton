import React from 'react'
import { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks'

// 配置 Solana 适配器
const solanaWeb3JsAdapter = new SolanaAdapter({})

// 配置项目信息
const projectId = (import.meta as any).env?.VITE_PROJECT_ID || 'your-project-id-here' // 请在.env文件中配置VITE_PROJECT_ID=你的真实projectId

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
  enableInjected: false,
  enableEIP6963: false,
  enableCoinbase: false,
  // 添加以下配置来隐藏品牌标识
  termsConditionsUrl: undefined,
  privacyPolicyUrl: undefined,
  // 或者添加这个参数来完全禁用品牌展示
  themeMode: 'dark'
})

interface Props {
  children: React.ReactNode
}

export const AppWalletProvider: React.FC<Props> = ({ children }) => {
  return <>
    <style>
      {`
          .w3m-bottom-sheet-scroll-view div[class*="brand"] {
            display: none !important;
          }
          .w3m-bottom-sheet-scroll-view div[class*="reown"] {
            display: none !important;
          }
          .w3m-modal-content div[class*="brand"] {
            display: none !important;
          }
          .w3m-modal-content div[class*="reown"] {
            display: none !important;
          }
        `}
    </style>
    {children}
  </>
} 