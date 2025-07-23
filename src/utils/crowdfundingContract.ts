import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js'
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, getAccount, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { LAUNCHPAD_CrowdFunding_PROGRAM_ID } from '../config/constants'

// 众筹合约接口类
export class CrowdfundingContract {
  private connection: Connection
  private programId: PublicKey

  constructor(connection: Connection) {
    this.connection = connection
    this.programId = LAUNCHPAD_CrowdFunding_PROGRAM_ID
  }

  /**
   * 参与众筹 - support_crowdfunding (无推荐人)
   * @param wallet 钱包对象
   * @param creatorAddress 创建者地址
   * @param projectId 项目ID
   * @param amount 参与金额 (lamports)
   * @returns 交易签名
   */
  async supportCrowdfunding(
    wallet: any,
    creatorAddress: PublicKey,
    projectId: bigint,
    amount: number
  ): Promise<string> {
    try {
      console.log('🚀 开始参与众筹 (无推荐人)...')
      
      // 1. 计算PDA账户
      const projectIdBuffer = Buffer.alloc(8)
      projectIdBuffer.writeBigUInt64LE(projectId)
      
      const [redPacketPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('red_packet'), creatorAddress.toBuffer(), projectIdBuffer],
        this.programId
      )

      const [backerStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('backer_state'), redPacketPDA.toBuffer(), wallet.publicKey.toBuffer()],
        this.programId
      )

      const [solVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('sol_vault'), redPacketPDA.toBuffer()],
        this.programId
      )

      console.log('=== 账户信息 ===')
      console.log('backer:', wallet.publicKey.toBase58())
      console.log('creator:', creatorAddress.toBase58())
      console.log('projectId:', projectId.toString())
      console.log('redPacketPDA:', redPacketPDA.toBase58())
      console.log('backerStatePDA:', backerStatePDA.toBase58())
      console.log('solVaultPDA:', solVaultPDA.toBase58())
      console.log('amount:', amount)

      // 2. 构造指令数据
      const discriminator = Buffer.from([143, 137, 0, 66, 93, 76, 183, 97]) // support_crowdfunding
      const amountBuffer = Buffer.alloc(8)
      amountBuffer.writeBigUInt64LE(BigInt(amount))

      const data = Buffer.concat([
        discriminator,
        projectIdBuffer,
        amountBuffer
      ])

      // 3. 构造账户列表
      const keys = [
        { pubkey: redPacketPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // backer
        { pubkey: backerStatePDA, isSigner: false, isWritable: true },
        { pubkey: solVaultPDA, isSigner: false, isWritable: true },
        { pubkey: creatorAddress, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ]

      // 4. 创建指令
      const instruction = new TransactionInstruction({
        programId: this.programId,
        keys,
        data
      })

      // 5. 创建交易
      const transaction = new Transaction()
      transaction.add(instruction)
      transaction.feePayer = wallet.publicKey
      
      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      // 6. 签名并发送交易
        const signedTx = await wallet.signTransaction(transaction)
      const signature = await this.connection.sendRawTransaction(signedTx.serialize())
      
      console.log('✅ 交易已发送，等待确认...', signature)
      await this.connection.confirmTransaction(signature, 'confirmed')
      console.log('✅ 众筹参与成功:', signature)
      
      return signature
    } catch (error) {
      console.error('❌ 参与众筹失败:', error)
      throw error
    }
  }

  /**
   * 参与众筹 - support_crowdfunding_with_referrer (带推荐人)
   * @param wallet 钱包对象
   * @param creatorAddress 创建者地址
   * @param projectId 项目ID
   * @param amount 参与金额 (lamports)
   * @param referrer 推荐人地址
   * @returns 交易签名
   */
  async supportCrowdfundingWithReferrer(
    wallet: any,
    creatorAddress: PublicKey,
    projectId: bigint,
    amount: number,
    referrer: PublicKey
  ): Promise<string> {
    try {
      console.log('🚀 开始参与众筹 (带推荐人)...')
      
      // 1. 计算PDA账户
      const projectIdBuffer = Buffer.alloc(8)
      projectIdBuffer.writeBigUInt64LE(projectId)
      
      const [redPacketPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('red_packet'), creatorAddress.toBuffer(), projectIdBuffer],
        this.programId
      )

      const [backerStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('backer_state'), redPacketPDA.toBuffer(), wallet.publicKey.toBuffer()],
        this.programId
      )

      const [solVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('sol_vault'), redPacketPDA.toBuffer()],
        this.programId
      )

      const [referrerUserStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_state'), redPacketPDA.toBuffer(), referrer.toBuffer()],
        this.programId
      )

      console.log('=== 账户信息 ===')
      console.log('backer:', wallet.publicKey.toBase58())
      console.log('creator:', creatorAddress.toBase58())
      console.log('projectId:', projectId.toString())
      console.log('referrer:', referrer.toBase58())
      console.log('redPacketPDA:', redPacketPDA.toBase58())
      console.log('backerStatePDA:', backerStatePDA.toBase58())
      console.log('solVaultPDA:', solVaultPDA.toBase58())
      console.log('referrerUserStatePDA:', referrerUserStatePDA.toBase58())
      console.log('amount:', amount)

      // 2. 构造指令数据
      const discriminator = Buffer.from([113, 187, 88, 62, 113, 208, 30, 54]) // support_crowdfunding_with_referrer
      const amountBuffer = Buffer.alloc(8)
      amountBuffer.writeBigUInt64LE(BigInt(amount))

      const data = Buffer.concat([
        discriminator,
        projectIdBuffer,
        amountBuffer
      ])

      // 3. 构造账户列表
      const keys = [
        { pubkey: redPacketPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // backer
        { pubkey: backerStatePDA, isSigner: false, isWritable: true },
        { pubkey: solVaultPDA, isSigner: false, isWritable: true },
        { pubkey: creatorAddress, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: referrer, isSigner: false, isWritable: false }, // 推荐人账户
        { pubkey: referrerUserStatePDA, isSigner: false, isWritable: true }, // 推荐人状态账户
      ]

      // 4. 创建指令
      const instruction = new TransactionInstruction({
        programId: this.programId,
        keys,
        data
      })

      // 5. 创建交易
      const transaction = new Transaction()
      transaction.add(instruction)
      transaction.feePayer = wallet.publicKey
      
      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      // 6. 签名并发送交易
      const signedTx = await wallet.signTransaction(transaction)
      const signature = await this.connection.sendRawTransaction(signedTx.serialize())
      
      console.log('✅ 交易已发送，等待确认...', signature)
      await this.connection.confirmTransaction(signature, 'confirmed')
      console.log('✅ 众筹参与成功 (带推荐人):', signature)
      
      return signature
    } catch (error) {
      console.error('❌ 参与众筹失败:', error)
      throw error
    }
  }

  /**
   * 智能选择众筹参与方法
   * @param wallet 钱包对象
   * @param creatorAddress 创建者地址
   * @param projectId 项目ID
   * @param amount 参与金额 (lamports)
   * @param referrer 推荐人地址 (可选)
   * @returns 交易签名
   */
  async participateInCrowdfunding(
    wallet: any,
    creatorAddress: PublicKey,
    projectId: bigint,
    amount: number,
    referrer?: PublicKey
  ): Promise<string> {
    if (referrer) {
      return await this.supportCrowdfundingWithReferrer(
        wallet,
        creatorAddress,
        projectId,
        amount,
        referrer
      )
    } else {
      return await this.supportCrowdfunding(
        wallet,
        creatorAddress,
        projectId,
        amount
      )
    }
  }

  /**
   * 领取空投 - claim_airdrop
   * @param wallet 钱包对象
   * @param creatorAddress 创建者地址
   * @param projectId 项目ID
   * @param mintAddress 代币地址
   * @returns 交易签名
   */
  async claimAirdrop(
    wallet: any,
    creatorAddress: PublicKey,
    projectId: bigint,
    mintAddress: PublicKey
  ): Promise<string> {
    try {
      console.log('🚀 开始领取空投...')
      
      // 1. 计算PDA账户
      const projectIdBuffer = Buffer.alloc(8)
      projectIdBuffer.writeBigUInt64LE(projectId)
      
      const [redPacketPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('red_packet'), creatorAddress.toBuffer(), projectIdBuffer],
        this.programId
      )

      const [userStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_state'), redPacketPDA.toBuffer(), wallet.publicKey.toBuffer()],
        this.programId
      )

      const [tokenVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('token_vault'), redPacketPDA.toBuffer()],
        this.programId
      )

      // 2. 获取或创建领取者的ATA
      const claimerATA = getAssociatedTokenAddressSync(mintAddress, wallet.publicKey)
      
      let createAtaIx = null
      try {
        await getAccount(this.connection, claimerATA)
        console.log('✅ 领取者ATA已存在')
      } catch (e) {
        console.log('❌ 领取者ATA不存在，创建中...')
        createAtaIx = createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          claimerATA,
          wallet.publicKey,
          mintAddress,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      }

      console.log('=== 账户信息 ===')
      console.log('claimer:', wallet.publicKey.toBase58())
      console.log('creator:', creatorAddress.toBase58())
      console.log('projectId:', projectId.toString())
      console.log('redPacketPDA:', redPacketPDA.toBase58())
      console.log('userStatePDA:', userStatePDA.toBase58())
      console.log('tokenVaultPDA:', tokenVaultPDA.toBase58())
      console.log('claimerATA:', claimerATA.toBase58())
      console.log('mint:', mintAddress.toBase58())

      // 3. 构造指令数据
      const discriminator = Buffer.from([137, 50, 122, 111, 89, 254, 8, 20]) // claim_airdrop
      const data = Buffer.concat([
        discriminator,
        projectIdBuffer
      ])

      // 4. 构造账户列表
      const keys = [
        { pubkey: redPacketPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // claimer
        { pubkey: userStatePDA, isSigner: false, isWritable: true },
        { pubkey: tokenVaultPDA, isSigner: false, isWritable: true },
        { pubkey: claimerATA, isSigner: false, isWritable: true },
        { pubkey: mintAddress, isSigner: false, isWritable: false },
        { pubkey: creatorAddress, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ]

      // 5. 创建指令
      const instruction = new TransactionInstruction({
        programId: this.programId,
        keys,
        data
      })

      // 6. 创建交易
      const transaction = new Transaction()
      if (createAtaIx) {
        transaction.add(createAtaIx)
      }
      transaction.add(instruction)
      transaction.feePayer = wallet.publicKey
      
      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      // 7. 签名并发送交易
      const signedTx = await wallet.signTransaction(transaction)
      const signature = await this.connection.sendRawTransaction(signedTx.serialize())
      
      console.log('✅ 交易已发送，等待确认...', signature)
      await this.connection.confirmTransaction(signature, 'confirmed')
      console.log('✅ 空投领取成功:', signature)
      
      return signature
    } catch (error) {
      console.error('❌ 领取空投失败:', error)
      throw error
    }
  }

  /**
   * 获取众筹红包信息
   * @param creatorAddress 创建者地址
   * @param projectId 项目ID
   * @returns 红包信息
   */
  async getRedPacketInfo(creatorAddress: PublicKey, projectId: bigint): Promise<any> {
    try {
      const projectIdBuffer = Buffer.alloc(8)
      projectIdBuffer.writeBigUInt64LE(projectId)
      
      const [redPacketPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('red_packet'), creatorAddress.toBuffer(), projectIdBuffer],
        this.programId
      )

      const accountInfo = await this.connection.getAccountInfo(redPacketPDA)
      if (!accountInfo) {
        throw new Error('红包不存在')
      }

      // 这里需要根据实际的数据结构来解析
      // 暂时返回原始数据，后续可以添加解析逻辑
      return {
        exists: true,
        data: accountInfo.data,
        owner: accountInfo.owner.toBase58(),
        lamports: accountInfo.lamports
      }
    } catch (error) {
      console.error('❌ 获取红包信息失败:', error)
      throw error
    }
  }

  /**
   * 获取用户状态
   * @param creatorAddress 创建者地址
   * @param projectId 项目ID
   * @param userAddress 用户地址
   * @returns 用户状态
   */
  async getUserState(creatorAddress: PublicKey, projectId: bigint, userAddress: PublicKey): Promise<any> {
    try {
      const projectIdBuffer = Buffer.alloc(8)
      projectIdBuffer.writeBigUInt64LE(projectId)
      
      const [redPacketPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('red_packet'), creatorAddress.toBuffer(), projectIdBuffer],
        this.programId
      )

      const [userStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_state'), redPacketPDA.toBuffer(), userAddress.toBuffer()],
        this.programId
      )

      const accountInfo = await this.connection.getAccountInfo(userStatePDA)
      if (!accountInfo) {
        return {
          exists: false,
          airdropClaimed: false
        }
      }

      // 这里需要根据实际的数据结构来解析
      // 暂时返回原始数据，后续可以添加解析逻辑
      return {
        exists: true,
        data: accountInfo.data,
        owner: accountInfo.owner.toBase58(),
        lamports: accountInfo.lamports
      }
    } catch (error) {
      console.error('❌ 获取用户状态失败:', error)
      throw error
    }
  }

  /**
   * 领取推荐人奖励 - claim_referral_reward
   * @param wallet 钱包对象
   * @param creatorAddress 创建者地址
   * @param projectId 项目ID
   * @param mintAddress 代币地址
   * @returns 交易签名
   */
  async claimReferralReward(
    wallet: any,
    creatorAddress: PublicKey,
    projectId: bigint,
    mintAddress: PublicKey
  ): Promise<string> {
    try {
      console.log('🎁 开始领取推荐人奖励...')
      
      // 1. 计算PDA账户
      const projectIdBuffer = Buffer.alloc(8)
      projectIdBuffer.writeBigUInt64LE(projectId)
      
      const [redPacketPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('red_packet'), creatorAddress.toBuffer(), projectIdBuffer],
        this.programId
      )

      const [userStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_state'), redPacketPDA.toBuffer(), wallet.publicKey.toBuffer()],
        this.programId
      )

      const [tokenVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('token_vault'), redPacketPDA.toBuffer()],
        this.programId
      )

      // 2. 获取或创建领取者的ATA
      const claimerATA = getAssociatedTokenAddressSync(mintAddress, wallet.publicKey)
      
      let createAtaIx = null
      try {
        await getAccount(this.connection, claimerATA)
        console.log('✅ 领取者ATA已存在')
      } catch (e) {
        console.log('❌ 领取者ATA不存在，创建中...')
        createAtaIx = createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          claimerATA,
          wallet.publicKey,
          mintAddress,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      }

      console.log('=== 账户信息 ===')
      console.log('claimer:', wallet.publicKey.toBase58())
      console.log('creator:', creatorAddress.toBase58())
      console.log('projectId:', projectId.toString())
      console.log('redPacketPDA:', redPacketPDA.toBase58())
      console.log('userStatePDA:', userStatePDA.toBase58())
      console.log('tokenVaultPDA:', tokenVaultPDA.toBase58())
      console.log('claimerATA:', claimerATA.toBase58())
      console.log('mint:', mintAddress.toBase58())

      // 3. 构造指令数据
      const discriminator = Buffer.from([120, 43, 209, 240, 2, 41, 98, 212]) // claim_referral_reward
      const data = Buffer.concat([
        discriminator,
        projectIdBuffer
      ])

      // 4. 构造账户列表
      const keys = [
        { pubkey: redPacketPDA, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // claimer
        { pubkey: userStatePDA, isSigner: false, isWritable: true },
        { pubkey: tokenVaultPDA, isSigner: false, isWritable: true },
        { pubkey: claimerATA, isSigner: false, isWritable: true },
        { pubkey: mintAddress, isSigner: false, isWritable: false },
        { pubkey: creatorAddress, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ]

      // 5. 创建指令
      const instruction = new TransactionInstruction({
        programId: this.programId,
        keys,
        data
      })

      // 6. 创建交易
      const transaction = new Transaction()
      if (createAtaIx) {
        transaction.add(createAtaIx)
      }
      transaction.add(instruction)
      transaction.feePayer = wallet.publicKey
      
      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      // 7. 签名并发送交易
      const signedTx = await wallet.signTransaction(transaction)
      const signature = await this.connection.sendRawTransaction(signedTx.serialize())
      
      console.log('✅ 交易已发送，等待确认...', signature)
      await this.connection.confirmTransaction(signature, 'confirmed')
      console.log('✅ 推荐人奖励领取成功:', signature)
      
      return signature
    } catch (error) {
      console.error('❌ 领取推荐人奖励失败:', error)
      throw error
    }
  }

  /**
   * 获取支持者状态
   * @param creatorAddress 创建者地址
   * @param projectId 项目ID
   * @param backerAddress 支持者地址
   * @returns 支持者状态
   */
  async getBackerState(creatorAddress: PublicKey, projectId: bigint, backerAddress: PublicKey): Promise<any> {
    try {
      const projectIdBuffer = Buffer.alloc(8)
      projectIdBuffer.writeBigUInt64LE(projectId)
      
      const [redPacketPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('red_packet'), creatorAddress.toBuffer(), projectIdBuffer],
        this.programId
      )

      const [backerStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('backer_state'), redPacketPDA.toBuffer(), backerAddress.toBuffer()],
        this.programId
      )

      const accountInfo = await this.connection.getAccountInfo(backerStatePDA)
      if (!accountInfo) {
        return {
          exists: false,
          amount: 0
        }
      }

      // 这里需要根据实际的数据结构来解析
      // 暂时返回原始数据，后续可以添加解析逻辑
      return {
        exists: true,
        data: accountInfo.data,
        owner: accountInfo.owner.toBase58(),
        lamports: accountInfo.lamports
      }
    } catch (error) {
      console.error('❌ 获取支持者状态失败:', error)
      throw error
    }
  }
} 