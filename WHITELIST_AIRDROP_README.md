# 白名单红包（空投）功能说明

## 概述

白名单红包是基于Merkle树验证的定向空投功能，只有在预设白名单中的用户才能领取指定金额的代币。

## 工作原理

### 1. 合约层面

- **红包类型2**：白名单红包（Merkle树验证）
- **验证逻辑**：合约使用SHA256算法验证Merkle证明
- **安全性**：金额由合约根据Merkle证明确定，前端无法篡改

### 2. 前端实现

#### 文件结构
```
src/
├── utils/merkle.ts              # Merkle树工具类
├── services/whitelistService.ts # 白名单服务
└── hooks/useRedPacket.ts        # 红包钩子（已更新）
```

#### 核心组件

**MerkleTree类** (`utils/merkle.ts`)
- 使用SHA256算法（与合约一致）
- 叶子节点计算：`SHA256(claimer_address + amount)`
- 内部节点计算：`SHA256(sorted(left, right))`

**WhitelistService** (`services/whitelistService.ts`)
- 管理白名单数据
- 生成Merkle证明
- 验证用户权限

## 使用方法

### 1. 创建白名单红包

```typescript
import { whitelistService } from './services/whitelistService';
import { WhitelistEntry } from './utils/merkle';

// 准备白名单数据
const whitelist: WhitelistEntry[] = [
  {
    claimer: '用户钱包地址1',
    amount: 1000000  // 用户可领取的金额（最小单位）
  },
  {
    claimer: '用户钱包地址2', 
    amount: 2000000
  }
  // ... 更多用户
];

// 设置白名单并获取Merkle根
const merkleRoot = whitelistService.setWhitelist('红包ID', whitelist);

// 创建红包时使用该Merkle根
await createRedPacket({
  totalAmount: 总金额,
  packetCount: 白名单用户数量,
  redPacketType: 2,  // 白名单红包
  merkleRoot: Array.from(merkleRoot),  // 转换为数组格式
  isSol: true/false,
  expiryDays: 7
});
```

### 2. 用户领取流程

用户通过领取链接访问时：

1. **前端获取红包信息**：包括红包类型
2. **检查白名单**：如果是类型2红包，查询用户是否在白名单中
3. **生成Merkle证明**：为白名单用户生成证明
4. **调用合约**：传递金额和证明给合约验证
5. **合约验证**：使用SHA256验证Merkle证明
6. **转账**：验证通过后转账给用户

### 3. 测试数据

开发环境中已预设测试数据：
- 红包ID：`"test-1"` 或 `"1"`
- 测试钱包地址：`2BCV8gKNHKuaRJCySHGHFLLkw8xQZWYtBkEqzEFnZBbYrG`
- 可领取金额：1,000,000（最小单位）

## 关键技术细节

### 哈希算法一致性

⚠️ **重要**：前端和合约必须使用相同的哈希算法

- **合约**：SHA256 (`sha2` crate)
- **前端**：SHA256 (`crypto` module)
- **原实现问题**：前端使用Keccak256，导致验证失败

### 数据格式

**叶子节点计算**：
```rust
// 合约 (Rust)
let mut hasher = Sha256::new();
hasher.update(claimer.as_ref());        // 32字节
hasher.update(amount.to_le_bytes());    // 8字节，小端序
let leaf_hash = hasher.finalize();
```

```typescript
// 前端 (TypeScript)
const claimerBuffer = Buffer.from(new PublicKey(claimer).toBytes()); // 32字节
const amountBuffer = Buffer.alloc(8);
amountBuffer.writeBigUInt64LE(BigInt(amount), 0);                    // 8字节，小端序
const data = Buffer.concat([claimerBuffer, amountBuffer]);
const leafHash = createHash('sha256').update(data).digest();
```

### 合约参数

```typescript
// 调用合约时的参数格式
await program.methods.claimRedpacket(
  amount,      // Option<u64> - 白名单金额
  proof,       // Option<Vec<[u8; 32]>> - Merkle证明
  redPacketId  // u64 - 红包ID
)
```

## 生产环境部署

### 1. 后端API集成

替换 `getWhitelistData` 函数：

```typescript
const getWhitelistData = async (claimerAddress: string, redPacketId: string) => {
  const response = await fetch(`/api/whitelist/${redPacketId}/${claimerAddress}`);
  if (!response.ok) return null;
  return await response.json(); // { amount: number, proof: number[][] }
};
```

### 2. 白名单数据管理

- 后端维护白名单数据库
- 预计算Merkle树和证明
- 提供API查询用户权限

### 3. 安全考虑

- 白名单数据应加密存储
- API访问应有权限控制  
- Merkle根应在创建时固化到合约

## 调试建议

1. **检查哈希算法**：确保前后端使用相同算法
2. **验证数据格式**：地址和金额的字节序要一致
3. **测试Merkle证明**：本地验证证明有效性
4. **查看合约日志**：观察验证失败原因

## 常见问题

**Q: 用户不在白名单中怎么办？**
A: 前端会显示"您不在此红包的白名单中"提示

**Q: Merkle证明验证失败？**  
A: 检查哈希算法、数据格式、证明生成逻辑是否一致

**Q: 如何更新白名单？**
A: 白名单在红包创建时固化，无法修改。需要创建新红包。 