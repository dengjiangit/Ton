import { useState, useCallback } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { useToast } from '@chakra-ui/react';
import { RedPacket, RedPacketState } from '../types';
import { RED_PACKET_PROGRAM_ID, RED_PACKET_SEED, USER_STATE_SEED } from '../config/constants';
import { Program, AnchorProvider, BN, type Idl } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getTokenProgramId } from '../utils/tokenProgram';
import idl from '../constants/red_packet.json';
import { useRedPacketService } from '../services/redPacketService';
import { ipfsService } from '../services/ipfsService';

const redPacketIdl: Idl = JSON.parse(JSON.stringify(idl));

export const useRedPacket = (connection: Connection, contractAddress?: PublicKey) => {
  const wallet = useAnchorWallet();
  const provider = wallet ? new AnchorProvider(connection, wallet, { preflightCommitment: 'confirmed' }) : null;
  const { publicKey, connected, sendTransaction } = useWallet()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const redPacketService = useRedPacketService(connection, provider, contractAddress);

  const getProvider = () => {
    if (!publicKey) return null;
    const provider = new AnchorProvider(
        connection,
        (window as any).solana, // or use wallet
        AnchorProvider.defaultOptions()
    );
    return provider;
  }

  // 创建红包
  const createRedPacket = useCallback(async (
    amount: number,
    count: number,
    message: string
  ): Promise<string | null> => {
    if (!publicKey || !connected) {
      toast({
        title: '错误',
        description: '请先连接钱包',
        status: 'error',
        duration: 3000,
      })
      return null
    }

    setLoading(true)
    try {
      // 生成红包ID（简化版本，实际应该通过程序生成）
      const redPacketId = Math.random().toString(36).substr(2, 9)
      
      // 模拟创建过程（实际应该调用Solana程序）
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: '成功',
        description: '红包创建成功！',
        status: 'success',
        duration: 3000,
      })
      
      return redPacketId
    } catch (error) {
      console.error('创建红包失败:', error)
      toast({
        title: '错误',
        description: '创建红包失败，请重试',
        status: 'error',
        duration: 3000,
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [publicKey, connected, toast])

  // 领取红包
  const claimRedPacket = useCallback(async (
    redPacketIdStr: string, 
    creatorStr: string, 
    ipfsCID?: string
  ): Promise<boolean | {txid: string}> => {
    if (!publicKey || !connected) {
      toast({
        title: '错误',
        description: '请先连接钱包',
        status: 'error',
        duration: 3000,
      })
      return false
    }

    // 防止重复提交
    if (loading) {
      console.log('领取正在进行中，忽略重复请求');
      return false;
    }

    const provider = getProvider();
    if (!provider) {
        toast({ title: '错误', description: '无法获取provider', status: 'error' });
        return false;
    }

    // 使用新的红包服务
    const redPacketService = useRedPacketService(connection, provider)
    if (!redPacketService) {
      toast({ title: '错误', description: '红包服务不可用', status: 'error' });
      return false
    }

    setLoading(true)
    try {
        console.log('【领取红包】使用新版本红包服务')
        console.log('【领取红包】领取时id:', redPacketIdStr)
        console.log('【领取红包】领取时creator:', creatorStr)
        console.log('【领取红包】IPFS CID:', ipfsCID)

        // 根据红包类型准备不同的参数
        let claimAmount: BN | null = null;
        let merkleProof: Buffer[] | null = null;

        // 如果是白名单红包，需要先获取白名单数据
        if (ipfsCID) {
            // 类型2：空投白名单固定金额红包
            try {
                let whitelistData = null;
                
                // 优先从 IPFS 获取白名单数据
                console.log('【领取红包】从IPFS获取白名单数据:', ipfsCID);
                whitelistData = await getWhitelistFromIPFS(redPacketIdStr, publicKey.toString(), ipfsCID);
                
                // 如果IPFS数据获取失败，尝试从本地白名单服务获取
                if (!whitelistData) {
                    console.log('【领取红包】从本地白名单服务获取数据');
                    whitelistData = await getWhitelistData(publicKey.toString(), redPacketIdStr);
                }
                
                if (!whitelistData) {
                    toast({ 
                        title: '错误', 
                        description: '您不在此红包的白名单中', 
                        status: 'error' 
                    });
                    return false;
                }

                claimAmount = new BN(whitelistData.amount);
                // 将number[][]格式的proof转换为Buffer[]格式
                merkleProof = whitelistData.proof.map(proofElement => Buffer.from(proofElement));
                
                console.log('【领取红包】白名单金额:', whitelistData.amount);
                console.log('【领取红包】Merkle证明长度:', merkleProof.length);
                
            } catch (error) {
                console.error('获取白名单数据失败:', error);
                toast({ 
                    title: '错误', 
                    description: '获取白名单数据失败', 
                    status: 'error' 
                });
                return false;
            }
        }
        
        // 调用新的红包服务进行领取
        const tx = await redPacketService.claimRedPacket(
            redPacketIdStr,
            creatorStr,
            claimAmount,
            merkleProof
        );

        console.log('【领取红包】交易成功:', tx)
        
        toast({
            title: '成功',
            description: '红包领取成功！',
            status: 'success',
            duration: 3000,
        });
        
        return { txid: tx };
        
    } catch (error: any) {
        console.error('【领取红包】详细错误信息:', error);
        
        // 解析具体的错误类型
        let errorMessage = '领取红包失败，请重试'
        
        if (error?.message) {
            const message = error.message.toLowerCase()
            
            if (message.includes('already claimed')) {
                errorMessage = '您已经领取过这个红包了'
            } else if (message.includes('red packet has expired')) {
                errorMessage = '红包已过期'
            } else if (message.includes('no packets remaining')) {
                errorMessage = '红包已被抢完'
            } else if (message.includes('insufficient funds in claimer') || message.includes('insufficient claimer funds')) {
                errorMessage = '您的SOL余额不足支付领取费用（需要约0.001 SOL）'
            } else if (message.includes('insufficient funds in red packet')) {
                errorMessage = '红包余额不足'
            } else if (message.includes('insufficient funds')) {
                errorMessage = '余额不足，请检查您的SOL余额'
            } else if (message.includes('merkle proof verification failed')) {
                errorMessage = '白名单验证失败，您可能不在白名单中'
            } else if (message.includes('invalid claim amount')) {
                errorMessage = '无效的领取金额'
            } else if (message.includes('unauthorized')) {
                errorMessage = '没有权限领取此红包'
            } else if (message.includes('user rejected')) {
                errorMessage = '用户取消了交易'
            } else if (message.includes('blockhash not found')) {
                errorMessage = '网络繁忙，请稍后重试'
            } else if (message.includes('transaction simulation failed')) {
                if (message.includes('already been processed')) {
                    errorMessage = '交易可能已经成功，请刷新页面查看状态'
                } else {
                    errorMessage = '交易模拟失败，但不影响实际交易'
                }
            } else if (message.includes('already been processed')) {
                errorMessage = '交易可能已经成功，请刷新页面查看状态'
            } else if (message.includes('0x0')) {
                errorMessage = '您已经领取过这个红包了'
            } else if (message.includes('custom program error')) {
                // 解析程序错误码
                const errorCodeMatch = message.match(/custom program error: 0x([0-9a-f]+)/i);
                if (errorCodeMatch) {
                    const errorCode = parseInt(errorCodeMatch[1], 16);
                    switch (errorCode) {
                        case 0: errorMessage = '您已经领取过这个红包了'; break;
                        case 1: errorMessage = '红包已过期'; break;
                        case 2: errorMessage = '红包已被抢完'; break;
                        case 3: errorMessage = '您的账户余额不足支付手续费'; break;
                        case 4: errorMessage = '红包余额不足'; break;
                        default: errorMessage = `程序错误 (代码: ${errorCode})`; break;
                    }
                }
            }
        }
        
        console.error('【领取红包】错误分析:', {
            originalError: error,
            parsedMessage: errorMessage,
            errorCode: error?.code,
            programError: error?.programError
        })
        
        // 特殊处理可能成功的错误
        const isPossiblySuccessful = errorMessage.includes('交易可能已经成功') || 
                                   errorMessage.includes('模拟失败') ||
                                   errorMessage.includes('already been processed');
        
        if (isPossiblySuccessful) {
            toast({
                title: '交易状态不确定',
                description: `${errorMessage}。请检查您的钱包是否收到代币！`,
                status: 'warning',
                duration: 8000,
            });
        } else {
            toast({
                title: '领取失败',
                description: errorMessage,
                status: 'error',
                duration: 5000,
            });
        }
        return false;
    } finally {
        setLoading(false);
    }
  }, [publicKey, connected, toast, connection])

  // 获取白名单数据的函数
  const getWhitelistData = async (claimerAddress: string, redPacketId: string): Promise<{amount: number, proof: number[][]} | null> => {
    try {
      // 使用白名单服务获取数据
      const { whitelistService } = await import('../services/whitelistService');
      const whitelistData = whitelistService.getWhitelistData(redPacketId, claimerAddress);
      
      if (whitelistData) {
        console.log('【白名单】本地服务获取成功:', {
          amount: whitelistData.amount,
          proofLength: whitelistData.proof.length
        });
        return whitelistData;
      }
      
      return null;
    } catch (error) {
      console.error('【白名单】获取本地白名单数据失败:', error);
      return null;
    }
  }

  // 从IPFS获取白名单数据的函数
  const getWhitelistFromIPFS = async (
    redPacketId: string, 
    claimerAddress: string, 
    ipfsCID: string
  ): Promise<{amount: number, proof: number[][]} | null> => {
    try {
      console.log('【IPFS白名单】开始获取数据:', { redPacketId, claimerAddress, ipfsCID })
      
      const data = await ipfsService.getWhitelistData(ipfsCID)
      if (!data) {
        console.log('【IPFS白名单】未找到IPFS数据')
        return null
      }

      const entry = data.entries.find(item => item.claimer === claimerAddress)
      if (!entry) {
        console.log('【IPFS白名单】用户不在IPFS白名单中:', claimerAddress)
        return null
      }

      // 生成Merkle proof（这里需要实现Merkle tree逻辑）
      const proof: number[][] = [] // TODO: 实现真正的Merkle proof生成

      console.log('【IPFS白名单】找到用户数据:', entry)
      return {
        amount: entry.amount,
        proof: proof
      }
    } catch (error) {
      console.error('【IPFS白名单】获取数据失败:', error)
      return null
    }
  }

  // 获取红包信息
  const getRedPacketInfo = useCallback(async (redPacketId: string): Promise<RedPacket | null> => {
    try {
      // 这里应该从链上获取红包信息
      // 暂时返回模拟数据
      return {
        id: redPacketId,
        creator: publicKey?.toString() || '',
        totalAmount: 1,
        remainingAmount: 0.5,
        totalCount: 10,
        claimedCount: 5,
        message: '恭喜发财，大吉大利！',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        state: RedPacketState.Active,
        claimers: []
      }
    } catch (error) {
      console.error('获取红包信息失败:', error)
      return null
    }
  }, [publicKey])

  // 获取用户的红包列表
  const getUserRedPackets = useCallback(async (): Promise<RedPacket[]> => {
    if (!publicKey || !connected) return []
    
    try {
      // 这里应该从链上获取用户的红包列表
      // 暂时返回模拟数据
      return [
        {
          id: 'example1',
          creator: publicKey.toString(),
          totalAmount: 1,
          remainingAmount: 0.5,
          totalCount: 10,
          claimedCount: 5,
          message: '恭喜发财，大吉大利！',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          state: RedPacketState.Active,
          claimers: []
        }
      ]
    } catch (error) {
      console.error('获取红包列表失败:', error)
      return []
    }
  }, [publicKey, connected])

  // 获取钱包余额
  const getBalance = useCallback(async (): Promise<number> => {
    if (!publicKey || !connected) return 0
    
    try {
      const balance = await connection.getBalance(publicKey)
      return balance / LAMPORTS_PER_SOL
    } catch (error) {
      console.error('获取余额失败:', error)
      return 0
    }
  }, [publicKey, connected, connection])

  // 检查领取状态
  const checkClaimStatus = useCallback(async (
    redPacketIdStr: string,
    creatorStr: string
  ) => {
    if (!publicKey || !connected) return null;
    
    const provider = getProvider();
    if (!provider) return null;
    
    const program = new Program(redPacketIdl, provider);
    
    try {
      const { checkClaimStatus: checkStatus, showTransactionResult } = await import('../utils/transactionChecker');
      const result = await checkStatus(connection, program, redPacketIdStr, creatorStr, publicKey);
      showTransactionResult(result);
      return result;
    } catch (error) {
      console.error('检查领取状态失败:', error);
      return null;
    }
  }, [publicKey, connected, connection]);

  return {
    loading,
    createRedPacket,
    claimRedPacket,
    checkClaimStatus,
    getRedPacketInfo,
    getUserRedPackets,
    getBalance,
  }
}

// 导出合约地址常量供前端使用
export { RED_PACKET_PROGRAM_ID } from '../config/constants'; 