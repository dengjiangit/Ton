import { PublicKey } from '@solana/web3.js';


export const RED_PACKET_PROGRAM_ID = new PublicKey('HNrivchW1kF64xufRHWxN41EXLm2Q1h2UkCkT4nX1uSE');

export const LAUNCHPAD_MINT_PROGRAM_ID = new PublicKey('6jYBw1mAaH3aJrKEjoacBmNT43MqnTanDBUpiyMX4TN');

export const LAUNCHPAD_CrowdFunding_PROGRAM_ID = new PublicKey('CfwHJ1YNiR9BjwLYqdYosYHUbdpSxnniUWYPNEUBGjpU');

// 网络配置
export const RPC_ENDPOINT = 'https://devnet.helius-rpc.com/?api-key=a08565ed-9671-4cb4-8568-a014f810bfb2'


// 程序ID - 最新部署的红包合约地址Devnet
export const RED_PACKET_PROGRAM_ID_DEVNET = new PublicKey('RedGJbeNejUtP6vMEPDkG55yRf7oAbkMFGeDjXaNfe1');
// 程序ID - 最新部署的红包合约地址Mainnet
export const RED_PACKET_PROGRAM_ID_MAINNET = new PublicKey('HNrivchW1kF64xufRHWxN41EXLm2Q1h2UkCkT4nX1uSE');
// 程序ID - 最新部署的launchpad Mint合约地址Devnet
export const LAUNCHPAD_MINT_PROGRAM_ID_DEVNET = new PublicKey('6jYBw1mAaH3aJrKEjoacBmNT43MqnTanDBUpiyMX4TN');
// 程序ID - 最新部署的launchpad Mint合约地址Mainnet
export const LAUNCHPAD_MINT_PROGRAM_ID_MAINNET = new PublicKey('6jYBw1mAaH3aJrKEjoacBmNT43MqnTanDBUpiyMX4TN');
// 程序ID - 最新部署的launchpad CrowdFunding合约地址Devnet
export const LAUNCHPAD_CrowdFunding_PROGRAM_ID_DEVNET = new PublicKey('CfwHJ1YNiR9BjwLYqdYosYHUbdpSxnniUWYPNEUBGjpU');
// 程序ID - 最新部署的launchpad CrowdFunding合约地址Mainnet
export const LAUNCHPAD_CrowdFunding_PROGRAM_ID_MAINNET = new PublicKey('CfwHJ1YNiR9BjwLYqdYosYHUbdpSxnniUWYPNEUBGjpU');


// 网络配置 - Devnet
export const RPC_ENDPOINT_DEVNET = 'https://devnet.helius-rpc.com/?api-key=a08565ed-9671-4cb4-8568-a014f810bfb2'

// 网络配置 - Mainnet
export const RPC_ENDPOINT_MAINNET = 'https://mainnet.helius-rpc.com/?api-key=a08565ed-9671-4cb4-8568-a014f810bfb2'

// 红包相关常量
export const MIN_RED_PACKET_AMOUNT = 0.001 // SOL
export const MAX_RED_PACKET_AMOUNT = 100 // SOL
export const MIN_RED_PACKET_COUNT = 1
export const MAX_RED_PACKET_COUNT = 100

// UI 常量
export const TOAST_DURATION = 5000
export const DEFAULT_TIMEOUT = 30000

// 种子字符串
export const RED_PACKET_SEED = 'red_packet'
export const USER_STATE_SEED = 'user_state' 
export const CREATOR_STATE_SEED = 'creator_state'

// SOL相关常量
export const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112'

// API配置
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL = (() => {
  if (isLocalhost) {
    return 'http://129.226.152.88:8081'; // 本地环境使用8080端口 - 主网；8081端口 - 测试网
  } else {
    // 生产环境使用当前域名加上44321端口
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
    return `${protocol}//${hostname}:44321`;//线上测试网 44321端口
  }
})();

// 构建API URL的工具函数
export const buildApiUrl = (path: string): string => {
  const baseUrl = API_BASE_URL;
  if (baseUrl === '') {
    // 生产环境使用相对路径
    return path.startsWith('/') ? path : `/${path}`;
  }
  // 本地环境使用完整URL
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${apiPath}`;
};