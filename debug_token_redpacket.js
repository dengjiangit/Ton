const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const { getAssociatedTokenAddress, getAccount, getTokenProgramId } = require('@solana/spl-token');

// 配置
const RPC_URL = "https://devnet.helius-rpc.com/?api-key=a08565ed-9671-4cb4-8568-a014f810bfb2";
const RED_PACKET_PROGRAM_ID = new PublicKey("RedGJbeNejUtP6vMEPDkG55yRf7oAbkMFGeDjXaNfe1");
const CREATOR_STATE_SEED = "creator_state";
const RED_PACKET_SEED = "red_packet";

async function diagnoseSPLTokenCreation(creatorAddress, tokenMintAddress) {
  console.log('🔍 诊断SPL Token红包创建问题...\n');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  const creator = new PublicKey(creatorAddress);
  const mint = new PublicKey(tokenMintAddress);
  
  try {
    // 1. 检查程序是否存在
    console.log('1️⃣ 检查红包程序...');
    const programInfo = await connection.getAccountInfo(RED_PACKET_PROGRAM_ID);
    if (!programInfo) {
      console.log('❌ 红包程序不存在:', RED_PACKET_PROGRAM_ID.toString());
      return;
    }
    console.log('✅ 红包程序存在');
    
    // 2. 检查Token Mint
    console.log('\n2️⃣ 检查Token Mint...');
    const mintInfo = await connection.getAccountInfo(mint);
    if (!mintInfo) {
      console.log('❌ Token Mint不存在:', mint.toString());
      return;
    }
    console.log('✅ Token Mint存在');
    
    // 3. 检测Token程序类型
    console.log('\n3️⃣ 检测Token程序类型...');
    const tokenProgramId = await getTokenProgramId(connection, mint);
    const tokenType = tokenProgramId.toString() === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' ? 'Token 2022' : 'SPL Token';
    console.log(`✅ 检测到: ${tokenType} (${tokenProgramId.toString()})`);
    
    // 4. 计算Creator State PDA
    console.log('\n4️⃣ 计算Creator State PDA...');
    const [creatorStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(CREATOR_STATE_SEED), creator.toBuffer()],
      RED_PACKET_PROGRAM_ID
    );
    console.log('Creator State PDA:', creatorStatePda.toString());
    
    // 检查Creator State是否存在
    const creatorStateInfo = await connection.getAccountInfo(creatorStatePda);
    if (!creatorStateInfo) {
      console.log('❌ Creator State不存在，需要先初始化');
      console.log('💡 建议：先创建一个SOL红包来初始化Creator State');
      return;
    }
    console.log('✅ Creator State存在');
    
    // 5. 计算创建者ATA地址
    console.log('\n5️⃣ 检查创建者Token账户...');
    const creatorAta = await getAssociatedTokenAddress(
      mint,
      creator,
      false,
      tokenProgramId
    );
    console.log('创建者ATA地址:', creatorAta.toString());
    
    try {
      const creatorAtaInfo = await connection.getAccountInfo(creatorAta);
      if (!creatorAtaInfo) {
        console.log('❌ 创建者Token账户不存在');
        console.log('💡 解决方案：请先接收一些该Token以创建账户');
        return;
      }
      
      const tokenAccount = await getAccount(connection, creatorAta, 'confirmed', tokenProgramId);
      console.log('✅ 创建者Token账户存在');
      console.log(`💰 余额: ${tokenAccount.amount.toString()}`);
      
      if (tokenAccount.amount === 0n) {
        console.log('⚠️  Token余额为0，无法创建红包');
        return;
      }
      
    } catch (error) {
      console.log('❌ 无法获取创建者Token账户信息:', error.message);
      return;
    }
    
    // 6. 计算下一个红包ID
    console.log('\n6️⃣ 计算红包PDA...');
    const creatorStateData = creatorStateInfo.data;
    let nextRedPacketId;
    
    if (creatorStateData.length >= 8) {
      // 读取next_red_packet_id (u64, little-endian)
      nextRedPacketId = creatorStateData.readBigUInt64LE(0);
    } else {
      console.log('❌ Creator State数据格式异常');
      return;
    }
    
    console.log(`下一个红包ID: ${nextRedPacketId}`);
    
    // 计算红包PDA
    const redPacketIdBuffer = Buffer.alloc(8);
    redPacketIdBuffer.writeBigUInt64LE(nextRedPacketId);
    
    const [redPacketPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(RED_PACKET_SEED),
        creator.toBuffer(),
        redPacketIdBuffer,
      ],
      RED_PACKET_PROGRAM_ID
    );
    console.log('红包PDA地址:', redPacketPda.toString());
    
    // 7. 计算Pool ATA地址
    console.log('\n7️⃣ 检查Pool ATA地址...');
    const poolAta = await getAssociatedTokenAddress(
      mint,
      redPacketPda,
      true, // allowOwnerOffCurve = true for PDA
      tokenProgramId
    );
    console.log('Pool ATA地址:', poolAta.toString());
    
    const poolAtaInfo = await connection.getAccountInfo(poolAta);
    if (poolAtaInfo) {
      console.log('⚠️  Pool ATA已存在，这可能导致创建失败');
      console.log('💡 建议：使用新的红包ID或清理旧账户');
    } else {
      console.log('✅ Pool ATA不存在（正常，将在创建时建立）');
    }
    
    // 8. 检查SOL余额用于支付费用
    console.log('\n8️⃣ 检查SOL余额...');
    const solBalance = await connection.getBalance(creator);
    const solBalanceSOL = solBalance / 1e9;
    console.log(`SOL余额: ${solBalanceSOL.toFixed(4)} SOL`);
    
    if (solBalance < 10_000_000) { // 0.01 SOL
      console.log('⚠️  SOL余额较低，可能无法支付交易费用');
    } else {
      console.log('✅ SOL余额充足');
    }
    
    // 9. 总结
    console.log('\n📋 诊断总结:');
    console.log('- 红包程序: ✅');
    console.log('- Token Mint: ✅');
    console.log(`- Token类型: ${tokenType}`);
    console.log('- Creator State: ✅');
    console.log('- 创建者Token账户: ✅');
    console.log('- SOL余额: ✅');
    console.log(`- 下一个红包ID: ${nextRedPacketId}`);
    
    console.log('\n🎯 如果仍然失败，请检查以下事项:');
    console.log('1. 确保使用正确的Token地址');
    console.log('2. 确保Token账户有足够余额');
    console.log('3. 检查红包参数是否合理（数量、金额等）');
    console.log('4. 确认网络连接正常');
    console.log('5. 尝试使用更高的Gas费用');
    
  } catch (error) {
    console.error('❌ 诊断过程中出错:', error);
  }
}

// 使用示例
if (require.main === module) {
  const creatorAddress = process.argv[2];
  const tokenMintAddress = process.argv[3];
  
  if (!creatorAddress || !tokenMintAddress) {
    console.log('使用方法: node debug_token_redpacket.js <创建者地址> <Token地址>');
    console.log('例如: node debug_token_redpacket.js 你的钱包地址 So11111111111111111111111111111111111111112');
    process.exit(1);
  }
  
  diagnoseSPLTokenCreation(creatorAddress, tokenMintAddress);
}

module.exports = { diagnoseSPLTokenCreation }; 