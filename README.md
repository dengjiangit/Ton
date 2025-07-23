# AIDR - Digital Gift Platform

一个基于Solana区块链的现代化数字红包平台。

## 功能特性

### 🎁 核心功能
- **创建红包**: 支持CSV批量地址导入，创建代币空投
- **领取红包**: 通过分享链接或二维码领取红包
- **红包管理**: 查看已创建和已领取的红包历史

### 🎨 设计特色
- **现代化UI**: 采用渐变背景和毛玻璃效果
- **响应式设计**: 支持各种设备屏幕尺寸
- **直观的用户体验**: 清晰的步骤引导和状态反馈

### 🔧 技术架构
- **前端框架**: React 18 + TypeScript
- **UI组件库**: Chakra UI
- **区块链集成**: Solana Web3.js + Wallet Adapter
- **路由管理**: React Router DOM
- **状态管理**: React Hooks + Zustand
- **开发工具**: Vite + ESLint

## 项目结构

\`\`\`
front_redpacket/
├── src/
│   ├── components/          # 可复用组件
│   │   └── Header.tsx      # 页面头部
│   ├── pages/              # 页面组件
│   │   ├── Home.tsx        # 首页
│   │   ├── CreateRedPacket.tsx  # 创建红包
│   │   ├── ClaimRedPacket.tsx   # 领取红包
│   │   └── MyRedPackets.tsx     # 我的红包
│   ├── providers/          # Context提供者
│   │   └── WalletProvider.tsx   # 钱包连接
│   ├── theme/              # 主题配置
│   │   └── index.ts        # Chakra UI主题
│   ├── types/              # TypeScript类型定义
│   │   └── index.ts
│   ├── App.tsx             # 主应用组件
│   ├── main.tsx            # 应用入口
│   └── polyfill.ts         # 浏览器兼容性
├── package.json
├── vite.config.ts
└── tsconfig.json
\`\`\`

## 开发指南

### 环境要求
- Node.js >= 18
- npm >= 8

### 本地开发
\`\`\`bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
\`\`\`

### 钱包连接
项目支持以下钱包：
- Phantom
- Solflare
- 其他Solana兼容钱包

### 环境配置
- 开发环境: Solana Devnet
- 测试环境: Solana Testnet  
- 生产环境: Solana Mainnet

## 使用流程

### 创建红包
1. 连接钱包
2. 选择空投类型（Red Packet）
3. 上传包含地址和金额的CSV文件
4. 输入代币合约地址
5. 确认交易并创建红包
6. 获取分享链接和二维码

### 领取红包
1. 连接钱包
2. 输入或扫描红包分享链接
3. 确认领取交易
4. 代币自动发送到钱包

## CSV文件格式

创建红包时需要上传的CSV文件格式：
\`\`\`
地址1,金额1
地址2,金额2
地址3,金额3
\`\`\`

示例：
\`\`\`
9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM,100
2wmVCSfPxGPjrnMMn7rchp4uaeoTqN39mXFC2zhPdri9,50
5Q1T... (其他地址),75
\`\`\`

## 特色亮点

- 🚀 **超快用户获取**: 一键创建，快速分发
- 💰 **低成本空投**: 10万用户空投仅需0.01 SOL
- ⚡ **闪电启动**: 一键式冷启动流程
- 🎯 **精准投放**: 支持白名单和红包两种模式
- 🔒 **安全可靠**: 基于Solana区块链的去中心化架构

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目！

## 许可证

MIT License 