import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';

// 红包信息
const RED_PACKET_INFO = {
    id: '38',
    creator: '9i8iCKV51wgnyjfxCpp18rYGac2bAPy247XPhyXrbPmP',
    redPacketType: 0, // 普通固定金额红包
    isSol: true,
    tokenName: 'SOL'
};

// 程序常量
const RED_PACKET_PROGRAM_ID = '7rSdaJc2nJafXjKD39nxmhkmCexUFQsCisg42oyRsqvt'; // 红包程序ID
const RED_PACKET_SEED = 'red_packet';
const USER_STATE_SEED = 'user_state';

async function debugSpecificClaim() {
    console.log('=== 红包领取问题诊断 ===');
    console.log('红包信息:', RED_PACKET_INFO);
    console.log('');

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    try {
        // 替换为您的钱包地址进行测试
        const CLAIMER_ADDRESS = 'YOUR_WALLET_ADDRESS'; // 需要替换为实际的钱包地址
        
        if (CLAIMER_ADDRESS === 'YOUR_WALLET_ADDRESS') {
            console.log('❌ 请在脚本中设置您的钱包地址');
            console.log('请修改 CLAIMER_ADDRESS 变量为您的实际钱包地址');
            return;
        }
        
        const claimerPk = new PublicKey(CLAIMER_ADDRESS);
        const creatorPk = new PublicKey(RED_PACKET_INFO.creator);
        const redPacketIdNum = parseInt(RED_PACKET_INFO.id);
        
        console.log('【步骤1】检查用户SOL余额...');
        const solBalance = await connection.getBalance(claimerPk);
        console.log('用户SOL余额:', solBalance / 1e9, 'SOL');
        
        // 计算所需费用
        const CLAIM_FEE = 1000000; // 0.001 SOL
        const TRANSACTION_FEE = 5000; // ~0.000005 SOL
        const totalRequired = CLAIM_FEE + TRANSACTION_FEE;
        
        console.log('所需费用:');
        console.log('- 领取费用:', CLAIM_FEE / 1e9, 'SOL');
        console.log('- 交易费用:', TRANSACTION_FEE / 1e9, 'SOL');
        console.log('- 总计需要:', totalRequired / 1e9, 'SOL');
        
        const sufficientBalance = solBalance >= totalRequired;
        console.log('余额检查:', sufficientBalance ? '✅ 充足' : '❌ 不足');
        if (!sufficientBalance) {
            const shortfall = (totalRequired - solBalance) / 1e9;
            console.log('还需要:', shortfall.toFixed(6), 'SOL');
        }
        console.log('');
        
        console.log('【步骤2】计算红包PDA地址...');
        // 手动构造8字节的小端序Buffer
        const redPacketIdBuffer = Buffer.alloc(8);
        redPacketIdBuffer.writeUInt32LE(redPacketIdNum & 0xffffffff, 0);
        redPacketIdBuffer.writeUInt32LE(Math.floor(redPacketIdNum / 0x100000000), 4);
        
        console.log('程序ID:', RED_PACKET_PROGRAM_ID);
        
        const programId = new PublicKey(RED_PACKET_PROGRAM_ID);
        const [redPacketPda] = await PublicKey.findProgramAddress(
            [
                Buffer.from(RED_PACKET_SEED),
                creatorPk.toBuffer(),
                redPacketIdBuffer,
            ],
            programId
        );
        
        console.log('红包PDA地址:', redPacketPda.toString());
        console.log('');
        
        console.log('【步骤3】检查红包账户状态...');
        const redPacketAccountInfo = await connection.getAccountInfo(redPacketPda);
        if (!redPacketAccountInfo) {
            console.log('❌ 红包账户不存在');
            console.log('可能的原因:');
            console.log('1. 红包ID或创建者地址错误');
            console.log('2. 程序ID不正确');
            console.log('3. 红包未创建成功');
            return;
        }
        
        console.log('✅ 红包账户存在');
        console.log('- 数据长度:', redPacketAccountInfo.data.length);
        console.log('- 所有者:', redPacketAccountInfo.owner.toString());
        console.log('- SOL余额:', redPacketAccountInfo.lamports / 1e9, 'SOL');
        console.log('');
        
        console.log('【步骤4】计算用户状态PDA地址...');
        const [userStatePda] = await PublicKey.findProgramAddress(
            [
                Buffer.from(USER_STATE_SEED),
                redPacketPda.toBuffer(),
                claimerPk.toBuffer(),
            ],
            programId
        );
        
        console.log('用户状态PDA地址:', userStatePda.toString());
        
        const userStateAccountInfo = await connection.getAccountInfo(userStatePda);
        if (userStateAccountInfo) {
            console.log('⚠️ 用户状态账户已存在');
            console.log('- 数据长度:', userStateAccountInfo.data.length);
            console.log('这可能意味着您已经领取过这个红包');
        } else {
            console.log('✅ 用户状态账户不存在，可以领取');
        }
        console.log('');
        
        console.log('【步骤5】检查费用接收者地址...');
        const feeReceiver = new PublicKey('15hPXzWgid1UWUKnp4KvtZEbaNUCWkPK79cb5uqHysf');
        const feeReceiverInfo = await connection.getAccountInfo(feeReceiver);
        console.log('费用接收者地址:', feeReceiver.toString());
        console.log('费用接收者账户:', feeReceiverInfo ? '存在' : '不存在');
        console.log('');
        
        console.log('【诊断总结】');
        const issues = [];
        const suggestions = [];
        
        if (!sufficientBalance) {
            issues.push('SOL余额不足');
            suggestions.push(`请向钱包充值至少 ${(totalRequired - solBalance) / 1e9} SOL`);
        }
        
        if (userStateAccountInfo) {
            issues.push('可能已经领取过');
            suggestions.push('检查交易历史确认是否已经成功领取');
        }
        
        if (!redPacketAccountInfo) {
            issues.push('红包账户不存在');
            suggestions.push('检查红包ID和创建者地址是否正确');
        }
        
        if (issues.length === 0) {
            console.log('✅ 未发现明显问题，红包应该可以正常领取');
            console.log('');
            console.log('如果仍然失败，可能的原因:');
            console.log('1. 网络拥堵，请稍后重试');
            console.log('2. 红包已被抢完');
            console.log('3. 红包已过期');
            console.log('4. 钱包连接问题');
        } else {
            console.log('❌ 发现以下问题:');
            issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue}`);
            });
            console.log('');
            console.log('💡 建议解决方案:');
            suggestions.forEach((suggestion, index) => {
                console.log(`${index + 1}. ${suggestion}`);
            });
        }
        
    } catch (error) {
        console.error('诊断过程中出现错误:', error);
        console.log('');
        console.log('常见错误原因:');
        console.log('1. 网络连接问题');
        console.log('2. RPC节点响应缓慢');
        console.log('3. 地址格式错误');
        console.log('4. 程序ID不正确');
    }
}

console.log('红包领取问题诊断工具');
console.log('');
console.log('使用说明:');
console.log('1. 请在脚本中设置 CLAIMER_ADDRESS（您的钱包地址）');
console.log('2. 请设置正确的 RED_PACKET_PROGRAM_ID');
console.log('3. 运行: node debug_specific_claim.js');
console.log('');

// 直接运行诊断
debugSpecificClaim(); 