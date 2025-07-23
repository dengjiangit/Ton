import { Connection, clusterApiUrl } from '@solana/web3.js';

// 网络配置
export const NETWORK = 'devnet'
export const RPC_ENDPOINT = clusterApiUrl(NETWORK)

// 程序ID已移至 config/constants.ts 文件中统一管理

// 其他配置
export const CLUSTER = NETWORK

// 连接对象
export const connection = new Connection(RPC_ENDPOINT, 'confirmed')

// 基本配置
export const config = {
  network: NETWORK,
  endpoint: RPC_ENDPOINT,
  connection,
} 