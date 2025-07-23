import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { 
  getAssociatedTokenAddress, 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';

// 导入IDL和常量
import redPacketIdl from '../constants/red_packet.json';
import { getTokenProgramId } from '../utils/tokenProgram';

import { RED_PACKET_PROGRAM_ID, RED_PACKET_SEED, USER_STATE_SEED, CREATOR_STATE_SEED } from '../config/constants';

// 其他常量
const FEE_RECEIVER = new PublicKey('15hPXzWgid1UWUKnp4KvtZEbaNUCWkPK79cb5uqHysf');

// 类型定义
interface ClaimParams {
  amount?: BN | null;
  proof?: Buffer[] | null;
  redPacketId: BN;
}

interface RefundParams {
  redPacketId: BN;
}

interface CreateSolParams {
  totalAmount: BN;
  packetCount: number;
  redPacketType: number;
  merkleRoot?: Buffer | null;
  expiryDays?: number | null;
  randomSeed?: BN | null;
}

interface CreateTokenParams extends CreateSolParams {
  mint: PublicKey;
}

// 红包客户端服务类
export class RedPacketService {
  private connection: Connection;
  private program: Program;
  private provider: AnchorProvider;
  private publicKey: PublicKey;
  private contractAddress: PublicKey;

  constructor(connection: Connection, provider: AnchorProvider, contractAddress?: PublicKey) {
    this.connection = connection;
    this.provider = provider;
    this.contractAddress = contractAddress || RED_PACKET_PROGRAM_ID;
    
    // 创建程序实例，使用正确的方式指定 programId
    const programIdl = {
      ...redPacketIdl,
      address: this.contractAddress.toString()
    };
    this.program = new Program(programIdl as any, provider);
    this.publicKey = provider.wallet.publicKey;
  }

  // 获取红包账户信息
  private async getRedPacketAccount(redPacketPda: PublicKey) {
    try {
      const account = await (this.program.account as any).redPacket.fetch(redPacketPda);
      return account;
    } catch (error) {
      console.error('获取红包账户失败:', error);
      throw new Error('未找到指定的红包账户');
    }
  }

  // 计算PDA地址
  private async calculateRedPacketPDA(creator: PublicKey, redPacketId: BN): Promise<PublicKey> {
    const redPacketIdBuffer = Buffer.alloc(8);
    const redPacketIdNum = redPacketId.toNumber();
    redPacketIdBuffer.writeUInt32LE(redPacketIdNum & 0xffffffff, 0);
    redPacketIdBuffer.writeUInt32LE(Math.floor(redPacketIdNum / 0x100000000), 4);
    
    const [redPacketPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from(RED_PACKET_SEED),
        creator.toBuffer(),
        redPacketIdBuffer,
      ],
      this.contractAddress
    );
    
    return redPacketPda;
  }

  // 计算用户状态PDA
  private async calculateUserStatePDA(redPacketPda: PublicKey, claimer: PublicKey): Promise<PublicKey> {
    const [userStatePda] = await PublicKey.findProgramAddress(
      [
        Buffer.from(USER_STATE_SEED),
        redPacketPda.toBuffer(),
        claimer.toBuffer(),
      ],
      this.contractAddress
    );
    
    return userStatePda;
  }

  // 兼容性封装 - 领取红包
  async claimRedPacket(
    redPacketIdStr: string,
    creatorStr: string,
    amount?: BN | null,
    proof?: Buffer[] | null,
    redPacketAddressParam?: string
  ): Promise<string> {
    const redPacketId = new BN(redPacketIdStr);
    const creator = new PublicKey(creatorStr);
    
    // 确定红包PDA地址
    let redPacketPda: PublicKey;
    if (redPacketAddressParam) {
      redPacketPda = new PublicKey(redPacketAddressParam);
    } else {
      redPacketPda = await this.calculateRedPacketPDA(creator, redPacketId);
    }

    // 获取红包账户信息
    const redPacketAccount = await this.getRedPacketAccount(redPacketPda);
    
    // 根据红包类型选择对应的方法
    if (redPacketAccount.isSol) {
      return this.claimSolRedPacket(redPacketPda, creator, redPacketId, amount, proof);
    } else {
      return this.claimTokenRedPacket(redPacketPda, redPacketAccount.mint, redPacketId, amount, proof);
    }
  }

  // 领取SOL红包
  private async claimSolRedPacket(
    redPacketPda: PublicKey,
    creator: PublicKey,
    redPacketId: BN,
    amount?: BN | null,
    proof?: Buffer[] | null
  ): Promise<string> {
    const userStatePda = await this.calculateUserStatePDA(redPacketPda, this.publicKey);

    const tx = await this.program.methods
      .claimSolRedpacket(amount, proof, redPacketId)
      .accounts({
        claimer: this.publicKey,
        creator: creator,
        redPacket: redPacketPda,
        userState: userStatePda,
        feeReceiver: FEE_RECEIVER,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ skipPreflight: true, commitment: 'confirmed' });

    console.log('SOL红包领取成功:', tx);
    return tx;
  }

  // 领取代币红包
  private async claimTokenRedPacket(
    redPacketPda: PublicKey,
    mint: PublicKey,
    redPacketId: BN,
    amount?: BN | null,
    proof?: Buffer[] | null
  ): Promise<string> {
    const userStatePda = await this.calculateUserStatePDA(redPacketPda, this.publicKey);
    
    // 获取代币程序ID
    const tokenProgramId = await getTokenProgramId(this.connection, mint);
    
    // 计算ATA地址
    const poolAta = await getAssociatedTokenAddress(mint, redPacketPda, true, tokenProgramId);
    const userAta = await getAssociatedTokenAddress(mint, this.publicKey, false, tokenProgramId);

    const tx = await this.program.methods
      .claimTokenRedpacket(amount, proof, redPacketId)
      .accounts({
        claimer: this.publicKey,
        redPacket: redPacketPda,
        userState: userStatePda,
        mint: mint,
        poolAta: poolAta,
        userAta: userAta,
        feeReceiver: FEE_RECEIVER,
        systemProgram: SystemProgram.programId,
        tokenProgram: tokenProgramId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc({ skipPreflight: true, commitment: 'confirmed' });

    console.log('代币红包领取成功:', tx);
    return tx;
  }

  // 兼容性封装 - 退款红包
  async refundRedPacket(
    redPacketIdStr: string,
    creatorStr: string,
    redPacketAddressParam?: string
  ): Promise<string> {
    const redPacketId = new BN(redPacketIdStr);
    const creator = new PublicKey(creatorStr);
    
    // 确定红包PDA地址
    let redPacketPda: PublicKey;
    if (redPacketAddressParam) {
      redPacketPda = new PublicKey(redPacketAddressParam);
    } else {
      redPacketPda = await this.calculateRedPacketPDA(creator, redPacketId);
    }

    // 获取红包账户信息
    const redPacketAccount = await this.getRedPacketAccount(redPacketPda);
    
    // 根据红包类型选择对应的方法
    if (redPacketAccount.isSol) {
      return this.refundSolRedPacket(redPacketPda, redPacketId);
    } else {
      return this.refundTokenRedPacket(redPacketPda, redPacketAccount.mint, redPacketId);
    }
  }

  // 退款SOL红包
  private async refundSolRedPacket(
    redPacketPda: PublicKey,
    redPacketId: BN
  ): Promise<string> {
    const tx = await this.program.methods
      .refundSolRedpacket(redPacketId)
      .accounts({
        creator: this.publicKey,
        redPacket: redPacketPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ skipPreflight: true, commitment: 'confirmed' });

    console.log('SOL红包退款成功:', tx);
    return tx;
  }

  // 退款代币红包
  private async refundTokenRedPacket(
    redPacketPda: PublicKey,
    mint: PublicKey,
    redPacketId: BN
  ): Promise<string> {
    // 获取代币程序ID
    const tokenProgramId = await getTokenProgramId(this.connection, mint);
    
    // 计算ATA地址
    const creatorAta = await getAssociatedTokenAddress(mint, this.publicKey, false, tokenProgramId);
    const poolAta = await getAssociatedTokenAddress(mint, redPacketPda, true, tokenProgramId);

    const tx = await this.program.methods
      .refundTokenRedpacket(redPacketId)
      .accounts({
        creator: this.publicKey,
        redPacket: redPacketPda,
        mint: mint,
        creatorAta: creatorAta,
        poolAta: poolAta,
        tokenProgram: tokenProgramId,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc({ skipPreflight: true, commitment: 'confirmed' });

    console.log('代币红包退款成功:', tx);
    return tx;
  }

  // 创建SOL红包
  async createSolRedPacket(params: CreateSolParams): Promise<string> {
    const [creatorStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(CREATOR_STATE_SEED), this.publicKey.toBuffer()],
      this.contractAddress
    );

    // 检查并初始化creator_state账户
    await this.ensureCreatorStateInitialized(creatorStatePda);

    // 获取下一个红包ID
    const creatorStateInfo = await this.connection.getAccountInfo(creatorStatePda);
    if (!creatorStateInfo || creatorStateInfo.data.length < 17) {
      throw new Error('creator_state账户数据异常');
    }
    const nextRedPacketId = creatorStateInfo.data.readBigUInt64LE(8);
    
    // 计算红包PDA
    const redPacketPda = await this.calculateRedPacketPDA(this.publicKey, new BN(nextRedPacketId.toString()));

    const tx = await this.program.methods
      .createSolRedpacket(
        params.totalAmount,
        params.packetCount,
        params.redPacketType,
        params.merkleRoot,
        params.expiryDays,
        params.randomSeed
      )
      .accounts({
        creator: this.publicKey,
        creatorState: creatorStatePda,
        redPacket: redPacketPda,
        feeReceiver: FEE_RECEIVER,
        systemProgram: SystemProgram.programId,
        rent: new PublicKey('SysvarRent111111111111111111111111111111111'),
      })
      .rpc({ skipPreflight: true, commitment: 'confirmed' });

    console.log('SOL红包创建成功:', tx);
    return tx;
  }

  // 创建代币红包
  async createTokenRedPacket(params: CreateTokenParams): Promise<string> {
    const [creatorStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(CREATOR_STATE_SEED), this.publicKey.toBuffer()],
      this.contractAddress
    );

    // 检查并初始化creator_state账户
    await this.ensureCreatorStateInitialized(creatorStatePda);

    // 获取下一个红包ID
    const creatorStateInfo = await this.connection.getAccountInfo(creatorStatePda);
    if (!creatorStateInfo || creatorStateInfo.data.length < 17) {
      throw new Error('creator_state账户数据异常');
    }
    const nextRedPacketId = creatorStateInfo.data.readBigUInt64LE(8);
    
    // 计算红包PDA
    const redPacketPda = await this.calculateRedPacketPDA(this.publicKey, new BN(nextRedPacketId.toString()));

    // 获取代币程序ID
    const tokenProgramId = await getTokenProgramId(this.connection, params.mint);
    
    // 计算ATA地址
    const creatorAta = await getAssociatedTokenAddress(params.mint, this.publicKey, false, tokenProgramId);
    const poolAta = await getAssociatedTokenAddress(params.mint, redPacketPda, true, tokenProgramId);

    const tx = await this.program.methods
      .createTokenRedpacket(
        params.totalAmount,
        params.packetCount,
        params.redPacketType,
        params.merkleRoot,
        params.expiryDays,
        params.randomSeed
      )
      .accounts({
        creator: this.publicKey,
        creatorState: creatorStatePda,
        redPacket: redPacketPda,
        mint: params.mint,
        creatorAta: creatorAta,
        poolAta: poolAta,
        feeReceiver: FEE_RECEIVER,
        systemProgram: SystemProgram.programId,
        tokenProgram: tokenProgramId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: new PublicKey('SysvarRent111111111111111111111111111111111'),
      })
      .rpc({ skipPreflight: true, commitment: 'confirmed' });

    console.log('代币红包创建成功:', tx);
    return tx;
  }

  // 确保creator_state账户已初始化
  private async ensureCreatorStateInitialized(creatorStatePda: PublicKey): Promise<void> {
    const creatorStateInfo = await this.connection.getAccountInfo(creatorStatePda);
    if (!creatorStateInfo) {
      console.log('初始化creator_state账户...');
      
      const tx = await this.program.methods
        .initializeCreatorState()
        .accounts({
          creatorState: creatorStatePda,
          creator: this.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: true, commitment: 'confirmed' });
      
      console.log('creator_state初始化成功:', tx);
    }
  }

  // 设置红包过期时间
  async setExpiryTime(redPacketPda: PublicKey, expiryTime: number): Promise<string> {
    const tx = await this.program.methods
      .setExpiryTime(new BN(expiryTime))
      .accounts({
        redPacket: redPacketPda,
        authority: this.publicKey,
      })
      .rpc({ skipPreflight: true, commitment: 'confirmed' });

    console.log('过期时间设置成功:', tx);
    return tx;
  }

  // 获取红包信息
  async getRedPacketInfo(redPacketPda: PublicKey) {
    return await this.getRedPacketAccount(redPacketPda);
  }
}

// 创建工厂函数
export const createRedPacketService = (connection: Connection, provider: AnchorProvider, contractAddress?: PublicKey): RedPacketService => {
  return new RedPacketService(connection, provider, contractAddress);
};

// 导出服务实例的hook
export const useRedPacketService = (connection: Connection, provider: AnchorProvider | null, contractAddress?: PublicKey) => {
  if (!provider) {
    return null;
  }
  return new RedPacketService(connection, provider, contractAddress);
}; 