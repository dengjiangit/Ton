const { Connection, PublicKey } = require('@solana/web3.js');
const { AnchorProvider, Program, BN } = require('@coral-xyz/anchor');

// 配置
const RPC_URL = "https://devnet.helius-rpc.com/?api-key=a08565ed-9671-4cb4-8568-a014f810bfb2";
const RED_PACKET_PROGRAM_ID = 'RedGJbeNejUtP6vMEPDkG55yRf7oAbkMFGeDjXaNfe1';

// 从界面中获取的参数 - 请替换为实际值
const RED_PACKET_ID = '1'; // 替换为实际的红包ID
const CREATOR = 'CREATOR_ADDRESS_HERE'; // 替换为实际的创建者地址
const CLAIMER = 'CLAIMER_ADDRESS_HERE'; // 替换为实际的领取者地址

async function diagnoseClaimIssue() {
    console.log('🔍 开始诊断红包领取问题...\n');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    
    try {
        // 1. 检查程序是否存在
        console.log('1️⃣ 检查程序账户...');
        const programId = new PublicKey(RED_PACKET_PROGRAM_ID);
        const programAccount = await connection.getAccountInfo(programId);
        
        if (!programAccount) {
            console.error('❌ 程序账户不存在:', RED_PACKET_PROGRAM_ID);
            return;
        }
        console.log('✅ 程序账户存在\n');
        
        // 2. 计算红包PDA
        console.log('2️⃣ 计算红包PDA...');
        const redPacketIdNum = parseInt(RED_PACKET_ID);
        const creatorPk = new PublicKey(CREATOR);
        
        // 构造8字节的小端序Buffer
        const redPacketIdBuffer = Buffer.alloc(8);
        redPacketIdBuffer.writeUInt32LE(redPacketIdNum & 0xffffffff, 0);
        redPacketIdBuffer.writeUInt32LE(Math.floor(redPacketIdNum / 0x100000000), 4);
        
        const [redPacketPda] = await PublicKey.findProgramAddress(
            [
                Buffer.from("red_packet"),
                creatorPk.toBuffer(),
                redPacketIdBuffer,
            ],
            programId
        );
        
        console.log('红包PDA地址:', redPacketPda.toBase58());
        
        // 3. 检查红包账户是否存在
        console.log('3️⃣ 检查红包账户...');
        const redPacketAccount = await connection.getAccountInfo(redPacketPda);
        
        if (!redPacketAccount) {
            console.error('❌ 红包账户不存在');
            console.log('可能的原因:');
            console.log('- 红包ID不正确');
            console.log('- 创建者地址不正确');
            console.log('- 红包还未创建或创建失败');
            return;
        }
        
        console.log('✅ 红包账户存在');
        console.log('账户信息:');
        console.log('- Lamports:', redPacketAccount.lamports);
        console.log('- 数据长度:', redPacketAccount.data.length);
        console.log('- 所有者:', redPacketAccount.owner.toBase58());
        
        // 检查所有者是否正确
        if (redPacketAccount.owner.toBase58() !== RED_PACKET_PROGRAM_ID) {
            console.error('❌ 红包账户所有者不正确');
            console.log('期望所有者:', RED_PACKET_PROGRAM_ID);
            console.log('实际所有者:', redPacketAccount.owner.toBase58());
            return;
        }
        console.log('✅ 红包账户所有者正确\n');
        
        // 4. 检查用户状态PDA
        console.log('4️⃣ 检查用户状态PDA...');
        const claimerPk = new PublicKey(CLAIMER);
        const [userStatePda] = await PublicKey.findProgramAddress(
            [
                Buffer.from("user_state"),
                redPacketPda.toBuffer(),
                claimerPk.toBuffer(),
            ],
            programId
        );
        
        console.log('用户状态PDA地址:', userStatePda.toBase58());
        
        const userStateAccount = await connection.getAccountInfo(userStatePda);
        if (userStateAccount) {
            console.log('✅ 用户状态账户已存在');
            console.log('- Lamports:', userStateAccount.lamports);
            console.log('- 数据长度:', userStateAccount.data.length);
            
            // 检查是否已领取
            if (userStateAccount.data.length > 8) {
                const isClaimed = userStateAccount.data[8]; // 第9个字节是is_claimed
                console.log('- 是否已领取:', isClaimed === 1 ? '是' : '否');
                
                if (isClaimed === 1) {
                    console.log('⚠️ 该用户已领取过此红包');
                    return;
                }
            }
        } else {
            console.log('ℹ️ 用户状态账户不存在，领取时将自动创建');
        }
        
        // 5. 检查用户SOL余额
        console.log('\n5️⃣ 检查用户余额...');
        const userBalance = await connection.getBalance(claimerPk);
        console.log('用户SOL余额:', userBalance / 1e9, 'SOL');
        
        const minRentExemption = await connection.getMinimumBalanceForRentExemption(100);
        const requiredBalance = minRentExemption + 5000000; // 创建账户 + 手续费
        
        if (userBalance < requiredBalance) {
            console.error('❌ 用户SOL余额不足');
            console.log('需要最少:', requiredBalance / 1e9, 'SOL');
            console.log('当前余额:', userBalance / 1e9, 'SOL');
            console.log('建议: 请先充值SOL到钱包');
            return;
        }
        console.log('✅ 用户SOL余额充足\n');
        
        console.log('🎉 初步诊断完成，所有基础检查都通过');
        console.log('如果仍然无法领取，可能是以下原因:');
        console.log('- 红包已过期');
        console.log('- 红包已被领完');
        console.log('- 白名单验证失败(如果是白名单红包)');
        console.log('- 网络连接问题');
        
    } catch (error) {
        console.error('❌ 诊断过程中出现错误:', error.message);
        console.log('\n请检查:');
        console.log('1. 网络连接是否正常');
        console.log('2. RPC节点是否可访问');
        console.log('3. 地址格式是否正确');
    }
}

// 运行诊断
console.log('红包领取问题诊断工具');
console.log('========================');
console.log('请在脚本中替换以下参数:');
console.log('- RED_PACKET_ID: 红包ID');
console.log('- CREATOR: 创建者地址');
console.log('- CLAIMER: 领取者地址');
console.log('========================\n');

if (RED_PACKET_ID === '1' || CREATOR === 'CREATOR_ADDRESS_HERE' || CLAIMER === 'CLAIMER_ADDRESS_HERE') {
    console.log('⚠️ 请先替换脚本中的参数再运行');
    console.log('替换参数:');
    console.log('- const RED_PACKET_ID = "你的红包ID";');
    console.log('- const CREATOR = "创建者地址";');
    console.log('- const CLAIMER = "领取者地址";');
} else {
    diagnoseClaimIssue();
} 