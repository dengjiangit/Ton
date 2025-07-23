import { MerkleTree } from './merkle';

export interface MerkleLeaf {
  claimer: string;
  amount: number;
}

export function generateMerkleTree(leaves: MerkleLeaf[]): {
  tree: MerkleTree;
  root: Buffer;
} {
  // MerkleLeaf和WhitelistEntry现在具有相同的结构，直接使用
  const tree = new MerkleTree(leaves);
  const root = tree.getRoot();
  return { tree, root };
}

export function generateMerkleProof(
  tree: MerkleTree,
  leafData: MerkleLeaf
): Buffer[] {
  // MerkleLeaf和WhitelistEntry现在具有相同的结构，直接使用
  return tree.getProof(leafData);
}

export function verifyMerkleProof(
  root: Buffer,
  leafData: MerkleLeaf,
  proof: Buffer[]
): boolean {
  // MerkleLeaf和WhitelistEntry现在具有相同的结构，直接使用
  return MerkleTree.verifyProof(root, leafData, proof);
}

// 示例用法
export const exampleLeaves: MerkleLeaf[] = [
  {
    claimer: "35bWNQi2HrG7iZuWjU9NxexdR3yamhimjDkhxQQUQkgK",
    amount: 150 * 1e9
  },
  {
    claimer: "X3XeRdP1wLJ6CsPW3bpotRNLd6pt6cWmMKK6nA99vWm",
    amount: 250 * 1e9
  },
  {
    claimer: "8GgHNWyBT7bsyKctkKaMAtG6z1N2ZAD4UKq6YtvbUAxQ",
    amount: 350 * 1e9
  }
]; 