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

      // 解析众筹红包数据结构
      return this.parseRedPacketData(accountInfo.data)
    } catch (error) {
      console.error('❌ 获取红包信息失败:', error)
      throw error
    }
  }

  /**
   * 解析众筹红包数据
   * @param data 原始账户数据
   * @returns 解析后的红包信息
   */
  private parseRedPacketData(data: Uint8Array): any {
    try {
      // 转换为 Buffer 以便使用读取方法
      const buffer = Buffer.from(data)
      let offset = 8 // 跳过 discriminator (8 bytes)
      
      // 解析基础信息
      const creator = new PublicKey(buffer.slice(offset, offset + 32))
      offset += 32
      
      const mint = new PublicKey(buffer.slice(offset, offset + 32))
      offset += 32
      
      // 解析字符串长度和内容
      const tokenNameLength = buffer.readUInt32LE(offset)
      offset += 4
      const tokenName = new TextDecoder().decode(buffer.slice(offset, offset + tokenNameLength))
      offset += tokenNameLength
      
      const tokenSymbolLength = buffer.readUInt32LE(offset)
      offset += 4
      const tokenSymbol = new TextDecoder().decode(buffer.slice(offset, offset + tokenSymbolLength))
      offset += tokenSymbolLength
      
      // 解析数值字段
      const totalAmount = buffer.readBigUInt64LE(offset)
      offset += 8
      
      // 解析 allocations 数组
      const allocationsLength = buffer.readUInt32LE(offset)
      offset += 4
      
      const allocations = []
      for (let i = 0; i < allocationsLength; i++) {
        const nameLength = buffer.readUInt32LE(offset)
        offset += 4
        const name = new TextDecoder().decode(buffer.slice(offset, offset + nameLength))
        offset += nameLength
        
        const amount = buffer.readBigUInt64LE(offset)
        offset += 8
        
        const unlockMonths = buffer.readUInt8(offset)
        offset += 1
        
        allocations.push({
          name,
          amount: amount.toString(),
          unlockMonths
        })
      }
      
      // 解析其他数值字段
      const fundingGoal = buffer.readBigUInt64LE(offset)
      offset += 8
      const solRaised = buffer.readBigUInt64LE(offset)
      offset += 8
      const splRaised = buffer.readBigUInt64LE(offset)
      offset += 8
      const expiryTime = buffer.readBigInt64LE(offset)
      offset += 8
      
      // 跳过 reward_tokens_per_funding_unit (16 bytes)
      offset += 16
      
      // 解析布尔字段
      const settled = buffer.readUInt8(offset) === 1
      offset += 1
      const success = buffer.readUInt8(offset) === 1
      offset += 1
      const feesDistributed = buffer.readUInt8(offset) === 1
      offset += 1
      
      // 解析时间戳
      const unlockStartTime = buffer.readBigInt64LE(offset)
      offset += 8
      const devFundStartTime = buffer.readBigInt64LE(offset)
      offset += 8
      
      // 解析空投相关字段
      const airdropMaxCount = buffer.readUInt16LE(offset)
      offset += 2
      const airdropClaimed = buffer.readUInt16LE(offset)
      offset += 2
      
      // 解析其他数值字段
      const creatorDirectAmount = buffer.readBigUInt64LE(offset)
      offset += 8
      const liquidityFundAmount = buffer.readBigUInt64LE(offset)
      offset += 8
      const protocolFeeAmount = buffer.readBigUInt64LE(offset)
      offset += 8
      const devFundAmount = buffer.readBigUInt64LE(offset)
      offset += 8
      const liquidityTokenAmount = buffer.readBigUInt64LE(offset)
      offset += 8
      const devFundClaimed = buffer.readBigUInt64LE(offset)
      offset += 8
      
      // 解析流动性池地址
      const liquidityPool = new PublicKey(buffer.slice(offset, offset + 32))
      offset += 32
      const liquidityFeeCreatorPercent = buffer.readBigUInt64LE(offset)
      offset += 8
      
      // 解析推荐奖励相关字段
      const referralRewardAmountTag = buffer.readUInt8(offset)
      offset += 1
      let referralRewardAmount = null
      if (referralRewardAmountTag === 1) { // Some
        referralRewardAmount = buffer.readBigUInt64LE(offset)
        offset += 8
      }
      
      const referralRewardPoolNameLength = buffer.readUInt32LE(offset)
      offset += 4
      const referralRewardPoolName = new TextDecoder().decode(buffer.slice(offset, offset + referralRewardPoolNameLength))
      offset += referralRewardPoolNameLength
      
      // 解析资金类型
      const fundingTypeTag = buffer.readUInt8(offset)
      offset += 1
      let fundingType: string | { Spl: { mint: string } } = 'Sol'
      if (fundingTypeTag === 1) { // Spl
        const splMint = new PublicKey(buffer.slice(offset, offset + 32))
        offset += 32
        fundingType = { Spl: { mint: splMint.toBase58() } }
      }
      
      return {
        creator: creator.toBase58(),
        mint: mint.toBase58(),
        tokenName,
        tokenSymbol,
        totalAmount: totalAmount.toString(),
        allocations,
        fundingGoal: fundingGoal.toString(),
        solRaised: solRaised.toString(),
        splRaised: splRaised.toString(),
        expiryTime: Number(expiryTime),
        settled,
        success,
        feesDistributed,
        unlockStartTime: Number(unlockStartTime),
        devFundStartTime: Number(devFundStartTime),
        airdropMaxCount,
        airdropClaimed,
        creatorDirectAmount: creatorDirectAmount.toString(),
        liquidityFundAmount: liquidityFundAmount.toString(),
        protocolFeeAmount: protocolFeeAmount.toString(),
        devFundAmount: devFundAmount.toString(),
        liquidityTokenAmount: liquidityTokenAmount.toString(),
        devFundClaimed: devFundClaimed.toString(),
        liquidityPool: liquidityPool.toBase58(),
        liquidityFeeCreatorPercent: liquidityFeeCreatorPercent.toString(),
        referralRewardAmount: referralRewardAmount ? referralRewardAmount.toString() : null,
        referralRewardPoolName,
        fundingType
      }
    } catch (error) {
      console.error('❌ 解析红包数据失败:', error)
      throw new Error('红包数据解析失败')
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

      // 解析用户状态数据
      return this.parseUserStateData(accountInfo.data)
    } catch (error) {
      console.error('❌ 获取用户状态失败:', error)
      throw error
    }
  }

  /**
   * 解析用户状态数据
   * @param data 原始账户数据
   * @returns 解析后的用户状态
   */
  private parseUserStateData(data: Uint8Array): any {
    try {
      const buffer = Buffer.from(data)
      let offset = 8 // 跳过 discriminator (8 bytes)
      
      // 解析用户地址
      const user = new PublicKey(buffer.slice(offset, offset + 32))
      offset += 32
      
      // 解析空投领取状态
      const airdropClaimed = buffer.readUInt8(offset) === 1
      offset += 1
      
      // 解析推荐相关字段
      const referralCount = buffer.readUInt16LE(offset)
      offset += 2
      const eligibleRewards = buffer.readUInt16LE(offset)
      offset += 2
      const rewardsClaimed = buffer.readUInt16LE(offset)
      offset += 2
      
      // 解析 bump
      const bump = buffer.readUInt8(offset)
      offset += 1
      
      return {
        exists: true,
        user: user.toBase58(),
        airdropClaimed,
        referralCount,
        eligibleRewards,
        rewardsClaimed,
        bump
      }
    } catch (error) {
      console.error('❌ 解析用户状态数据失败:', error)
      // 如果解析失败，返回默认值
      return {
        exists: true,
        airdropClaimed: false,
        referralCount: 0,
        eligibleRewards: 0,
        rewardsClaimed: 0,
        bump: 0
      }
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

      // 解析支持者状态数据
      return this.parseBackerStateData(accountInfo.data)
    } catch (error) {
      console.error('❌ 获取支持者状态失败:', error)
      throw error
    }
  }

  /**
   * 解析支持者状态数据
   * @param data 原始账户数据
   * @returns 解析后的支持者状态
   */
  private parseBackerStateData(data: Uint8Array): any {
    try {
      const buffer = Buffer.from(data)
      let offset = 8 // 跳过 discriminator (8 bytes)
      
      // 解析支持者地址
      const backer = new PublicKey(buffer.slice(offset, offset + 32))
      offset += 32
      
      // 解析支持金额 (u64)
      const amount = buffer.readBigUInt64LE(offset)
      offset += 8
      
      // 解析退款状态 (bool)
      const refunded = buffer.readUInt8(offset) === 1
      offset += 1
      
      // 解析已领取金额 (u64)
      const claimedAmount = buffer.readBigUInt64LE(offset)
      offset += 8
      
      // 解析解锁方案类型 (enum)
      const unlockScheme = buffer.readUInt8(offset)
      offset += 1
      
      return {
        exists: true,
        backer: backer.toBase58(),
        amount: amount.toString(),
        refunded,
        claimedAmount: claimedAmount.toString(),
        unlockScheme: unlockScheme === 0 ? 'Immediate' : 'Gradual'
      }
    } catch (error) {
      console.error('❌ 解析支持者状态数据失败:', error)
      // 如果解析失败，返回默认值
      return {
        exists: true,
        amount: '0',
        refunded: false,
        claimedAmount: '0',
        unlockScheme: 'Immediate'
      }
    }
  }
} 