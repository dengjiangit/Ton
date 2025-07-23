const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');

async function debugClaim() {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // 这里需要替换为实际的值
    const CLAIMER_PUBKEY = "YOUR_CLAIMER_PUBKEY"; // 替换为实际的领取者公钥
    const RED_PACKET_PDA = "YOUR_RED_PACKET_PDA"; // 替换为实际的红包PDA
    const MINT_ADDRESS = "YOUR_MINT_ADDRESS"; // 替换为实际的代币mint地址
    
    console.log('=== SPL代币领取调试信息 ===');
    
    try {
        const claimerPk = new PublicKey(CLAIMER_PUBKEY);
        const redPacketPda = new PublicKey(RED_PACKET_PDA);
        const mintPk = new PublicKey(MINT_ADDRESS);
        
        // 1. 检查用户SOL余额
        const solBalance = await connection.getBalance(claimerPk);
        console.log('1. 用户SOL余额:', solBalance / 1e9, 'SOL');
        
        // 2. 计算所需费用
        const CLAIM_FEE = 1000000; // 0.001 SOL
        const ATA_RENT = 2039280; // ~0.00203928 SOL
        const TRANSACTION_FEE = 5000; // ~0.000005 SOL
        
        // 3. 检查用户ATA
        const userAta = await getAssociatedTokenAddress(mintPk, claimerPk);
        const userAtaInfo = await connection.getAccountInfo(userAta);
        const needCreateAta = !userAtaInfo;
        
        console.log('2. 用户ATA地址:', userAta.toString());
        console.log('3. 用户ATA状态:', needCreateAta ? '不存在，需要创建' : '已存在');
        
        // 4. 计算总费用
        let totalRequired = CLAIM_FEE + TRANSACTION_FEE;
        if (needCreateAta) {
            totalRequired += ATA_RENT;
        }
        
        console.log('4. 费用明细:');
        console.log('   - 领取费用:', CLAIM_FEE / 1e9, 'SOL');
        console.log('   - ATA创建费用:', needCreateAta ? ATA_RENT / 1e9 : 0, 'SOL');
        console.log('   - 交易费用:', TRANSACTION_FEE / 1e9, 'SOL');
        console.log('   - 总计需要:', totalRequired / 1e9, 'SOL');
        
        // 5. 余额检查结果
        const sufficient = solBalance >= totalRequired;
        console.log('5. 余额检查:', sufficient ? '✅ 充足' : '❌ 不足');
        
        if (!sufficient) {
            const shortfall = (totalRequired - solBalance) / 1e9;
            console.log('   还需要:', shortfall.toFixed(6), 'SOL');
        }
        
        // 6. 检查红包池子ATA
        const poolAta = await getAssociatedTokenAddress(mintPk, redPacketPda, true);
        const poolAtaInfo = await connection.getAccountInfo(poolAta);
        
        console.log('6. 红包池子ATA地址:', poolAta.toString());
        console.log('7. 红包池子ATA状态:', poolAtaInfo ? '存在' : '不存在');
        
        if (poolAtaInfo) {
            console.log('   - 数据长度:', poolAtaInfo.data.length);
            console.log('   - 所有者:', poolAtaInfo.owner.toString());
        }
        
        console.log('\n=== 建议 ===');
        if (!sufficient) {
            console.log(`❌ 请先充值 ${(totalRequired - solBalance) / 1e9} SOL 到钱包`);
        }
        if (needCreateAta) {
            console.log('ℹ️  首次领取此代币需要创建关联代币账户');
        }
        if (!poolAtaInfo) {
            console.log('❌ 红包池子ATA不存在，红包可能有问题');
        }
        
    } catch (error) {
        console.error('调试过程中出现错误:', error);
    }
}

// 使用说明
console.log('使用说明:');
console.log('1. 请在脚本中替换 CLAIMER_PUBKEY, RED_PACKET_PDA, MINT_ADDRESS 为实际值');
console.log('2. 运行: node debug_claim.js');
console.log('');

// 如果提供了参数，直接运行
if (process.argv.length > 2) {
    debugClaim();
} else {
    console.log('请提供必要的参数或修改脚本中的常量');
} 