import { Connection, PublicKey } from '@solana/web3.js';

export interface TransactionCheckResult {
  success: boolean;
  userClaimed: boolean;
  redPacketExists: boolean;
  message: string;
}

export async function checkClaimStatus(
  connection: Connection,
  program: any, // 使用any避免版本冲突
  redPacketIdStr: string,
  creatorStr: string,
  claimerPubkey: PublicKey
): Promise<TransactionCheckResult> {
  try {
    const redPacketId = parseInt(redPacketIdStr);
    const creatorPk = new PublicKey(creatorStr);
    
    // 构造红包ID的8字节buffer
    const redPacketIdBuffer = Buffer.alloc(8);
    redPacketIdBuffer.writeUInt32LE(redPacketId & 0xffffffff, 0);
    redPacketIdBuffer.writeUInt32LE(Math.floor(redPacketId / 0x100000000), 4);
    
    // 计算PDA
    const [redPacketPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('red_packet'),
        creatorPk.toBuffer(),
        redPacketIdBuffer,
      ],
      program.programId
    );
    
    const [userStatePda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('user_state'),
        redPacketPda.toBuffer(),
        claimerPubkey.toBuffer(),
      ],
      program.programId
    );
    
    // 检查红包状态
    const redPacketAccount = await (program.account as any).redPacket.fetchNullable(redPacketPda);
    if (!redPacketAccount) {
      return {
        success: false,
        userClaimed: false,
        redPacketExists: false,
        message: '红包不存在'
      };
    }
    
    // 检查用户状态
    const userStateAccount = await (program.account as any).userState.fetchNullable(userStatePda);
    const userClaimed = userStateAccount && userStateAccount.isClaimed === 1;
    
    return {
      success: userClaimed,
      userClaimed,
      redPacketExists: true,
      message: userClaimed ? '红包领取成功' : '红包未领取'
    };
    
  } catch (error) {
    console.error('检查领取状态失败:', error);
    return {
      success: false,
      userClaimed: false,
      redPacketExists: false,
      message: '检查状态时出错'
    };
  }
}

export function showTransactionResult(result: TransactionCheckResult) {
  const status = result.success ? '✅' : '❌';
  const details = [
    `${status} ${result.message}`,
    `红包存在: ${result.redPacketExists ? '是' : '否'}`,
    `用户已领取: ${result.userClaimed ? '是' : '否'}`
  ].join('\n');
  
  console.log('=== 交易状态检查结果 ===');
  console.log(details);
  
  return details;
} 