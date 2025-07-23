// 浏览器控制台调试脚本
// 复制这个脚本到浏览器控制台中运行

async function debugWhitelistAirdrop(ipfsCID, thirdUserAddress) {
    console.log('🔍 白名单空投调试脚本');
    console.log('================================');
    console.log('IPFS CID:', ipfsCID);
    console.log('第三个用户地址:', thirdUserAddress);
    console.log('');

    try {
        // 1. 从IPFS获取白名单数据
        console.log('📥 步骤1: 从IPFS获取白名单数据...');
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsCID}`;
        console.log('请求URL:', ipfsUrl);
        
        const response = await fetch(ipfsUrl);
        if (!response.ok) {
            throw new Error(`IPFS请求失败: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ IPFS数据获取成功');
        console.log('红包ID:', data.redPacketId);
        console.log('创建者:', data.creator);
        console.log('白名单总数:', data.entries.length);
        console.log('总金额:', data.metadata.totalAmount);
        console.log('');

        // 2. 检查所有白名单条目
        console.log('📋 步骤2: 检查白名单条目...');
        data.entries.forEach((entry, index) => {
            console.log(`用户${index + 1}:`);
            console.log(`  地址: ${entry.claimer}`);
            console.log(`  金额: ${entry.amount}`);
            
            if (entry.claimer === thirdUserAddress) {
                console.log(`  🎯 这是第三个用户！`);
            }
            console.log('');
        });

        // 3. 检查第三个用户是否在白名单中
        console.log('🔍 步骤3: 检查第三个用户...');
        const thirdUserEntry = data.entries.find(entry => entry.claimer === thirdUserAddress);
        
        if (thirdUserEntry) {
            console.log('✅ 第三个用户在白名单中');
            console.log('用户地址:', thirdUserEntry.claimer);
            console.log('可领取金额:', thirdUserEntry.amount);
            console.log('SOL金额:', thirdUserEntry.amount / 1e9, 'SOL');
            console.log('');
        } else {
            console.log('❌ 第三个用户不在白名单中');
            console.log('');
            
            // 检查地址是否有相似的
            console.log('🔍 检查是否有相似地址:');
            data.entries.forEach((entry, index) => {
                if (entry.claimer.includes(thirdUserAddress.substring(0, 10)) || 
                    thirdUserAddress.includes(entry.claimer.substring(0, 10))) {
                    console.log(`用户${index + 1} 可能相似: ${entry.claimer}`);
                }
            });
            return;
        }

        // 4. 检查Merkle树信息
        console.log('🌳 步骤4: 检查Merkle树信息...');
        console.log('叶子节点数量:', data.entries.length);
        console.log('Merkle根:', data.merkleRoot);
        console.log('');

        // 5. 模拟白名单服务验证
        console.log('🔍 步骤5: 模拟白名单服务验证...');
        
        // 尝试访问白名单服务
        if (typeof whitelistService !== 'undefined') {
            console.log('检查本地白名单服务...');
            const localWhitelistData = whitelistService.getWhitelistData(data.redPacketId, thirdUserAddress);
            if (localWhitelistData) {
                console.log('✅ 本地白名单服务验证成功');
                console.log('金额:', localWhitelistData.amount);
                console.log('证明长度:', localWhitelistData.proof.length);
            } else {
                console.log('❌ 本地白名单服务验证失败');
            }
        } else {
            console.log('❌ 无法访问本地白名单服务');
        }
        console.log('');

        // 6. 建议的解决方案
        console.log('💡 建议的解决方案:');
        if (thirdUserEntry) {
            console.log('1. 检查第三个用户的SOL余额是否 >= 0.003 SOL (用于支付手续费)');
            console.log('2. 确认第三个用户是否已经领取过这个红包');
            console.log('3. 检查红包是否已过期或者所有红包都被领完');
            console.log('4. 查看浏览器控制台的【白名单调试】日志');
            console.log('5. 尝试刷新页面重新领取');
            console.log('6. 确认钱包连接正常');
        } else {
            console.log('1. 检查第三个用户地址是否正确');
            console.log('2. 确认是否使用了正确的IPFS CID');
            console.log('3. 联系红包创建者确认白名单');
        }

        // 7. 返回数据供进一步检查
        console.log('');
        console.log('📊 调试数据摘要:');
        console.log('- 白名单总数:', data.entries.length);
        console.log('- 第三个用户在白名单中:', !!thirdUserEntry);
        console.log('- 第三个用户金额:', thirdUserEntry ? thirdUserEntry.amount : 'N/A');
        
        return {
            success: true,
            userInWhitelist: !!thirdUserEntry,
            userData: thirdUserEntry || null,
            totalEntries: data.entries.length,
            allData: data
        };

    } catch (error) {
        console.error('❌ 调试过程中出现错误:', error.message);
        console.log('');
        console.log('💡 可能的原因:');
        console.log('1. IPFS CID无效或网络问题');
        console.log('2. 白名单数据格式错误');
        console.log('3. 网络连接问题');
        console.log('4. CORS跨域限制');
        
        return {
            success: false,
            error: error.message
        };
    }
}

// 快速检查函数
function quickCheck(ipfsCID, userAddress) {
    console.log('🚀 快速检查模式');
    return debugWhitelistAirdrop(ipfsCID, userAddress);
}

// 使用说明
console.log('🔧 白名单空投调试工具已加载');
console.log('');
console.log('使用方法:');
console.log('debugWhitelistAirdrop("你的IPFS_CID", "第三个用户地址")');
console.log('');
console.log('快速检查:');
console.log('quickCheck("你的IPFS_CID", "第三个用户地址")');
console.log('');
console.log('例如:');
console.log('quickCheck("QmXXXXXX...", "9i8iCKV51wgnyjfxCpp18rYGac2bAPy247XPhyXrbPmP")'); 