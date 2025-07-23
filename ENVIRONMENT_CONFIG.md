# 环境变量配置说明

## 白名单数据源配置

本应用支持多种白名单数据获取方式，通过环境变量控制：

### 📁 创建 `.env` 文件

在项目根目录创建 `.env` 文件：

```bash
# 白名单API配置
REACT_APP_USE_API=false                    # 是否使用后端API (true/false)
REACT_APP_API_URL=http://localhost:3001    # 后端API地址

# Solana网络配置
REACT_APP_SOLANA_NETWORK=devnet            # mainnet-beta/devnet/testnet
REACT_APP_SOLANA_RPC_URL=https://api.devnet.solana.com

# 程序ID配置
REACT_APP_RED_PACKET_PROGRAM_ID=HqSDjxnoR35q8uRMG3LDDvbJ9Hqj4H4bWMPAsBF1hqJq

# 开发环境配置
NODE_ENV=development                       # development/production

# IPFS配置（可选）
REACT_APP_IPFS_GATEWAY=https://ipfs.io/ipfs/
REACT_APP_IPFS_API=https://api.pinata.cloud

# 认证配置（如果需要）
REACT_APP_AUTH_REQUIRED=false
REACT_APP_AUTH_URL=http://localhost:3001/auth
```

## 🔄 数据获取策略

### 开发环境 (`NODE_ENV=development`)
- **数据源**：本地硬编码测试数据
- **位置**：`services/whitelistService.ts`
- **优点**：快速测试，无需外部依赖
- **缺点**：数据有限，仅用于演示

### 生产环境 (`NODE_ENV=production` 或 `REACT_APP_USE_API=true`)
- **主要数据源**：后端API
- **降级策略**：IPFS（如果配置）
- **API端点**：`${REACT_APP_API_URL}/api/whitelist/{redPacketId}/{claimerAddress}`

## 🌐 后端API要求

### API接口规范

**GET** `/api/whitelist/{redPacketId}/{claimerAddress}`

**响应格式**：
```json
{
  "amount": 1000000,
  "proof": [
    [1, 2, 3, ...],  // 32字节数组
    [4, 5, 6, ...],  // 32字节数组
    // ... 更多证明节点
  ]
}
```

**错误响应**：
- `404`：用户不在白名单中
- `500`：服务器错误

### 示例后端实现 (Node.js + Express)

```javascript
const express = require('express');
const app = express();

// 白名单查询接口
app.get('/api/whitelist/:redPacketId/:claimerAddress', async (req, res) => {
  const { redPacketId, claimerAddress } = req.params;
  
  try {
    // 1. 查询数据库
    const whitelistEntry = await db.query(
      'SELECT * FROM whitelist WHERE red_packet_id = ? AND claimer_address = ? AND is_active = 1',
      [redPacketId, claimerAddress]
    );
    
    if (!whitelistEntry) {
      return res.status(404).json({ error: '用户不在白名单中' });
    }
    
    // 2. 生成或获取预计算的Merkle证明
    const merkleProof = await generateMerkleProof(redPacketId, claimerAddress);
    
    res.json({
      amount: whitelistEntry.amount,
      proof: merkleProof
    });
  } catch (error) {
    console.error('白名单查询失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.listen(3001, () => {
  console.log('白名单API服务运行在端口 3001');
});
```

## 🗂️ 数据库设计

### 白名单表结构

```sql
CREATE TABLE whitelist (
  id INT PRIMARY KEY AUTO_INCREMENT,
  red_packet_id VARCHAR(64) NOT NULL,
  claimer_address VARCHAR(44) NOT NULL,
  amount BIGINT NOT NULL,
  merkle_proof JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_claim (red_packet_id, claimer_address),
  INDEX idx_red_packet (red_packet_id),
  INDEX idx_claimer (claimer_address)
);
```

### 红包配置表

```sql
CREATE TABLE red_packet_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  red_packet_id VARCHAR(64) NOT NULL UNIQUE,
  creator_address VARCHAR(44) NOT NULL,
  merkle_root VARCHAR(64) NOT NULL,
  total_amount BIGINT NOT NULL,
  packet_count INT NOT NULL,
  ipfs_hash VARCHAR(128),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔗 IPFS集成（可选）

### 上传白名单到IPFS

```javascript
const pinata = require('@pinata/sdk');
const pinataSDK = pinata(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_KEY);

async function uploadWhitelistToIPFS(redPacketId, whitelistData) {
  const metadata = {
    redPacketId,
    timestamp: Date.now(),
    entries: whitelistData,
    merkleRoot: calculateMerkleRoot(whitelistData)
  };
  
  const result = await pinataSDK.pinJSONToIPFS(metadata, {
    pinataMetadata: {
      name: `whitelist-${redPacketId}`,
      keyvalues: {
        redPacketId: redPacketId,
        type: 'whitelist'
      }
    }
  });
  
  return result.IpfsHash;
}
```

### 从IPFS获取白名单

```javascript
async function getWhitelistFromIPFS(ipfsHash, claimerAddress) {
  const response = await fetch(`${process.env.REACT_APP_IPFS_GATEWAY}${ipfsHash}`);
  const data = await response.json();
  
  const userEntry = data.entries.find(entry => entry.claimer === claimerAddress);
  if (!userEntry) return null;
  
  // 本地生成Merkle证明
  const merkleTree = new MerkleTree(data.entries);
  const proof = merkleTree.getProof(userEntry);
  
  return {
    amount: userEntry.amount,
    proof: proof.map(buffer => Array.from(buffer))
  };
}
```

## 🚀 部署配置

### 开发环境启动

```bash
# 使用本地测试数据
NODE_ENV=development npm start
```

### 生产环境配置

```bash
# 使用后端API
export REACT_APP_USE_API=true
export REACT_APP_API_URL=https://api.yourapp.com
export NODE_ENV=production
npm run build
```

## 🔒 安全考虑

1. **API认证**：生产环境需要认证机制
2. **数据加密**：敏感数据应加密存储
3. **访问控制**：限制API访问频率
4. **数据验证**：验证Merkle证明有效性
5. **缓存策略**：合理使用缓存减轻服务器压力

## 📊 监控和日志

建议在生产环境中添加：
- API调用日志
- 白名单查询统计
- 错误监控和告警
- 性能指标收集 