import { Connection, PublicKey } from '@solana/web3.js';

export interface TokenInfo {
  symbol: string;
  name: string;
  logoURI?: string;
  decimals: number;
  tags?: string[];
  verified?: boolean;
}

// Jupiter API 代币列表缓存
let jupiterTokenList: Map<string, TokenInfo> | null = null;
let jupiterTokenListLoadTime: number = 0;
let jupiterTokenListLoading: Promise<void> | null = null;

// 缓存有效期（5分钟）
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * 从 Jupiter API 获取代币信息
 */
export const getTokenInfoFromJupiter = async (mintAddress: string): Promise<TokenInfo | null> => {
  try {
    // 检查缓存是否有效
    const now = Date.now();
    const cacheExpired = now - jupiterTokenListLoadTime > CACHE_DURATION;
    
    // 如果缓存为空或已过期，且没有正在加载，则重新获取
    if ((!jupiterTokenList || cacheExpired) && !jupiterTokenListLoading) {
      console.log('正在获取 Jupiter 代币列表...');
      
      jupiterTokenListLoading = (async () => {
        try {
      const response = await fetch('https://token.jup.ag/all');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
      const tokens = await response.json();
      
          if (!Array.isArray(tokens)) {
            throw new Error('Invalid response format');
          }
          
          const newTokenList = new Map<string, TokenInfo>();
      tokens.forEach((token: any) => {
            if (token.address && token.symbol) {
              newTokenList.set(token.address, {
          symbol: token.symbol,
                name: token.name || token.symbol,
          logoURI: token.logoURI,
                decimals: token.decimals || 9,
          tags: token.tags,
          verified: token.verified || false,
        });
            }
      });
          
          jupiterTokenList = newTokenList;
          jupiterTokenListLoadTime = Date.now();
      console.log(`已缓存 ${jupiterTokenList.size} 个代币信息`);
        } catch (error) {
          console.error('获取 Jupiter 代币列表失败:', error);
          // 如果失败，重置加载状态，允许重试
          jupiterTokenListLoading = null;
          throw error;
        }
      })();
      
      await jupiterTokenListLoading;
      jupiterTokenListLoading = null;
    } else if (jupiterTokenListLoading) {
      // 如果正在加载，等待加载完成
      await jupiterTokenListLoading;
    }
    
    return jupiterTokenList?.get(mintAddress) || null;
  } catch (error) {
    console.error('从 Jupiter API 获取代币信息失败:', error);
    return null;
  }
};

/**
 * 从 Token-2022 获取代币信息
 */
export const getTokenInfoFromToken2022 = async (
  connection: Connection,
  mintAddress: string
): Promise<TokenInfo | null> => {
  try {
    console.log('正在从 Token-2022 获取代币信息...');
    
    // 使用 getAccountInfo 获取 mint 账户信息
    const mintPubkey = new PublicKey(mintAddress);
    const accountInfo = await connection.getAccountInfo(mintPubkey, 'confirmed');

    if (!accountInfo) {
      console.log('未找到 Token-2022 mint 账户');
      return null;
    }

    // 检查账户所有者是否为 Token-2022 程序
    const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
    if (accountInfo.owner.toString() !== TOKEN_2022_PROGRAM_ID) {
      console.log('账户不属于 Token-2022 程序');
      return null;
    }

    // 获取解析后的账户信息
    const parsedAccountInfo = await connection.getParsedAccountInfo(mintPubkey, 'confirmed');
    
    if (!parsedAccountInfo.value) {
      console.log('无法获取解析后的 Token-2022 账户数据');
      return null;
    }

    // 解析账户数据
    const data = parsedAccountInfo.value.data;
    if (!data || typeof data !== 'object' || !('parsed' in data)) {
      console.log('无法解析 Token-2022 账户数据');
      return null;
    }

    const parsedData = data.parsed as any;
    if (!parsedData || !parsedData.info) {
      console.log('Token-2022 账户数据格式无效');
      return null;
    }

    const info = parsedData.info;
    let tokenName = '';
    let tokenSymbol = '';
    let tokenUri = '';

    // 检查扩展信息中的 TokenMetadata
    if (info.extensions && Array.isArray(info.extensions)) {
      for (const extension of info.extensions) {
        if (extension.extension === 'tokenMetadata' && extension.state) {
          tokenName = extension.state.name || '';
          tokenSymbol = extension.state.symbol || '';
          tokenUri = extension.state.uri || '';
          break;
        }
      }
    }

    // 如果没有找到 metadata，返回基本信息
    if (!tokenSymbol && !tokenName) {
      return {
        symbol: `T2022-${mintAddress.slice(0, 6)}`,
        name: `Token-2022 ${mintAddress.slice(0, 8)}`,
        decimals: info.decimals || 9,
        verified: false,
      };
    }

    return {
      symbol: tokenSymbol || `T2022-${mintAddress.slice(0, 6)}`,
      name: tokenName || tokenSymbol || `Token-2022 ${mintAddress.slice(0, 8)}`,
      logoURI: tokenUri || undefined,
      decimals: info.decimals || 9,
      verified: false,
      tags: ['token-2022'],
    };
  } catch (error) {
    console.error('从 Token-2022 获取代币信息失败:', error);
    return null;
  }
};

/**
 * 从 Metaplex Token Metadata 程序获取代币信息
 */
export const getTokenInfoFromMetaplex = async (
  connection: Connection, 
  mintAddress: string
): Promise<TokenInfo | null> => {
  try {
    console.log('正在从 Metaplex 获取代币信息...');
    const mintPubkey = new PublicKey(mintAddress);
    
    // Metaplex Token Metadata 程序 ID
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    
    // 计算 metadata PDA
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintPubkey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    
    // 获取 metadata 账户信息
    const metadataAccount = await connection.getAccountInfo(metadataPDA);
    
    if (!metadataAccount) {
      console.log('未找到 Metaplex metadata 账户');
      return null;
    }
    
    // 解析 metadata（简化版本，实际需要更复杂的解析）
    const data = metadataAccount.data;
    
    // 跳过前面的字段，找到 name 和 symbol
    let offset = 1; // 跳过 key
    offset += 32; // 跳过 update_authority
    offset += 32; // 跳过 mint
    
    // 读取 name
    const nameLength = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + nameLength).toString('utf8').replace(/\0/g, '');
    offset += nameLength;
    
    // 读取 symbol
    const symbolLength = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data.slice(offset, offset + symbolLength).toString('utf8').replace(/\0/g, '');
    
    // 获取 mint 信息以获取 decimals
    const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
    const decimals = mintInfo.value?.data && 'parsed' in mintInfo.value.data 
      ? mintInfo.value.data.parsed.info.decimals 
      : 9;
    
    return {
      name: name.trim(),
      symbol: symbol.trim(),
      decimals,
      verified: false,
      tags: ['metaplex'],
    };
  } catch (error) {
    console.error('从 Metaplex 获取代币信息失败:', error);
    return null;
  }
};

/**
 * 从基本 mint 账户获取代币信息（回退方案）
 */
export const getTokenInfoFromBasicMint = async (
  connection: Connection,
  mintAddress: string
): Promise<TokenInfo | null> => {
  try {
    console.log('正在从基本 mint 账户获取代币信息...');
    const mintPubkey = new PublicKey(mintAddress);
    
    // 获取解析后的账户信息
    const parsedAccountInfo = await connection.getParsedAccountInfo(mintPubkey, 'confirmed');
    
    if (!parsedAccountInfo.value) {
      console.log('未找到 mint 账户');
      return null;
    }

    // 解析账户数据
    const data = parsedAccountInfo.value.data;
    if (!data || typeof data !== 'object' || !('parsed' in data)) {
      console.log('无法解析 mint 账户数据');
      return null;
    }

    const parsedData = data.parsed as any;
    if (!parsedData || !parsedData.info) {
      console.log('mint 账户数据格式无效');
      return null;
    }

    const info = parsedData.info;
    
         // 为常见代币提供基本的名称和符号
     const commonTokens: { [key: string]: { name: string; symbol: string } } = {
       '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': { name: 'USD Coin (Devnet)', symbol: 'USDC' },
       'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { name: 'USD Coin', symbol: 'USDC' },
       'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { name: 'Tether USD', symbol: 'USDT' },
       'So11111111111111111111111111111111111111112': { name: 'Wrapped SOL', symbol: 'WSOL' },
     };

     const commonToken = commonTokens[mintAddress];
    
         return {
       symbol: commonToken?.symbol || `TOKEN-${mintAddress.slice(0, 4)}`,
       name: commonToken?.name || `Token ${mintAddress.slice(0, 8)}...${mintAddress.slice(-4)}`,
       decimals: info.decimals || 9,
       verified: !!commonToken,
       tags: ['basic-mint'],
     };
  } catch (error) {
    console.error('从基本 mint 账户获取代币信息失败:', error);
    return null;
  }
};

/**
 * 综合获取代币信息（按顺序尝试：Jupiter API -> Token-2022 -> Metaplex -> 基本 Mint）
 */
export const getTokenInfo = async (
  connection: Connection,
  mintAddress: string
): Promise<TokenInfo | null> => {
  try {
    // 验证地址格式
    new PublicKey(mintAddress);
  } catch {
    throw new Error('无效的代币地址格式');
  }

  console.log(`开始获取代币信息: ${mintAddress}`);

  // 1. 首先尝试从 Jupiter API 获取
  let tokenInfo = await getTokenInfoFromJupiter(mintAddress);
  
  if (tokenInfo) {
    console.log('从 Jupiter API 获取到代币信息:', tokenInfo);
    return tokenInfo;
  }
  
  // 2. 如果 Jupiter API 没有找到，尝试从 Token-2022 获取
  console.log('Jupiter API 未找到，尝试从 Token-2022 获取...');
  tokenInfo = await getTokenInfoFromToken2022(connection, mintAddress);
  
  if (tokenInfo) {
    console.log('从 Token-2022 获取到代币信息:', tokenInfo);
    return tokenInfo;
  }
  
  // 3. 尝试从 Metaplex 获取
  console.log('Token-2022 未找到，尝试从 Metaplex 获取...');
  tokenInfo = await getTokenInfoFromMetaplex(connection, mintAddress);
  
  if (tokenInfo) {
    console.log('从 Metaplex 获取到代币信息:', tokenInfo);
    return tokenInfo;
  }
  
  // 4. 最后尝试从基本 mint 账户获取（新增）
  console.log('Metaplex 未找到，尝试从基本 mint 账户获取...');
  tokenInfo = await getTokenInfoFromBasicMint(connection, mintAddress);
  
  if (tokenInfo) {
    console.log('从基本 mint 账户获取到代币信息:', tokenInfo);
    return tokenInfo;
  }
  
  console.log('所有方式都未能获取到代币信息');
  return null;
};

/**
 * 格式化代币显示名称
 */
export const formatTokenDisplay = (tokenInfo: TokenInfo | null, mintAddress: string): string => {
  if (!tokenInfo) {
    return `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`;
  }
  
  return tokenInfo.name && tokenInfo.name !== tokenInfo.symbol 
    ? `${tokenInfo.name} (${tokenInfo.symbol})`
    : tokenInfo.symbol;
};

/**
 * 清空 Jupiter 代币列表缓存（用于刷新）
 */
export const clearTokenCache = () => {
  jupiterTokenList = null;
  jupiterTokenListLoadTime = 0;
  jupiterTokenListLoading = null;
}; 