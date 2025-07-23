import { useState, useEffect, useCallback, useRef } from 'react';
import { Connection } from '@solana/web3.js';
import { getTokenInfo, TokenInfo, formatTokenDisplay } from '../utils/tokenInfo';
import { RPC_ENDPOINT } from '../config/constants';

// 将Connection实例移到组件外部，避免每次渲染都创建新实例
const connection = new Connection(RPC_ENDPOINT);

export const useTokenInfo = (mintAddress?: string) => {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 用于防止重复请求的引用
  const currentRequestRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTokenInfo = useCallback(async (address: string) => {
    if (!address) {
      setTokenInfo(null);
      setError(null);
      return;
    }

    // 如果已经在请求相同的地址，则跳过
    if (currentRequestRef.current === address) {
      return;
    }

    currentRequestRef.current = address;
    setLoading(true);
    setError(null);
    
    try {
      const info = await getTokenInfo(connection, address);
      
      // 检查是否仍然是当前请求
      if (currentRequestRef.current === address) {
      setTokenInfo(info);
      
      if (!info) {
        setError('It’s new token');
        }
      }
    } catch (err) {
      // 检查是否仍然是当前请求
      if (currentRequestRef.current === address) {
      const errorMessage = err instanceof Error ? err.message : '获取代币信息失败';
      setError(errorMessage);
      setTokenInfo(null);
      }
    } finally {
      // 检查是否仍然是当前请求
      if (currentRequestRef.current === address) {
      setLoading(false);
        currentRequestRef.current = null;
      }
    }
  }, []); // 移除connection依赖，因为connection现在是稳定的

  useEffect(() => {
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (mintAddress && mintAddress.trim()) {
      // 添加防抖延迟
      timeoutRef.current = setTimeout(() => {
        fetchTokenInfo(mintAddress.trim());
      }, 300); // 300ms防抖延迟
    } else {
      setTokenInfo(null);
      setError(null);
      setLoading(false);
      currentRequestRef.current = null;
    }

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [mintAddress, fetchTokenInfo]);

  const displayName = tokenInfo && mintAddress 
    ? formatTokenDisplay(tokenInfo, mintAddress)
    : mintAddress ? `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}` : '';

  return {
    tokenInfo,
    loading,
    error,
    displayName,
    refetch: () => mintAddress && mintAddress.trim() && fetchTokenInfo(mintAddress.trim()),
  };
}; 