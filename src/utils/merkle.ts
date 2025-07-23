import { PublicKey } from '@solana/web3.js';
import CryptoJS from 'crypto-js';

export interface WhitelistEntry {
  claimer: string;
  amount: number;
}

export class MerkleTree {
  private leaves: Buffer[];
  private layers: Buffer[][];

  constructor(leaves: WhitelistEntry[]) {
    // 计算叶子节点的哈希值
    this.leaves = leaves.map(MerkleTree.hashLeaf);
    this.layers = this.buildTree(this.leaves);
  }

  // 计算叶子节点哈希值 - 与合约保持一致
  static hashLeaf({ claimer, amount }: WhitelistEntry): Buffer {
    try {
      // 验证输入参数
      if (!claimer || typeof claimer !== 'string') {
        throw new Error('claimer 地址不能为空且必须是字符串');
      }
      
      if (typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount)) {
        throw new Error('amount 必须是大于0的有限数字');
      }
      
      // 处理 claimer (32字节) - 添加错误处理
      let claimerBuffer: Buffer;
      try {
        const pubkey = new PublicKey(claimer);
        claimerBuffer = Buffer.from(pubkey.toBytes());
      } catch (error) {
        throw new Error(`无效的公钥地址格式: ${claimer}. 错误: ${error}`);
      }
      
      // 处理 amount (8字节，小端序)
      const amountBuffer = Buffer.alloc(8);
      try {
        amountBuffer.writeBigUInt64LE(BigInt(amount), 0);
      } catch (error) {
        throw new Error(`金额转换失败，金额可能过大: ${amount}`);
      }
      
      // 组合数据：claimer + amount
      const data = Buffer.concat([claimerBuffer, amountBuffer]);
      
      // 使用 SHA256 计算哈希值（与合约一致）
      const hash = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(data));
      return Buffer.from(hash.toString(CryptoJS.enc.Hex), 'hex');
      
    } catch (error) {
      console.error('计算叶子节点哈希时出错:', error);
      throw error;
    }
  }

  // 计算 Merkle 树内部节点的哈希值 - 与合约保持一致
  private static hashNode(left: Buffer, right: Buffer): Buffer {
    // 排序节点（与合约一致）
    const sorted = left.compare(right) <= 0 ? [left, right] : [right, left];
    const combined = Buffer.concat(sorted);
    
    // 使用 SHA256 计算哈希值
    const hash = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(combined));
    return Buffer.from(hash.toString(CryptoJS.enc.Hex), 'hex');
  }

  // 构建 Merkle 树
  private buildTree(leaves: Buffer[]): Buffer[][] {
    let layers = [leaves];

    while (layers[layers.length - 1].length > 1) {
      const currentLayer = layers[layers.length - 1];
      const nextLayer = [];

      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        // 如果当前节点是奇数，复制最后一个节点作为自己的配对
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;
        nextLayer.push(MerkleTree.hashNode(left, right));
      }

      layers.push(nextLayer);
    }

    return layers;
  }

  // 获取 Merkle 树的根
  getRoot(): Buffer {
    return this.layers[this.layers.length - 1][0];
  }

  // 生成 Merkle 证明
  getProof(leafData: WhitelistEntry): Buffer[] {
    const leafHash = MerkleTree.hashLeaf(leafData);
    let index = this.leaves.findIndex(l => l.equals(leafHash));
    if (index === -1) throw new Error('Leaf not found in tree');

    const proof = [];
    for (let layer = 0; layer < this.layers.length - 1; layer++) {
      const currentLayer = this.layers[layer];
      const isRightNode = index % 2 === 1;
      const pairIndex = isRightNode ? index - 1 : index + 1;

      // 修复：当配对索引超出范围时，使用当前节点（自配对）
      if (pairIndex < currentLayer.length) {
        proof.push(currentLayer[pairIndex]);
      } else {
        // 奇数个节点时，最后一个节点与自己配对
        proof.push(currentLayer[index]);
      }

      index = Math.floor(index / 2);
    }

    return proof;
  }

  // 验证 Merkle 证明
  static verifyProof(
    root: Buffer,
    leafData: WhitelistEntry,
    proof: Buffer[]
  ): boolean {
    let computedHash = MerkleTree.hashLeaf(leafData);

    for (let proofElement of proof) {
      computedHash = MerkleTree.hashNode(computedHash, proofElement);
    }

    return computedHash.equals(root);
  }

  // 获取所有叶子节点数据（用于调试）
  getLeaves(): Buffer[] {
    return this.leaves;
  }

  // 获取树的层数（用于调试）
  getLayers(): Buffer[][] {
    return this.layers;
  }
} 