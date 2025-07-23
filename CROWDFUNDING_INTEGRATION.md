# 众筹合约集成说明

## 概述

本项目已经成功集成了众筹红包合约，在用户mint代币成功后会自动调用众筹合约创建众筹红包。

## 实现细节

### 1. 合约地址和IDL

- **众筹合约地址**: `3jSB715HJHpXnJNeoABw6nAzg9hJ4bgGERumnsoAa31X`
- **IDL文件**: `src/constants/crowdfunding_redpacket.json`

### 2. 集成位置

在 `src/pages/Launchpad.tsx` 文件中：

1. **导入依赖**:
```typescript
import { LAUNCHPAD_CrowdFunding_PROGRAM_ID } from '../config/constants'
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor'
import crowdfundingRedpacketIdl from '../constants/crowdfunding_redpacket.json'
```

2. **创建众筹红包函数**:
```typescript
const createCrowdfundingRedPacket = async (
  wallet: any,
  connection: Connection,
  mintAddress: PublicKey,
  tokenName: string,
  tokenSymbol: string,
  totalSupply: string,
  targetAmount: string,
  creator: PublicKey
) => {
  // 实现逻辑...
}
```

3. **在mint成功后调用**:
```typescript
// 在handleCreateLaunchpad函数中
const crowdfundingSignature = await createCrowdfundingRedPacket(
  wallet,
  connection,
  mintKeypair.publicKey,
  formData.tokenName,
  formData.tokenSymbol,
  formData.totalSupply,
  formData.targetAmount,
  wallet.publicKey
)
```

## 功能流程

### 1. Mint代币
用户填写代币信息并创建代币

### 2. 创建众筹红包
Mint成功后自动调用众筹合约，创建众筹红包项目

### 3. 众筹参数
- **代币分配**: 使用默认分配方案
  - 空投: 40% (12个月解锁)
  - 众筹奖励: 30% (12个月解锁)
  - 流动性: 20% (立即解锁)
  - 开发者: 10% (12个月解锁)
- **众筹目标**: 用户输入的目标金额
- **众筹期限**: 14天
- **空投最大数量**: 1000人

## PDA地址计算

```typescript
// RedPacket PDA
const [redPacketPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('red_packet'), creator.toBuffer()],
  LAUNCHPAD_CrowdFunding_PROGRAM_ID
)

// SOL Vault PDA
const [solVaultPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('sol_vault'), redPacketPDA.toBuffer()],
  LAUNCHPAD_CrowdFunding_PROGRAM_ID
)

// Token Vault PDA
const [tokenVaultPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('token_vault'), redPacketPDA.toBuffer()],
  LAUNCHPAD_CrowdFunding_PROGRAM_ID
)
```

## 错误处理

实现包含了详细的错误处理和日志记录：

1. **输入参数验证**
2. **PDA地址计算验证**
3. **合约调用错误捕获**
4. **详细的控制台日志**

## 使用说明

### 1. 创建启动板
1. 填写代币信息（名称、符号、总供应量、项目描述）
2. 填写众筹目标金额
3. 点击创建按钮

### 2. 自动流程
1. 系统创建代币Mint
2. 自动调用众筹合约创建红包
3. 生成分享链接和二维码

### 3. 后续操作
- 用户可以分享众筹链接
- 支持者可以参与众筹
- 项目方可以结算众筹

## 注意事项

1. **代币余额**: 创建者必须拥有足够的代币余额
2. **网络费用**: 需要支付SOL作为交易费用
3. **权限验证**: 只有创建者可以调用众筹合约
4. **参数验证**: 所有参数都会进行合法性验证

## 调试信息

在浏览器控制台中可以看到详细的调试信息：

```
🚀 开始创建众筹红包...
📋 输入参数: { mintAddress: "...", tokenName: "...", ... }
✅ Anchor程序实例创建成功
📊 PDA地址计算完成:
RedPacket PDA: ...
SOL Vault PDA: ...
Token Vault PDA: ...
💰 创建者代币账户: ...
📋 众筹参数: { ... }
🎯 调用众筹合约 createCustomRedpacket...
✅ 众筹红包创建成功: ...
```

## 依赖包

确保以下依赖已安装：

```json
{
  "@coral-xyz/anchor": "^0.31.1",
  "@solana/web3.js": "^1.98.2",
  "@solana/spl-token": "^0.4.13"
}
```

## 故障排除

### 常见问题

1. **TypeScript错误**: 忽略AnchorProvider的类型错误，这是已知的TypeScript定义问题
2. **交易失败**: 检查钱包余额和网络连接
3. **PDA计算错误**: 确保种子字符串正确

### 调试步骤

1. 检查浏览器控制台日志
2. 验证钱包连接状态
3. 确认网络配置正确
4. 检查代币余额是否充足 