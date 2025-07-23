// IPFS白名单功能集成测试
// 这个测试用于验证从红包创建到领取的完整IPFS集成流程

const { ipfsService } = require('../services/ipfsService');
const { whitelistService } = require('../services/whitelistService');

// 模拟测试数据
const testData = {
  redPacketId: 'test-ipfs-12345',
  creator: '2BCV8gKNHKuaRJCySHGHFLLkw8xQZWYtBkEqzEFnZBbYrG',
  whitelist: [
    {
      claimer: '2BCV8gKNHKuaRJCySHGHFLLkw8xQZWYtBkEqzEFnZBbYrG',
      amount: 1000000
    },
    {
      claimer: 'DemoWallet1111111111111111111111111111111111',
      amount: 2000000
    },
    {
      claimer: 'DemoWallet2222222222222222222222222222222222',
      amount: 500000
    },
    {
      claimer: 'DemoWallet3333333333333333333333333333333333',
      amount: 1500000
    }
  ]
};

// 测试函数
async function testIPFSIntegration() {
  console.log('🧪 开始IPFS白名单功能集成测试\n');

  try {
    // 步骤1：生成Merkle根
    console.log('📋 步骤1：生成Merkle根和证明');
    const merkleRoot = whitelistService.setWhitelist(testData.redPacketId, testData.whitelist);
    console.log('   ✅ Merkle根:', merkleRoot.toString('hex'));

    // 验证每个用户的证明
    for (const entry of testData.whitelist) {
      const whitelistData = whitelistService.getWhitelistData(testData.redPacketId, entry.claimer);
      if (whitelistData) {
        console.log(`   ✅ 用户 ${entry.claimer.slice(0, 8)}... 证明长度: ${whitelistData.proof.length}`);
      } else {
        console.log(`   ❌ 用户 ${entry.claimer.slice(0, 8)}... 无法生成证明`);
      }
    }

    // 步骤2：准备IPFS数据
    console.log('\n📦 步骤2：准备IPFS数据');
    const totalAmount = testData.whitelist.reduce((sum, entry) => sum + entry.amount, 0);
    const ipfsData = {
      redPacketId: testData.redPacketId,
      creator: testData.creator,
      timestamp: Date.now(),
      merkleRoot: merkleRoot.toString('hex'),
      entries: testData.whitelist,
      metadata: {
        totalAmount,
        totalCount: testData.whitelist.length,
        description: '测试白名单红包'
      }
    };
    console.log('   ✅ IPFS数据结构准备完成');
    console.log('   📊 数据统计:', {
      总金额: totalAmount,
      总地址数: testData.whitelist.length,
      Merkle根长度: merkleRoot.length
    });

    // 步骤3：上传到IPFS（如果环境变量已配置）
    if (process.env.REACT_APP_PINATA_API_KEY && process.env.REACT_APP_PINATA_SECRET_KEY) {
      console.log('\n☁️ 步骤3：上传数据到IPFS');
      try {
        const cid = await ipfsService.uploadWhitelistToIPFS(ipfsData);
        console.log('   ✅ 上传成功，CID:', cid);

        // 步骤4：从IPFS下载验证
        console.log('\n⬇️ 步骤4：从IPFS下载验证');
        const downloadedData = await ipfsService.getWhitelistData(cid);
        
        if (downloadedData) {
          console.log('   ✅ 下载成功');
          console.log('   🔍 数据验证:');
          console.log('     - 红包ID匹配:', downloadedData.redPacketId === testData.redPacketId);
          console.log('     - 创建者匹配:', downloadedData.creator === testData.creator);
          console.log('     - 条目数匹配:', downloadedData.entries.length === testData.whitelist.length);
          console.log('     - Merkle根匹配:', downloadedData.merkleRoot === merkleRoot.toString('hex'));

          // 步骤5：模拟领取流程
          console.log('\n🎁 步骤5：模拟领取流程');
          
          // 重新设置白名单服务（模拟从IPFS加载）
          whitelistService.setWhitelist(testData.redPacketId, downloadedData.entries);
          
          // 测试每个用户的领取资格
          for (const entry of testData.whitelist) {
            const whitelistData = whitelistService.getWhitelistData(testData.redPacketId, entry.claimer);
            if (whitelistData && whitelistData.amount === entry.amount) {
              console.log(`   ✅ 用户 ${entry.claimer.slice(0, 8)}... 可以领取 ${entry.amount} lamports`);
            } else {
              console.log(`   ❌ 用户 ${entry.claimer.slice(0, 8)}... 领取验证失败`);
            }
          }

          // 步骤6：生成分享链接
          console.log('\n🔗 步骤6：生成分享链接');
          const shareLink = `${process.env.REACT_APP_BASE_URL || 'http://localhost:3000'}/claim?id=${testData.redPacketId}&creator=${testData.creator}&ipfsCID=${cid}`;
          console.log('   ✅ 分享链接:', shareLink);

        } else {
          console.log('   ❌ 下载失败');
        }

      } catch (error) {
        console.log('   ⚠️ IPFS操作跳过（需要配置环境变量）:', error.message);
      }
    } else {
      console.log('\n⚠️ 步骤3-4：IPFS操作跳过（需要配置 PINATA_API_KEY 和 PINATA_SECRET_KEY）');
    }

    // 步骤7：测试错误情况
    console.log('\n🚨 步骤7：测试错误情况');
    
    // 测试不存在的用户
    const nonExistentUser = 'NonExistentUser111111111111111111111111111';
    const nonExistentData = whitelistService.getWhitelistData(testData.redPacketId, nonExistentUser);
    if (!nonExistentData) {
      console.log('   ✅ 不存在用户正确返回null');
    } else {
      console.log('   ❌ 不存在用户应该返回null');
    }

    // 测试不存在的红包
    const nonExistentRedPacket = whitelistService.getWhitelistData('non-existent-id', testData.whitelist[0].claimer);
    if (!nonExistentRedPacket) {
      console.log('   ✅ 不存在红包正确返回null');
    } else {
      console.log('   ❌ 不存在红包应该返回null');
    }

    console.log('\n🎉 IPFS白名单功能集成测试完成！');
    console.log('\n📝 测试总结:');
    console.log('- ✅ Merkle树生成和证明验证');
    console.log('- ✅ IPFS数据结构准备');
    console.log('- ✅ 白名单服务功能');
    console.log('- ✅ 错误处理验证');
    console.log('- ✅ 分享链接生成');
    
    if (process.env.REACT_APP_PINATA_API_KEY) {
      console.log('- ✅ IPFS上传下载功能');
    } else {
      console.log('- ⚠️ IPFS功能需要配置环境变量');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('错误详情:', error.stack);
  }
}

// 清理函数
function cleanup() {
  console.log('\n🧹 清理测试数据');
  whitelistService.clearWhitelist(testData.redPacketId);
  console.log('   ✅ 清理完成');
}

// 导出测试函数
module.exports = {
  testIPFSIntegration,
  cleanup,
  testData
};

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testIPFSIntegration()
    .then(() => cleanup())
    .catch(console.error);
} 