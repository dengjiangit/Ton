import { MerkleTree, WhitelistEntry } from '../utils/merkle';

export interface WhitelistData {
  amount: number;
  proof: number[][];
}

export class WhitelistService {
  private whitelistMap: Map<string, WhitelistEntry[]> = new Map();
  private merkleTreeMap: Map<string, MerkleTree> = new Map();

  // 设置特定红包的白名单数据
  setWhitelist(redPacketId: string, whitelist: WhitelistEntry[]): Buffer {
    this.whitelistMap.set(redPacketId, whitelist);
    
    // 生成Merkle树
    const merkleTree = new MerkleTree(whitelist);
    this.merkleTreeMap.set(redPacketId, merkleTree);
    
    // 返回Merkle根
    return merkleTree.getRoot();
  }

  // 获取用户的白名单数据
  getWhitelistData(redPacketId: string, claimerAddress: string): WhitelistData | null {
    const whitelist = this.whitelistMap.get(redPacketId);
    const merkleTree = this.merkleTreeMap.get(redPacketId);
    
    if (!whitelist || !merkleTree) {
      console.log('【白名单服务】未找到红包白名单数据:', redPacketId);
      return null;
    }

    // 查找用户在白名单中的条目
    const userEntry = whitelist.find(entry => entry.claimer === claimerAddress);
    if (!userEntry) {
      console.log('【白名单服务】用户不在白名单中:', claimerAddress);
      return null;
    }

    try {
      // 生成Merkle证明
      const proof = merkleTree.getProof(userEntry);
      
      // 转换为合约需要的格式 (number[][])
      const proofForContract = proof.map(buffer => Array.from(buffer));
      
      console.log('【白名单服务】生成证明成功:', {
        user: claimerAddress,
        amount: userEntry.amount,
        proofLength: proof.length
      });

      return {
        amount: userEntry.amount,
        proof: proofForContract
      };
    } catch (error) {
      console.error('【白名单服务】生成Merkle证明失败:', error);
      return null;
    }
  }

  // 验证Merkle证明
  verifyProof(
    redPacketId: string, 
    claimerAddress: string, 
    amount: number, 
    proof: Buffer[]
  ): boolean {
    const merkleTree = this.merkleTreeMap.get(redPacketId);
    if (!merkleTree) {
      return false;
    }

    const leafData: WhitelistEntry = {
      claimer: claimerAddress,
      amount: amount
    };

    return MerkleTree.verifyProof(merkleTree.getRoot(), leafData, proof);
  }

  // 获取Merkle根
  getMerkleRoot(redPacketId: string): Buffer | null {
    const merkleTree = this.merkleTreeMap.get(redPacketId);
    return merkleTree ? merkleTree.getRoot() : null;
  }

  // 清除特定红包的白名单数据
  clearWhitelist(redPacketId: string): void {
    this.whitelistMap.delete(redPacketId);
    this.merkleTreeMap.delete(redPacketId);
  }

  // 预设一些测试数据
  setupTestData(): void {
    // 测试红包ID为 "test-1"
    const testWhitelist: WhitelistEntry[] = [
      {
        claimer: '11111111111111111111111111111112', // 有效的系统程序地址
        amount: 100000000 // 0.1 SOL in lamports
      },
      {
        claimer: 'So11111111111111111111111111111111111111112', // Wrapped SOL地址  
        amount: 200000000 // 0.2 SOL
      },
      {
        claimer: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC地址
        amount: 50000000  // 0.05 SOL
      },
      {
        claimer: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT地址
        amount: 150000000  // 0.15 SOL
      }
    ];

    const merkleRoot = this.setWhitelist('test-1', testWhitelist);
    
    // 为方便测试，也为 "1" 这个ID设置同样的白名单
    this.setWhitelist('1', testWhitelist);
  }
}

// 创建单例实例
export const whitelistService = new WhitelistService();

// 在开发环境中设置测试数据
if (process.env.NODE_ENV === 'development') {
  whitelistService.setupTestData();
} 