import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';

// 从控制台日志中提取的信息
const RED_PACKET_INFO = {
    id: '39', // 从控制台看到的ID
    creator: '9i8iCKV51wgnyjfxCpp18rYGac2bAPy247XPhyXrbPmP',
    redPacketType: 0,
    isSol: true
};

const RED_PACKET_PROGRAM_ID = '7rSdaJc2nJafXjKD39nxmhkmCexUFQsCisg42oyRsqvt';
const RED_PACKET_SEED = 'red_packet';
const USER_STATE_SEED = 'user_state';

async function checkTransactionStatus() {
    console.log('=== 交易状态和代币到账检查 ===');
    console.log('检查红包ID:', RED_PACKET_INFO.id);
    console.log('');

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    try {
        // 请替换为您的钱包地址
        const CLAIMER_ADDRESS = 'YOUR_WALLET_ADDRESS'; // 需要替换为实际的钱包地址
        
        if (CLAIMER_ADDRESS === 'YOUR_WALLET_ADDRESS') {
            console.log('❌ 请在脚本中设置您的钱包地址');
            console.log('请修改 CLAIMER_ADDRESS 变量为您的实际钱包地址');
            return;
        }
        
        const claimerPk = new PublicKey(CLAIMER_ADDRESS);
        const creatorPk = new PublicKey(RED_PACKET_INFO.creator);
        const redPacketIdNum = parseInt(RED_PACKET_INFO.id);
        const programId = new PublicKey(RED_PACKET_PROGRAM_ID);
        
        console.log('【步骤1】检查当前SOL余额...');
        const currentBalance = await connection.getBalance(claimerPk);
        console.log('当前SOL余额:', currentBalance / 1e9, 'SOL');
        console.log('');
        
        console.log('【步骤2】计算PDA地址...');
        const redPacketIdBuffer = Buffer.alloc(8);
        redPacketIdBuffer.writeUInt32LE(redPacketIdNum & 0xffffffff, 0);
        redPacketIdBuffer.writeUInt32LE(Math.floor(redPacketIdNum / 0x100000000), 4);
        
        const [redPacketPda] = await PublicKey.findProgramAddress(
            [
                Buffer.from(RED_PACKET_SEED),
                creatorPk.toBuffer(),
                redPacketIdBuffer,
            ],
            programId
        );
        
        const [userStatePda] = await PublicKey.findProgramAddress(
            [
                Buffer.from(USER_STATE_SEED),
                redPacketPda.toBuffer(),
                claimerPk.toBuffer(),
            ],
            programId
        );
        
        console.log('红包PDA地址:', redPacketPda.toString());
        console.log('用户状态PDA地址:', userStatePda.toString());
        console.log('');
        
        console.log('【步骤3】检查用户状态账户...');
        const userStateAccountInfo = await connection.getAccountInfo(userStatePda);
        
        if (userStateAccountInfo) {
            console.log('⚠️ 用户状态账户存在');
            console.log('- 账户大小:', userStateAccountInfo.data.length, 'bytes');
            console.log('- 账户所有者:', userStateAccountInfo.owner.toString());
            console.log('- 账户余额:', userStateAccountInfo.lamports / 1e9, 'SOL');
            
            // 尝试解析账户数据（简单方式）
            if (userStateAccountInfo.data.length > 0) {
                const firstByte = userStateAccountInfo.data[0];
                console.log('- 首字节数据:', firstByte);
                console.log('- 可能的领取状态:', firstByte === 1 ? '已领取' : '未领取');
            }
        } else {
            console.log('✅ 用户状态账户不存在，表示未领取');
        }
        console.log('');
        
        console.log('【步骤4】检查红包账户状态...');
        const redPacketAccountInfo = await connection.getAccountInfo(redPacketPda);
        
        if (redPacketAccountInfo) {
            console.log('✅ 红包账户存在');
            console.log('- 账户大小:', redPacketAccountInfo.data.length, 'bytes');
            console.log('- 账户余额:', redPacketAccountInfo.lamports / 1e9, 'SOL');
            console.log('- 账户所有者:', redPacketAccountInfo.owner.toString());
        } else {
            console.log('❌ 红包账户不存在');
        }
        console.log('');
        
        console.log('【步骤5】检查最近的交易记录...');
        try {
            const signatures = await connection.getSignaturesForAddress(claimerPk, { limit: 10 });
            console.log('最近10笔交易:');
            
            for (let i = 0; i < Math.min(signatures.length, 5); i++) {
                const sig = signatures[i];
                console.log(`${i + 1}. 交易哈希: ${sig.signature.substring(0, 20)}...`);
                console.log(`   时间: ${new Date(sig.blockTime * 1000).toLocaleString()}`);
                console.log(`   状态: ${sig.err ? '失败' : '成功'}`);
                
                // 获取交易详情
                try {
                    const tx = await connection.getTransaction(sig.signature, {
                        maxSupportedTransactionVersion: 0
                    });
                    
                    if (tx && tx.meta) {
                        const preBalance = tx.meta.preBalances[0] || 0;
                        const postBalance = tx.meta.postBalances[0] || 0;
                        const balanceChange = (postBalance - preBalance) / 1e9;
                        
                        console.log(`   余额变化: ${balanceChange > 0 ? '+' : ''}${balanceChange.toFixed(6)} SOL`);
                        
                        // 检查是否与红包程序相关
                        if (tx.transaction && tx.transaction.message && tx.transaction.message.accountKeys) {
                            const accountKeys = tx.transaction.message.accountKeys.map(key => 
                                typeof key === 'string' ? key : key.toString()
                            );
                            const isRedPacketTx = accountKeys.includes(RED_PACKET_PROGRAM_ID);
                            console.log(`   红包相关: ${isRedPacketTx ? '是' : '否'}`);
                        }
                    }
                } catch (txError) {
                    console.log(`   详情获取失败: ${txError.message}`);
                }
                console.log('');
            }
        } catch (sigError) {
            console.log('获取交易记录失败:', sigError.message);
        }
        
        console.log('【步骤6】问题诊断结果...');
        
        // 根据检查结果给出诊断
        if (userStateAccountInfo && redPacketAccountInfo) {
            if (userStateAccountInfo.data.length > 0 && userStateAccountInfo.data[0] === 1) {
                console.log('🔍 诊断结果: 系统显示您已经领取过，但您说代币未到账');
                console.log('');
                console.log('可能的原因:');
                console.log('1. 交易成功但代币到账时间延迟');
                console.log('2. 网络状态不同步');
                console.log('3. 代币发送到了其他地址');
                console.log('4. 系统记录错误');
                console.log('');
                console.log('建议解决方案:');
                console.log('1. 等待10-15分钟后再次检查余额');
                console.log('2. 刷新钱包应用');
                console.log('3. 检查是否有其他钱包地址');
                console.log('4. 联系技术支持并提供用户状态PDA地址');
            } else {
                console.log('🔍 诊断结果: 系统显示未领取，但出现"已处理"错误');
                console.log('');
                console.log('可能的原因:');
                console.log('1. 临时的网络状态不一致');
                console.log('2. RPC节点缓存问题');
                console.log('3. 交易池中有重复交易');
                console.log('');
                console.log('建议解决方案:');
                console.log('1. 等待5-10分钟后重试');
                console.log('2. 清除浏览器缓存');
                console.log('3. 刷新页面后重新连接钱包');
                console.log('4. 尝试在网络较空闲时重试');
            }
        } else if (!redPacketAccountInfo) {
            console.log('❌ 诊断结果: 红包账户不存在，可能红包信息有误');
        } else {
            console.log('✅ 诊断结果: 红包存在但用户未领取，可以尝试重新领取');
        }
        
        console.log('');
        console.log('【技术支持信息】');
        console.log('如需技术支持，请提供以下信息:');
        console.log('- 钱包地址:', CLAIMER_ADDRESS);
        console.log('- 红包PDA:', redPacketPda.toString());
        console.log('- 用户状态PDA:', userStatePda.toString());
        console.log('- 用户状态账户存在:', userStateAccountInfo ? '是' : '否');
        console.log('- 当前SOL余额:', currentBalance / 1e9, 'SOL');
        
    } catch (error) {
        console.error('检查过程中出现错误:', error);
        console.log('');
        console.log('请检查:');
        console.log('1. 网络连接是否正常');
        console.log('2. 钱包地址格式是否正确');
        console.log('3. 是否连接到正确的网络');
    }
}

console.log('交易状态和代币到账检查工具');
console.log('用于诊断"已处理"错误但代币未到账的问题');
console.log('');
console.log('使用说明:');
console.log('1. 请将 CLAIMER_ADDRESS 替换为您的钱包地址');
console.log('2. 运行: node check_transaction_status.js');
console.log('');

// 直接运行检查
checkTransactionStatus(); 