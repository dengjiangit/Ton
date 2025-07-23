const { Connection, PublicKey, Transaction, sendAndConfirmTransaction, Keypair } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');

/**
 * 创建Token 2022 ATA账户的脚本
 * 当您遇到TokenAccountNotFoundError时使用
 */

async function createToken2022ATA() {
  console.log('🏗️  Token 2022 ATA账户创建工具');
  console.log('=====================================\n');
  
  // 配置
  const connection = new Connection('https://api.devnet.solana.com');
  
  // 请替换为您的实际信息
  const CONFIG = {
    mintAddress: '', // 您的Token 2022 mint地址
    userWallet: '', // 您的钱包地址
    // 注意：这个脚本只是演示，实际创建需要在您的钱包中操作
  };
  
  console.log('📝 使用说明：');
  console.log('当您遇到 TokenAccountNotFoundError 时，说明您的钱包中还没有');
  console.log('这个Token 2022代币的Associated Token Account (ATA)。\n');
  
  console.log('🔧 解决方法有以下几种：');
  console.log('');
  
  console.log('方法1️⃣：让别人发送少量代币给您');
  console.log('- 这是最简单的方法');
  console.log('- 当别人向您发送Token 2022代币时，会自动创建ATA账户');
  console.log('- 只需要很少的代币（比如0.001个）');
  console.log('');
  
  console.log('方法2️⃣：在钱包中手动添加代币');
  console.log('- 在Phantom/Solflare等钱包中');
  console.log('- 点击"添加代币"或"Add Token"');
  console.log('- 输入Token 2022的mint地址');
  console.log('- 这样会创建ATA账户但余额为0');
  console.log('');
  
  console.log('方法3️⃣：使用spl-token命令行工具');
  console.log('```bash');
  console.log('# 为Token 2022创建ATA账户');
  console.log('spl-token create-account <MINT_ADDRESS> --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
  console.log('```');
  console.log('');
  
  if (CONFIG.mintAddress && CONFIG.userWallet) {
    try {
      const mintPubkey = new PublicKey(CONFIG.mintAddress);
      const userPubkey = new PublicKey(CONFIG.userWallet);
      
      console.log('🔍 检查您的Token 2022信息：');
      console.log('----------------------------');
      
      // 检查mint账户
      const mintInfo = await connection.getAccountInfo(mintPubkey);
      if (!mintInfo) {
        console.log('❌ 未找到mint账户，请检查地址');
        return;
      }
      
      const isToken2022 = mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
      console.log(`📋 Mint地址: ${CONFIG.mintAddress}`);
      console.log(`🎯 代币类型: ${isToken2022 ? '✅ Token 2022' : '❌ 不是Token 2022'}`);
      
      if (!isToken2022) {
        console.log('⚠️  这不是Token 2022代币，无需特殊处理');
        return;
      }
      
      // 计算ATA地址
      const ataAddress = await getAssociatedTokenAddress(
        mintPubkey,
        userPubkey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      console.log(`📍 您的ATA地址: ${ataAddress.toString()}`);
      
      // 检查ATA是否已存在
      const ataInfo = await connection.getAccountInfo(ataAddress);
      if (ataInfo) {
        console.log('✅ ATA账户已存在！');
        
        // 检查余额
        try {
          const { getAccount } = require('@solana/spl-token');
          const tokenAccount = await getAccount(connection, ataAddress, 'confirmed', TOKEN_2022_PROGRAM_ID);
          console.log(`💰 当前余额: ${Number(tokenAccount.amount)} tokens`);
          
          if (Number(tokenAccount.amount) > 0) {
            console.log('🎉 您已经有这个Token 2022代币了，可以直接创建红包！');
          } else {
            console.log('💡 账户存在但余额为0，您需要先获取一些代币');
          }
        } catch (error) {
          console.log('⚠️  无法读取余额信息:', error.message);
        }
      } else {
        console.log('❌ ATA账户不存在');
        console.log('');
        console.log('💡 创建ATA账户的指令：');
        console.log('```javascript');
        console.log('// 这是创建ATA的指令，需要在您的钱包中执行');
        console.log('const createATAInstruction = createAssociatedTokenAccountInstruction(');
        console.log('  userWallet,        // payer');
        console.log('  ataAddress,        // ata address');
        console.log('  userWallet,        // owner');
        console.log('  mintAddress,       // mint');
        console.log('  TOKEN_2022_PROGRAM_ID,');
        console.log('  ASSOCIATED_TOKEN_PROGRAM_ID');
        console.log(');');
        console.log('```');
      }
      
    } catch (error) {
      console.error('❌ 检查过程出错:', error.message);
    }
  }
  
  console.log('');
  console.log('🎯 推荐解决方案：');
  console.log('================');
  console.log('1. 找一个朋友发送少量Token 2022代币给您');
  console.log('2. 或者在钱包中手动添加这个代币');
  console.log('3. 确保ATA账户存在后，重新尝试创建红包');
  console.log('');
  console.log('❓ 为什么会出现这个问题？');
  console.log('Token 2022代币需要先创建Associated Token Account (ATA)');
  console.log('才能持有代币。这是Solana代币系统的标准流程。');
  console.log('');
  console.log('🚀 修复后的效果：');
  console.log('- ✅ 不再出现TokenAccountNotFoundError');
  console.log('- ✅ 余额检查正常');
  console.log('- ✅ 可以成功创建Token 2022红包');
}

// 运行脚本
createToken2022ATA().catch(console.error); 