# Solana红包合约测试

这个目录包含了用于测试Solana红包合约的Node.js测试脚本。

## 环境要求

- Node.js 14+
- npm 或 yarn

## 安装

1. 安装依赖：
```bash
npm install
```

2. 创建 `.env` 文件并设置你的钱包私钥：
```
WALLET_PRIVATE_KEY=你的钱包私钥（base58格式）
```

## 使用方法

1. 修改 `test_redpacket.js` 中的程序ID：
```javascript
const RED_PACKET_PROGRAM_ID = new PublicKey('你的程序ID');
```

2. 运行测试：
```bash
npm test
```

## 测试内容

- 创建SOL红包
- 创建SPL Token红包（需要配置Token Mint地址）

## 注意事项

1. 确保钱包中有足够的SOL支付交易费用
2. 如果要测试SPL Token红包，需要：
   - 配置正确的Token Mint地址
   - 确保钱包中有足够的Token
   - 取消注释相关测试代码

## 错误处理

如果遇到错误，请检查：
1. 钱包私钥是否正确
2. 程序ID是否正确
3. 网络连接是否正常
4. 账户余额是否充足 