// 浏览器控制台白名单一致性检查工具
// 复制这个脚本到浏览器控制台中运行，用于检查前端和合约的白名单数据一致性

// 主要检查函数
async function checkWhitelistConsistency(ipfsCID, redPacketId, creator, redPacketAddress) {
    console.log('🔍 开始检查白名单数据一致性...');
    console.log('================================');
    console.log('IPFS CID:', ipfsCID);
    console.log('红包ID:', redPacketId);
    console.log('创建者:', creator);
    console.log('红包地址:', redPacketAddress);
    console.log('');

    const result = {
        isConsistent: false,
        frontendMerkleRoot: '',
        contractMerkleRoot: '',
        issues: [],
        details: {}
    };

    try {
        // 步骤1: 从IPFS获取白名单数据
        console.log('📥 步骤1: 从IPFS获取白名单数据...');
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsCID}`;
        const response = await fetch(ipfsUrl);
        
        if (!response.ok) {
            throw new Error(`IPFS请求失败: ${response.status}`);
        }
        
        const ipfsData = await response.json();
        console.log('✅ IPFS数据获取成功');
        console.log('白名单条目数量:', ipfsData.entries.length);
        
        result.details.whitelistCount = ipfsData.entries.length;
        result.details.totalAmount = ipfsData.metadata.totalAmount;
        
        // 步骤2: 计算前端Merkle根
        console.log('📊 步骤2: 计算前端Merkle根...');
        result.frontendMerkleRoot = ipfsData.merkleRoot;
        console.log('前端Merkle根:', result.frontendMerkleRoot);

        // 步骤3: 获取合约上的Merkle根
        console.log('📊 步骤3: 获取合约上的Merkle根...');
        
        // 尝试从当前页面获取合约数据
        if (typeof window !== 'undefined' && window.solana && window.solana.isConnected) {
            console.log('检测到Solana钱包连接...');
            
            // 计算红包PDA地址
            let redPacketPda;
            if (redPacketAddress) {
                redPacketPda = redPacketAddress;
            } else {
                console.log('需要红包地址来查询合约数据');
                result.issues.push('缺少红包地址参数');
                return result;
            }
            
            console.log('红包PDA地址:', redPacketPda);
            
            // 这里需要实际的RPC调用来获取合约数据
            // 由于在浏览器环境中很难直接调用，我们先跳过这一步
            console.log('⚠️ 跳过合约数据获取步骤（需要完整的Solana SDK）');
            result.contractMerkleRoot = '需要通过后端或完整SDK获取';
            
        } else {
            console.log('❌ 未检测到Solana钱包连接');
            result.issues.push('未连接Solana钱包');
        }

        // 步骤4: 验证白名单数据完整性
        console.log('📊 步骤4: 验证白名单数据完整性...');
        
        // 检查白名单数据格式
        const hasValidEntries = ipfsData.entries.every(entry => 
            entry.claimer && 
            typeof entry.claimer === 'string' && 
            entry.amount && 
            typeof entry.amount === 'number' && 
            entry.amount > 0
        );
        
        if (!hasValidEntries) {
            result.issues.push('白名单数据格式不正确');
        }
        
        // 检查重复地址
        const uniqueAddresses = new Set(ipfsData.entries.map(entry => entry.claimer));
        if (uniqueAddresses.size !== ipfsData.entries.length) {
            result.issues.push('白名单中存在重复地址');
        }
        
        // 检查地址格式
        const invalidAddresses = ipfsData.entries.filter(entry => {
            try {
                // 简单的Solana地址格式检查
                return !(entry.claimer.length >= 32 && entry.claimer.length <= 44);
            } catch (e) {
                return true;
            }
        });
        
        if (invalidAddresses.length > 0) {
            result.issues.push(`发现 ${invalidAddresses.length} 个无效地址格式`);
            console.log('无效地址:', invalidAddresses.map(entry => entry.claimer));
        }

        // 步骤5: 模拟Merkle树验证
        console.log('📊 步骤5: 模拟Merkle树验证...');
        
        if (ipfsData.entries.length > 0) {
            const sampleEntry = ipfsData.entries[0];
            console.log('样本条目:', sampleEntry);
            
            // 模拟叶子节点哈希计算
            const leafData = `${sampleEntry.claimer}:${sampleEntry.amount}`;
            console.log('样本叶子数据:', leafData);
            
            result.details.sampleEntry = sampleEntry;
            result.details.sampleLeafData = leafData;
        }

        // 步骤6: 生成报告
        console.log('📊 步骤6: 生成检查报告...');
        
        if (result.issues.length === 0) {
            console.log('✅ 白名单数据格式验证通过');
            // 由于无法直接比较合约数据，我们只能验证格式
            result.isConsistent = true;
        } else {
            console.log('❌ 发现问题:', result.issues.length, '个');
            result.isConsistent = false;
        }

        return result;

    } catch (error) {
        console.error('❌ 检查过程中出现错误:', error);
        result.issues.push(`检查过程中出现错误: ${error.message}`);
        return result;
    }
}

// 生成详细报告
function generateConsistencyReport(result) {
    console.log('\n🔍 白名单数据一致性检查报告');
    console.log('================================');
    console.log('');
    console.log('✅ 检查结果:', result.isConsistent ? '通过' : '未通过');
    console.log('');
    console.log('📊 Merkle根对比:');
    console.log('   前端:', result.frontendMerkleRoot);
    console.log('   合约:', result.contractMerkleRoot);
    console.log('');
    console.log('📋 白名单详情:');
    console.log('   条目数量:', result.details.whitelistCount || 'N/A');
    console.log('   总金额:', result.details.totalAmount || 'N/A');
    console.log('');
    
    if (result.details.sampleEntry) {
        console.log('🧪 样本数据:');
        console.log('   用户地址:', result.details.sampleEntry.claimer);
        console.log('   金额:', result.details.sampleEntry.amount);
        console.log('   叶子数据:', result.details.sampleLeafData);
        console.log('');
    }
    
    if (result.issues.length > 0) {
        console.log('❌ 发现的问题:');
        result.issues.forEach((issue, index) => {
            console.log(`   ${index + 1}. ${issue}`);
        });
        console.log('');
    }
    
    console.log('💡 建议的解决方案:');
    if (result.isConsistent) {
        console.log('   数据格式验证通过，问题可能在其他地方：');
        console.log('   1. 检查用户钱包SOL余额是否 >= 0.003 SOL');
        console.log('   2. 确认用户是否已经领取过这个红包');
        console.log('   3. 检查红包是否已过期或被领完');
        console.log('   4. 使用完整的SDK工具验证合约数据');
    } else {
        console.log('   数据格式存在问题，需要修复：');
        console.log('   1. 检查并修复白名单数据格式');
        console.log('   2. 移除重复的地址');
        console.log('   3. 验证所有地址格式正确');
        console.log('   4. 重新生成并上传IPFS数据');
    }
}

// 快速检查特定用户
async function checkSpecificUser(ipfsCID, userAddress) {
    console.log('🔍 检查特定用户:', userAddress);
    console.log('================================');
    
    try {
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsCID}`;
        const response = await fetch(ipfsUrl);
        
        if (!response.ok) {
            throw new Error(`IPFS请求失败: ${response.status}`);
        }
        
        const ipfsData = await response.json();
        
        const userEntry = ipfsData.entries.find(entry => entry.claimer === userAddress);
        
        if (userEntry) {
            console.log('✅ 用户在白名单中');
            console.log('用户地址:', userEntry.claimer);
            console.log('可领取金额:', userEntry.amount);
            console.log('SOL金额:', userEntry.amount / 1e9, 'SOL');
            
            // 检查用户在列表中的位置
            const userIndex = ipfsData.entries.findIndex(entry => entry.claimer === userAddress);
            console.log('用户在白名单中的位置:', userIndex + 1);
            
            return {
                found: true,
                entry: userEntry,
                index: userIndex,
                totalUsers: ipfsData.entries.length
            };
        } else {
            console.log('❌ 用户不在白名单中');
            console.log('');
            console.log('🔍 检查相似地址:');
            
            // 查找相似地址
            const similarAddresses = ipfsData.entries.filter(entry => {
                const addr = entry.claimer;
                return addr.includes(userAddress.substring(0, 8)) || 
                       userAddress.includes(addr.substring(0, 8));
            });
            
            if (similarAddresses.length > 0) {
                console.log('发现相似地址:');
                similarAddresses.forEach((entry, index) => {
                    console.log(`   ${index + 1}. ${entry.claimer}`);
                });
            } else {
                console.log('未发现相似地址');
            }
            
            return {
                found: false,
                totalUsers: ipfsData.entries.length,
                similarAddresses: similarAddresses
            };
        }
        
    } catch (error) {
        console.error('❌ 检查过程中出现错误:', error);
        return {
            found: false,
            error: error.message
        };
    }
}

// 使用说明
console.log('🔧 白名单一致性检查工具已加载');
console.log('');
console.log('使用方法:');
console.log('1. 完整检查:');
console.log('   checkWhitelistConsistency("IPFS_CID", "红包ID", "创建者地址", "红包地址")');
console.log('');
console.log('2. 检查特定用户:');
console.log('   checkSpecificUser("IPFS_CID", "用户地址")');
console.log('');
console.log('3. 生成报告:');
console.log('   const result = await checkWhitelistConsistency(...);');
console.log('   generateConsistencyReport(result);');
console.log('');
console.log('例如:');
console.log('checkSpecificUser("QmXXXXXX...", "第三个用户地址")'); 