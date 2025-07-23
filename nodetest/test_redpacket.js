const anchor = require('@coral-xyz/anchor');
const { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');
const bs58 = require('bs58');
const fs = require('fs');
require('dotenv').config();

// 程序ID和常量
const RED_PACKET_PROGRAM_ID = new PublicKey('57pF4Zp3e4dUB3BdEoTn623wtvPrbRqaV2FsWnayb9N9');
const RPC_URL = "https://devnet.helius-rpc.com/?api-key=a08565ed-9671-4cb4-8568-a014f810bfb2";
// const RPC_URL = "https://api.devnet.solana.com";
// 初始化连接
const connection = new anchor.web3.Connection(RPC_URL, 'confirmed');

// 加载钱包
const loadWallet = () => {
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('请在.env文件中设置WALLET_PRIVATE_KEY');
  }
  const decodedKey = bs58.decode(privateKey);
  return Keypair.fromSecretKey(decodedKey);
};

// 初始化程序
const initProgram = async (wallet) => {
  try {
    console.log('正在连接到 RPC:', RPC_URL);
    const provider = new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(wallet),
      { commitment: 'confirmed' }
    );
    
    console.log('正在加载本地 IDL...');
    const idl = require('./red_packet.json');
    
    if (!idl || !idl.instructions) {
      throw new Error('本地 IDL 文件格式不正确');
    }
    
    console.log('成功加载 IDL');
    console.log('IDL 版本:', idl.metadata?.version);
    console.log('指令数量:', idl.instructions?.length || 0);
    
    return new anchor.Program(idl, RED_PACKET_PROGRAM_ID, provider);
  } catch (error) {
    console.error('程序初始化失败:', error);
    throw error;
  }
};

// 计算PDA
const findPDA = async (seeds, programId) => {
  return await PublicKey.findProgramAddress(seeds, programId);
};

// 测试创建SOL红包
const testCreateSolRedPacket = async (program, wallet) => {
  console.log('\n=== 测试创建SOL红包 ===');
  
  try {
    // 1. 计算所有PDA
    const [feeVaultPda] = await findPDA(
      [Buffer.from('fee_receiver')],
      program.programId
    );
    
    const [creatorStatePda] = await findPDA(
      [Buffer.from('creator_state'), wallet.publicKey.toBuffer()],
      program.programId
    );
    
    // 2. 获取下一个红包ID
    const creatorStateInfo = await program.account.creatorState.fetch(creatorStatePda);
    const redPacketId = creatorStateInfo.nextRedPacketId;
    
    const [redPacketPda] = await findPDA(
      [
        Buffer.from('red_packet'),
        wallet.publicKey.toBuffer(),
        new anchor.BN(redPacketId).toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );
    
    // 3. 准备参数
    const totalAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL); // 0.1 SOL
    const count = 10;
    const redPacketType = 1; // 随机红包
    const isSol = true;
    const expiryDays = 7;
    const randomSeed = Math.floor(Math.random() * 1000000);
    
    // 4. 创建红包
    console.log('创建红包交易...');
    const tx = await program.methods
      .createRedPacket(
        totalAmount,
        count,
        redPacketType,
        null, // merkleRoot
        isSol,
        expiryDays,
        new anchor.BN(randomSeed)
      )
      .accounts({
        creator: wallet.publicKey,
        creatorState: creatorStatePda,
        redPacket: redPacketPda,
        mint: SystemProgram.programId,
        creatorAta: wallet.publicKey,
        poolAta: redPacketPda,
        feeVault: feeVaultPda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
      
    console.log('红包创建成功!');
    console.log('交易签名:', tx);
    console.log('红包地址:', redPacketPda.toString());
    
    return { redPacketPda, tx };
  } catch (error) {
    console.error('创建红包失败:', error);
    throw error;
  }
};

// 测试创建SPL Token红包
const testCreateSplRedPacket = async (program, wallet, tokenMint) => {
  console.log('\n=== 测试创建SPL Token红包 ===');
  
  try {
    // 1. 计算所有PDA
    const [feeVaultPda] = await findPDA(
      [Buffer.from('fee_receiver')],
      program.programId
    );
    
    const [creatorStatePda] = await findPDA(
      [Buffer.from('creator_state'), wallet.publicKey.toBuffer()],
      program.programId
    );
    
    // 2. 获取下一个红包ID
    const creatorStateInfo = await program.account.creatorState.fetch(creatorStatePda);
    const redPacketId = creatorStateInfo.nextRedPacketId;
    
    const [redPacketPda] = await findPDA(
      [
        Buffer.from('red_packet'),
        wallet.publicKey.toBuffer(),
        new anchor.BN(redPacketId).toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );
    
    // 3. 获取ATA地址
    const creatorAta = await getAssociatedTokenAddress(tokenMint, wallet.publicKey);
    const poolAta = await getAssociatedTokenAddress(tokenMint, redPacketPda, true);
    
    // 4. 准备参数
    const totalAmount = new anchor.BN(1000000); // 1 token
    const count = 10;
    const redPacketType = 1; // 随机红包
    const isSol = false;
    const expiryDays = 7;
    const randomSeed = Math.floor(Math.random() * 1000000);
    
    // 5. 创建红包
    console.log('创建红包交易...');
    const tx = await program.methods
      .createRedPacket(
        totalAmount,
        count,
        redPacketType,
        null, // merkleRoot
        isSol,
        expiryDays,
        new anchor.BN(randomSeed)
      )
      .accounts({
        creator: wallet.publicKey,
        creatorState: creatorStatePda,
        redPacket: redPacketPda,
        mint: tokenMint,
        creatorAta: creatorAta,
        poolAta: poolAta,
        feeVault: feeVaultPda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
      
    console.log('红包创建成功!');
    console.log('交易签名:', tx);
    console.log('红包地址:', redPacketPda.toString());
    
    return { redPacketPda, tx };
  } catch (error) {
    console.error('创建红包失败:', error);
    throw error;
  }
};

// 主测试函数
const main = async () => {
  try {
    console.log('=== 开始测试红包合约 ===');
    
    // 1. 加载钱包
    const wallet = loadWallet();
    console.log('钱包地址:', wallet.publicKey.toString());
    
    // 2. 初始化程序
    const program = await initProgram(wallet);
    console.log('程序ID:', program.programId.toString());
    
    // 3. 测试创建SOL红包
    await testCreateSolRedPacket(program, wallet);
    
    // 4. 测试创建SPL Token红包
    // const tokenMint = new PublicKey('你的Token Mint地址');
    // await testCreateSplRedPacket(program, wallet, tokenMint);
    
    console.log('\n=== 测试完成 ===');
  } catch (error) {
    console.error('测试失败:', error);
  }
};

// 运行测试
main(); 