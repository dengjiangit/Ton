// Merkle验证问题调试脚本
// 在浏览器控制台中运行此脚本来诊断问题

const debugMerkleVerification = async () => {
    console.log('🔍 开始Merkle验证调试...');
    
    // 1. 获取当前用户信息
    const userAddress = "3z8NAtqooN1BesSQ4D3a3FjmSPscC9fJAimssZMT2jaW";
    console.log('👤 用户地址:', userAddress);
    
    // 2. 获取红包信息 (请根据实际情况修改)
    const redPacketId = "请替换为实际的红包ID";
    const ipfsCID = "请替换为实际的IPFS CID";
    
    try {
        // 3. 从IPFS获取白名单数据
        console.log('📦 从IPFS获取白名单数据...');
        const ipfsData = await ipfsService.getWhitelistData(ipfsCID);
        
        if (!ipfsData) {
            console.error('❌ 无法获取IPFS数据');
            return;
        }
        
        console.log('📊 IPFS数据统计:');
        console.log('   - 总条目数:', ipfsData.entries.length);
        console.log('   - 创建者:', ipfsData.creator);
        console.log('   - 时间戳:', new Date(ipfsData.timestamp));
        console.log('   - 存储的Merkle根:', ipfsData.merkleRoot);
        
        // 4. 检查用户是否在白名单中
        console.log('🔍 检查用户是否在白名单中...');
        const userEntry = ipfsData.entries.find(entry => entry.claimer === userAddress);
        
        if (!userEntry) {
            console.error('❌ 用户不在白名单中');
            console.log('📝 所有白名单地址:');
            ipfsData.entries.forEach((entry, index) => {
                console.log(`   ${index + 1}. ${entry.claimer} (${entry.amount})`);
            });
            return;
        }
        
        console.log('✅ 用户在白名单中:', userEntry);
        
        // 5. 重新生成Merkle树
        console.log('🌳 重新生成Merkle树...');
        const merkleTree = new MerkleTree(ipfsData.entries);
        const computedRoot = merkleTree.getRoot().toString('hex');
        
        console.log('📊 Merkle树信息:');
        console.log('   - 重新计算的根:', computedRoot);
        console.log('   - 存储的根:', ipfsData.merkleRoot);
        console.log('   - 根是否匹配:', computedRoot === ipfsData.merkleRoot);
        
        // 6. 生成和验证Merkle证明
        console.log('🔐 生成Merkle证明...');
        const proof = merkleTree.getProof(userEntry);
        
        console.log('📋 证明信息:');
        console.log('   - 证明长度:', proof.length);
        console.log('   - 证明内容:', proof.map(p => p.toString('hex')));
        
        // 7. 本地验证证明
        console.log('✅ 本地验证证明...');
        const isLocalValid = MerkleTree.verifyProof(merkleTree.getRoot(), userEntry, proof);
        console.log('   - 本地验证结果:', isLocalValid);
        
        // 8. 生成用于合约的证明格式
        console.log('📤 生成合约格式证明...');
        const proofForContract = proof.map(buffer => Array.from(buffer));
        
        // 9. 模拟合约验证过程
        console.log('🔧 模拟合约验证过程...');
        
        // 计算叶子节点哈希（与合约相同的方式）
        const { PublicKey } = require('@solana/web3.js');
        const claimerBuffer = Buffer.from(new PublicKey(userEntry.claimer).toBytes());
        const amountBuffer = Buffer.alloc(8);
        amountBuffer.writeBigUInt64LE(BigInt(userEntry.amount), 0);
        
        console.log('🧮 叶子节点计算:');
        console.log('   - 用户地址字节:', claimerBuffer.toString('hex'));
        console.log('   - 金额字节:', amountBuffer.toString('hex'));
        console.log('   - 组合数据:', Buffer.concat([claimerBuffer, amountBuffer]).toString('hex'));
        
        // 10. 输出调试信息
        console.log('\n📋 调试报告总结:');
        console.log('='.repeat(50));
        console.log('用户地址:', userAddress);
        console.log('红包ID:', redPacketId);
        console.log('IPFS CID:', ipfsCID);
        console.log('用户在白名单中:', !!userEntry);
        console.log('用户金额:', userEntry?.amount);
        console.log('Merkle根匹配:', computedRoot === ipfsData.merkleRoot);
        console.log('本地验证通过:', isLocalValid);
        console.log('证明长度:', proof.length);
        console.log('='.repeat(50));
        
        // 11. 提供解决方案
        if (!isLocalValid) {
            console.log('❌ 本地验证失败，可能的原因:');
            console.log('   1. 数据排序不一致');
            console.log('   2. 哈希算法实现差异');
            console.log('   3. 数据序列化问题');
        } else if (computedRoot !== ipfsData.merkleRoot) {
            console.log('❌ Merkle根不匹配，可能的原因:');
            console.log('   1. IPFS数据已过时');
            console.log('   2. 数据在存储过程中被修改');
            console.log('   3. 数据排序问题');
        } else {
            console.log('✅ 本地验证通过，问题可能在:');
            console.log('   1. 合约上的Merkle根与IPFS不匹配');
            console.log('   2. 用户已经领取过');
            console.log('   3. 红包已过期');
            console.log('   4. 余额不足');
        }
        
        // 12. 返回有用的数据
        return {
            userEntry,
            proof: proofForContract,
            computedRoot,
            storedRoot: ipfsData.merkleRoot,
            isLocalValid,
            rootMatches: computedRoot === ipfsData.merkleRoot
        };
        
    } catch (error) {
        console.error('❌ 调试过程中发生错误:', error);
        throw error;
    }
};

// 运行调试脚本
console.log('🚀 使用方法:');
console.log('1. 修改脚本中的 userAddress、redPacketId、ipfsCID');
console.log('2. 运行: await debugMerkleVerification()');
console.log('3. 查看控制台输出的调试信息');

// 自动运行（如果参数已配置）
if (typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
    debugMerkleVerification().catch(console.error);
} 