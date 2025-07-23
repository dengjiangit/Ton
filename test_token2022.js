const { Connection, PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } = require('@solana/spl-token');

// 测试Token 2022检测功能
async function testToken2022Detection() {
  const connection = new Connection('https://api.devnet.solana.com');
  
  console.log('=== Token 2022 检测测试 ===\n');
  
  // 测试用的mint地址（请替换为实际的Token 2022地址）
  const testMints = [
    // 示例SPL Token mint（如果你有的话）
    // 'So11111111111111111111111111111111111111112', // Wrapped SOL
    
    // 示例Token 2022 mint（需要实际的Token 2022地址）
    // 'YourToken2022MintAddressHere',
  ];
  
  // 检测函数（复制自我们的工具文件）
  async function isToken2022(connection, mintAddress) {
    try {
      const mintPubkey = typeof mintAddress === 'string' 
        ? new PublicKey(mintAddress) 
        : mintAddress;
      
      const accountInfo = await connection.getAccountInfo(mintPubkey, 'confirmed');
      
      if (!accountInfo) {
        console.log('  ❌ 未找到mint账户');
        return false;
      }
      
      const isToken2022 = accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
      const ownerProgram = accountInfo.owner.toString();
      
      console.log(`  📋 账户owner: ${ownerProgram}`);
      console.log(`  🎯 是否为Token 2022: ${isToken2022 ? '✅ 是' : '❌ 否'}`);
      
      return isToken2022;
    } catch (error) {
      console.log(`  ❌ 检测失败: ${error.message}`);
      return false;
    }
  }
  
  async function getTokenProgramId(connection, mintAddress) {
    const isT2022 = await isToken2022(connection, mintAddress);
    return isT2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  }
  
  // 如果没有测试地址，创建一些示例
  if (testMints.length === 0) {
    console.log('📝 没有提供测试mint地址，请添加一些Token 2022地址到testMints数组中\n');
    
    console.log('如何获取Token 2022地址：');
    console.log('1. 访问 https://explorer.solana.com');
    console.log('2. 搜索已知的Token 2022代币');
    console.log('3. 确认Program ID为: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    console.log('4. 复制mint地址到testMints数组中\n');
    
    // 显示程序ID对比
    console.log('程序ID对比：');
    console.log(`SPL Token:    ${TOKEN_PROGRAM_ID.toString()}`);
    console.log(`Token 2022:   ${TOKEN_2022_PROGRAM_ID.toString()}\n`);
    
    return;
  }
  
  // 测试每个mint地址
  for (let i = 0; i < testMints.length; i++) {
    const mintAddress = testMints[i];
    console.log(`🧪 测试 ${i + 1}: ${mintAddress}`);
    
    try {
      const programId = await getTokenProgramId(connection, mintAddress);
      console.log(`  🎉 推荐使用程序: ${programId.toString()}`);
      
      if (programId.equals(TOKEN_2022_PROGRAM_ID)) {
        console.log('  ✅ 这是一个Token 2022代币！');
      } else {
        console.log('  ℹ️  这是一个标准SPL Token代币');
      }
      
    } catch (error) {
      console.log(`  ❌ 测试失败: ${error.message}`);
    }
    
    console.log(''); // 空行分隔
  }
  
  console.log('=== 测试完成 ===');
}

// 运行测试
testToken2022Detection().catch(console.error); 