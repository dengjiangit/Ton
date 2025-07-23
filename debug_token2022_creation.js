const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');

/**
 * 调试Token 2022红包创建问题
 * 使用方法：node debug_token2022_creation.js
 */

async function debugToken2022Creation() {
  console.log('🔧 Token 2022 红包创建问题调试工具');
  console.log('=====================================\n');
  
  // 配置
  const connection = new Connection('https://api.devnet.solana.com');
  
  // 请替换为您的实际地址
  const CONFIG = {
    mintAddress: '', // 您的Token 2022 mint地址
    userWallet: '', // 您的钱包地址
    redPacketPda: '' // 红包PDA地址（可选）
  };
  
  // 如果没有配置地址，显示使用说明
  if (!CONFIG.mintAddress || !CONFIG.userWallet) {
    console.log('📝 使用说明：');
    console.log('1. 编辑此文件，在CONFIG对象中填入：');
    console.log('   - mintAddress: 您的Token 2022代币mint地址');
    console.log('   - userWallet: 您的钱包地址');
    console.log('2. 重新运行：node debug_token2022_creation.js\n');
    
    console.log('💡 如何获取Token 2022代币地址：');
    console.log('   - 在Solana Explorer搜索Token 2022代币');
    console.log('   - 确认Program ID为: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    console.log('   - 复制mint地址\n');
    
    return;
  }
  
  try {
    const mintPubkey = new PublicKey(CONFIG.mintAddress);
    const userPubkey = new PublicKey(CONFIG.userWallet);
    
    console.log('🔍 步骤1: 检测代币程序类型');
    console.log('----------------------------');
    
    // 1. 检测代币程序类型
    const mintAccountInfo = await connection.getAccountInfo(mintPubkey);
    if (!mintAccountInfo) {
      throw new Error('❌ 未找到mint账户，请检查地址是否正确');
    }
    
    const isToken2022 = mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
    const tokenProgramId = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    
    console.log(`📋 Mint地址: ${CONFIG.mintAddress}`);
    console.log(`📋 Program ID: ${mintAccountInfo.owner.toString()}`);
    console.log(`🎯 代币类型: ${isToken2022 ? '✅ Token 2022' : '❌ SPL Token'}`);
    console.log(`🔧 应使用程序: ${tokenProgramId.toString()}\n`);
    
    if (!isToken2022) {
      console.log('⚠️  这不是Token 2022代币！');
      console.log('   如果您确实想测试Token 2022，请使用正确的Token 2022 mint地址。\n');
      return;
    }
    
    console.log('🔍 步骤2: 计算ATA地址');
    console.log('-------------------');
    
    // 2. 计算ATA地址
    console.log('🔄 使用SPL Token程序ID计算ATA...');
    const splTokenAta = await getAssociatedTokenAddress(
      mintPubkey, 
      userPubkey, 
      false, 
      TOKEN_PROGRAM_ID
    );
    console.log(`📍 SPL Token ATA: ${splTokenAta.toString()}`);
    
    console.log('🔄 使用Token 2022程序ID计算ATA...');
    const token2022Ata = await getAssociatedTokenAddress(
      mintPubkey, 
      userPubkey, 
      false, 
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`📍 Token 2022 ATA: ${token2022Ata.toString()}`);
    
    console.log(`🎯 ATA地址${splTokenAta.equals(token2022Ata) ? '相同' : '不同'}`);
    
    if (!splTokenAta.equals(token2022Ata)) {
      console.log('⚠️  使用错误的程序ID会计算出错误的ATA地址！');
    }
    console.log('');
    
    console.log('🔍 步骤3: 检查账户余额');
    console.log('---------------------');
    
    // 3. 检查账户余额
    const correctAta = token2022Ata;
    
    try {
      console.log('🔄 使用SPL Token程序ID检查余额...');
      const splTokenAccount = await getAccount(connection, correctAta, 'confirmed', TOKEN_PROGRAM_ID);
      console.log(`✅ SPL Token检查成功: ${Number(splTokenAccount.amount)} tokens`);
    } catch (error) {
      console.log(`❌ SPL Token检查失败: ${error.message}`);
    }
    
    try {
      console.log('🔄 使用Token 2022程序ID检查余额...');
      const token2022Account = await getAccount(connection, correctAta, 'confirmed', TOKEN_2022_PROGRAM_ID);
      console.log(`✅ Token 2022检查成功: ${Number(token2022Account.amount)} tokens`);
    } catch (error) {
      console.log(`❌ Token 2022检查失败: ${error.message}`);
    }
    
    console.log('');
    
    console.log('🔍 步骤4: 修复建议');
    console.log('----------------');
    
    console.log('💡 在CreateRedPacket.tsx中，确保：');
    console.log('');
    console.log('1️⃣ ATA地址计算：');
    console.log('```typescript');
    console.log('const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");');
    console.log('creatorAta = await getAssociatedTokenAddress(');
    console.log('  mint,');
    console.log('  publicKey,'); 
    console.log('  false,');
    console.log('  TOKEN_2022_PROGRAM_ID  // 🔥 关键');
    console.log(');');
    console.log('```');
    console.log('');
    
    console.log('2️⃣ 余额检查：');
    console.log('```typescript');
    console.log('const tokenAccount = await getAccount(');
    console.log('  connection,');
    console.log('  creatorAta,');
    console.log('  "confirmed",');
    console.log('  TOKEN_2022_PROGRAM_ID  // 🔥 关键');
    console.log(');');
    console.log('```');
    console.log('');
    
    console.log('3️⃣ 合约调用：');
    console.log('```typescript');
    console.log('keys: [');
    console.log('  // ... 其他账户');
    console.log('  { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false }, // 🔥 关键');
    console.log('  // ... 其他账户');
    console.log(']');
    console.log('```');
    console.log('');
    
    console.log('🎯 修复后的预期结果：');
    console.log('- ✅ 控制台显示：检测到token程序: Token 2022');
    console.log('- ✅ ATA地址计算正确');
    console.log('- ✅ 余额检查成功');
    console.log('- ✅ 红包创建成功');
    console.log('');
    
    console.log('🚀 下一步：');
    console.log('1. 按照上述建议修改CreateRedPacket.tsx');
    console.log('2. 重新尝试创建红包');
    console.log('3. 观察控制台日志确认修复效果');
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error.message);
    console.log('');
    console.log('💡 可能的原因：');
    console.log('- mint地址格式不正确');
    console.log('- 网络连接问题');
    console.log('- mint账户不存在');
    console.log('');
    console.log('🔧 解决方法：');
    console.log('1. 检查mint地址是否正确');
    console.log('2. 确认网络连接正常');
    console.log('3. 在Solana Explorer验证mint账户存在');
  }
  
  console.log('');
  console.log('=====================================');
  console.log('🎉 调试完成！希望这些信息对您有帮助。');
}

// 运行调试
debugToken2022Creation().catch(console.error); 