const { Connection, PublicKey } = require('@solana/web3.js');
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');

// 常量配置
const RED_PACKET_PROGRAM_ID = new PublicKey('7rSdaJc2nJafXjKD39nxmhkmCexUFQsCisg42oyRsqvt');
const connection = new Connection('https://api.devnet.solana.com');

// 诊断函数
async function debugClaimIssue(redPacketId, creator, claimer) {
    console.log('🔍 开始诊断红包领取问题...\n');
    
    try {
        // 1. 检查基本参数
        console.log('📋 基本参数检查:');
        console.log(`- 红包ID: ${redPacketId}`);
        console.log(`- 创建者: ${creator}`);
        console.log(`- 领取者: ${claimer}\n`);
        
        // 2. 构造PDA
        const redPacketIdNum = parseInt(redPacketId);
        const creatorPk = new PublicKey(creator);
        const claimerPk = new PublicKey(claimer);
        
        const redPacketIdBuffer = Buffer.alloc(8);
        redPacketIdBuffer.writeUInt32LE(redPacketIdNum & 0xffffffff, 0);
        redPacketIdBuffer.writeUInt32LE(Math.floor(redPacketIdNum / 0x100000000), 4);
        
        const [redPacketPda] = await PublicKey.findProgramAddress(
            [
                Buffer.from("red_packet"),
                creatorPk.toBuffer(),
                redPacketIdBuffer,
            ],
            RED_PACKET_PROGRAM_ID
        );
        
        const [userStatePda] = await PublicKey.findProgramAddress(
            [
                Buffer.from("user_state"),
                redPacketPda.toBuffer(),
                claimerPk.toBuffer(),
            ],
            RED_PACKET_PROGRAM_ID
        );
        
        console.log('🏦 账户地址:');
        console.log(`- 红包PDA: ${redPacketPda.toBase58()}`);
        console.log(`- 用户状态PDA: ${userStatePda.toBase58()}\n`);
        
        // 3. 检查账户是否存在
        console.log('✅ 账户状态检查:');
        
        const redPacketInfo = await connection.getAccountInfo(redPacketPda);
        if (!redPacketInfo) {
            console.log('❌ 红包账户不存在！');
            return;
        }
        console.log('✅ 红包账户存在');
        
        const userStateInfo = await connection.getAccountInfo(userStatePda);
        console.log(`${userStateInfo ? '✅' : '⚠️'} 用户状态账户${userStateInfo ? '存在' : '不存在（首次领取）'}`);
        
        // 4. 检查余额
        const claimerBalance = await connection.getBalance(claimerPk);
        console.log(`💰 领取者SOL余额: ${claimerBalance / 1e9} SOL`);
        
        const redPacketBalance = await connection.getBalance(redPacketPda);
        console.log(`💰 红包账户SOL余额: ${redPacketBalance / 1e9} SOL\n`);
        
        // 5. 尝试解析红包账户数据（简化版）
        console.log('📊 红包账户数据分析:');
        console.log(`- 账户数据长度: ${redPacketInfo.data.length} bytes`);
        console.log(`- 账户所有者: ${redPacketInfo.owner.toBase58()}`);
        console.log(`- 是否可执行: ${redPacketInfo.executable}`);
        console.log(`- Rent exempt: ${redPacketInfo.rentEpoch}\n`);
        
        // 6. 检查网络状态
        console.log('🌐 网络状态检查:');
        const slot = await connection.getSlot();
        console.log(`- 当前Slot: ${slot}`);
        
        const blockTime = await connection.getBlockTime(slot);
        console.log(`- 区块时间: ${new Date(blockTime * 1000).toLocaleString()}\n`);
        
        // 7. 程序账户检查
        console.log('🔧 程序状态检查:');
        const programInfo = await connection.getAccountInfo(RED_PACKET_PROGRAM_ID);
        if (!programInfo) {
            console.log('❌ 程序账户不存在！');
            return;
        }
        console.log('✅ 程序账户存在');
        console.log(`- 程序账户所有者: ${programInfo.owner.toBase58()}\n`);
        
        console.log('🎯 诊断完成！请检查以上信息是否有异常。');
        
    } catch (error) {
        console.error('❌ 诊断过程中出现错误:', error);
    }
}

// 使用示例
// 从命令行参数获取输入
const args = process.argv.slice(2);
if (args.length !== 3) {
    console.log('使用方法: node debug-claim.js <红包ID> <创建者地址> <领取者地址>');
    console.log('示例: node debug-claim.js 1 GQ7T...abc DEF8...xyz');
    process.exit(1);
}

const [redPacketId, creator, claimer] = args;
debugClaimIssue(redPacketId, creator, claimer); 