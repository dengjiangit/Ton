const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');

async function debugThirdClaim() {
    console.log('=== 第三个用户领取失败调试 ===');
    
    // 从控制台日志中提取的信息
    const redPacketInfo = {
        id: 31,
        creator: '9i8iCkV5lWgnYjfXCppi9rYGa2bA5Y247XPhYXnPmP',
        totalAmount: '12776020492',
        remainingAmount: '12776020492', 
        packetCount: 10,  // 总数量
        claimedCount: 2,  // 已领取数量
        isSol: false,
        expiryTime: 1735189543, // 2025/6/21 16:45:43
    };
    
    const currentTime = Math.floor(Date.now() / 1000);
    
    console.log('1. 红包基本信息:');
    console.log('   - ID:', redPacketInfo.id);
    console.log('   - 创建者:', redPacketInfo.creator);
    console.log('   - 总金额:', redPacketInfo.totalAmount);
    console.log('   - 剩余金额:', redPacketInfo.remainingAmount);
    console.log('   - 总数量:', redPacketInfo.packetCount);
    console.log('   - 已领取:', redPacketInfo.claimedCount);
    console.log('   - 类型:', redPacketInfo.isSol ? 'SOL' : 'SPL代币');
    
    console.log('\n2. 时间检查:');
    console.log('   - 过期时间:', redPacketInfo.expiryTime, '(', new Date(redPacketInfo.expiryTime * 1000).toLocaleString(), ')');
    console.log('   - 当前时间:', currentTime, '(', new Date(currentTime * 1000).toLocaleString(), ')');
    console.log('   - 是否过期:', currentTime >= redPacketInfo.expiryTime ? '❌ 已过期' : '✅ 未过期');
    
    console.log('\n3. 数量检查:');
    console.log('   - 已领取数量:', redPacketInfo.claimedCount);
    console.log('   - 总数量:', redPacketInfo.packetCount);
    console.log('   - 还能领取:', redPacketInfo.claimedCount < redPacketInfo.packetCount ? '✅ 是' : '❌ 否');
    console.log('   - 剩余份数:', redPacketInfo.packetCount - redPacketInfo.claimedCount);
    
    console.log('\n4. 金额检查:');
    console.log('   - 剩余金额:', redPacketInfo.remainingAmount);
    console.log('   - 金额充足:', parseInt(redPacketInfo.remainingAmount) > 0 ? '✅ 是' : '❌ 否');
    
    console.log('\n5. 可能的失败原因分析:');
    
    // 检查是否过期
    if (currentTime >= redPacketInfo.expiryTime) {
        console.log('   ❌ 红包已过期');
        return;
    }
    
    // 检查是否抢完
    if (redPacketInfo.claimedCount >= redPacketInfo.packetCount) {
        console.log('   ❌ 红包已被抢完');
        return;
    }
    
    // 检查剩余金额
    if (parseInt(redPacketInfo.remainingAmount) <= 0) {
        console.log('   ❌ 红包余额不足');
        return;
    }
    
    console.log('   ✅ 红包状态正常，应该可以领取');
    console.log('   🔍 失败原因可能是:');
    console.log('      - 用户SOL余额不足（需要约0.003 SOL创建ATA + 费用）');
    console.log('      - 用户已经领取过（重复领取）');
    console.log('      - 网络问题或RPC节点问题');
    console.log('      - 交易被其他用户抢先处理');
    console.log('      - 合约程序内部错误');
    
    console.log('\n6. 建议的调试步骤:');
    console.log('   1. 检查用户SOL余额是否 >= 0.005 SOL');
    console.log('   2. 检查用户是否已经领取过此红包');
    console.log('   3. 尝试刷新页面重新领取');
    console.log('   4. 查看详细的错误日志');
    console.log('   5. 使用区块链浏览器查看红包状态');
}

debugThirdClaim(); 