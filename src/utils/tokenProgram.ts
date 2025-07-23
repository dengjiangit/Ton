import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

/**
 * 检测代币是否为Token 2022格式
 * @param connection - Solana连接对象
 * @param mintAddress - 代币mint地址
 * @returns 如果是Token 2022返回true，否则返回false
 */
export async function isToken2022(
  connection: Connection,
  mintAddress: string | PublicKey
): Promise<boolean> {
  try {
    const mintPubkey = typeof mintAddress === 'string' 
      ? new PublicKey(mintAddress) 
      : mintAddress;
    
    // 获取mint账户信息
    const accountInfo = await connection.getAccountInfo(mintPubkey, 'confirmed');
    
    if (!accountInfo) {
      console.log('未找到mint账户');
      return false;
    }
    
    // 检查账户所有者是否为Token 2022程序
    return accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
  } catch (error) {
    console.error('检测Token 2022失败:', error);
    return false;
  }
}

/**
 * 根据mint地址获取正确的token程序ID
 * @param connection - Solana连接对象
 * @param mintAddress - 代币mint地址
 * @returns 返回对应的token程序ID
 */
export async function getTokenProgramId(
  connection: Connection,
  mintAddress: string | PublicKey
): Promise<PublicKey> {
  const isT2022 = await isToken2022(connection, mintAddress);
  return isT2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
}

/**
 * 批量检测多个代币是否为Token 2022
 * @param connection - Solana连接对象
 * @param mintAddresses - 代币mint地址数组
 * @returns 返回每个mint地址对应的token程序ID
 */
export async function getTokenProgramIds(
  connection: Connection,
  mintAddresses: (string | PublicKey)[]
): Promise<Map<string, PublicKey>> {
  const results = new Map<string, PublicKey>();
  
  // 批量获取账户信息
  const mintPubkeys = mintAddresses.map(addr => 
    typeof addr === 'string' ? new PublicKey(addr) : addr
  );
  
  try {
    const accountInfos = await connection.getMultipleAccountsInfo(mintPubkeys, 'confirmed');
    
    mintPubkeys.forEach((mintPubkey, index) => {
      const accountInfo = accountInfos[index];
      const mintAddress = mintPubkey.toString();
      
      if (accountInfo && accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
        results.set(mintAddress, TOKEN_2022_PROGRAM_ID);
      } else {
        results.set(mintAddress, TOKEN_PROGRAM_ID);
      }
    });
  } catch (error) {
    console.error('批量检测Token程序失败:', error);
    // 如果批量检测失败，默认都使用SPL Token程序
    mintPubkeys.forEach(mintPubkey => {
      results.set(mintPubkey.toString(), TOKEN_PROGRAM_ID);
    });
  }
  
  return results;
}

/**
 * 获取正确的Associated Token程序ID
 * 目前SPL Token和Token 2022都使用相同的Associated Token程序
 * @returns Associated Token程序ID
 */
export function getAssociatedTokenProgramId(): PublicKey {
  // 导入ASSOCIATED_TOKEN_PROGRAM_ID
  const { ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
  return ASSOCIATED_TOKEN_PROGRAM_ID;
}

/**
 * Token程序相关的常量
 */
export const TOKEN_PROGRAM_IDS = {
  SPL_TOKEN: TOKEN_PROGRAM_ID,
  TOKEN_2022: TOKEN_2022_PROGRAM_ID,
} as const;

/**
 * 程序ID字符串常量
 */
export const TOKEN_PROGRAM_ID_STRINGS = {
  SPL_TOKEN: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TOKEN_2022: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  ASSOCIATED_TOKEN: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
} as const; 