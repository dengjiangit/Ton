import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, BN } from '@project-serum/anchor';
import { RedPacketService, createRedPacketService } from '../services/redPacketService';
import { RED_PACKET_PROGRAM_ID } from '../config/constants';

/**
 * 红包服务使用示例
 */
export class RedPacketServiceExample {
  private connection: Connection;
  private provider: AnchorProvider;
  private redPacketService: RedPacketService;

  constructor(connection: Connection, provider: AnchorProvider, contractAddress?: PublicKey) {
    this.connection = connection;
    this.provider = provider;
    // 创建红包服务实例，支持可选的合约地址参数
    this.redPacketService = createRedPacketService(connection, provider, contractAddress);
  }

  /**
   * 创建使用默认合约的红包服务
   */
  static createDefault(connection: Connection, provider: AnchorProvider): RedPacketServiceExample {
    return new RedPacketServiceExample(connection, provider);
  }

  /**
   * 创建使用指定合约地址的红包服务
   */
  static createWithContract(connection: Connection, provider: AnchorProvider, contractAddress: PublicKey): RedPacketServiceExample {
    return new RedPacketServiceExample(connection, provider, contractAddress);
  }

  /**
   * 示例：创建SOL红包
   */
  async createSolRedPacketExample(): Promise<string> {
    console.log('正在创建SOL红包...');
    
    const result = await this.redPacketService.createSolRedPacket({
      totalAmount: new BN(1000000000), // 1 SOL
      packetCount: 10,
      redPacketType: 1, // 随机红包
      expiryDays: 7,
      randomSeed: new BN(Date.now()),
    });

    console.log('SOL红包创建成功:', result);
    return result;
  }

  /**
   * 示例：创建代币红包
   */
  async createTokenRedPacketExample(mint: PublicKey): Promise<string> {
    console.log('正在创建代币红包...');
    
    const result = await this.redPacketService.createTokenRedPacket({
      totalAmount: new BN(1000000), // 1 Token (6位小数)
      packetCount: 5,
      redPacketType: 0, // 均等红包
      mint: mint,
      expiryDays: 3,
    });

    console.log('代币红包创建成功:', result);
    return result;
  }

  /**
   * 示例：领取红包
   */
  async claimRedPacketExample(redPacketId: string, creator: string): Promise<string> {
    console.log('正在领取红包...');
    
    const result = await this.redPacketService.claimRedPacket(redPacketId, creator);
    console.log('红包领取成功:', result);
    return result;
  }

  /**
   * 示例：退款红包
   */
  async refundRedPacketExample(redPacketId: string, creator: string): Promise<string> {
    console.log('正在退款红包...');
    
    const result = await this.redPacketService.refundRedPacket(redPacketId, creator);
    console.log('红包退款成功:', result);
    return result;
  }
}

/**
 * 基本使用示例
 */
export async function basicUsageExample(connection: Connection, provider: AnchorProvider) {
  console.log('=== 红包服务基本使用示例 ===');
  
  // 使用默认合约地址
  const service = RedPacketServiceExample.createDefault(connection, provider);
  console.log('使用默认合约地址:', RED_PACKET_PROGRAM_ID.toString());
  
  // 或者使用指定的合约地址
  const customService = RedPacketServiceExample.createWithContract(connection, provider, RED_PACKET_PROGRAM_ID);
  console.log('使用指定合约地址:', RED_PACKET_PROGRAM_ID.toString());
  
  console.log('\n=== 示例完成 ===');
}

// 前端组件中的使用示例
export const ReactComponentExample = `
import { useRedPacketService } from '../services/redPacketService';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@project-serum/anchor';
import { RED_PACKET_PROGRAM_ID } from '../config/constants';

function MyComponent() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const provider = new AnchorProvider(connection, wallet, {});
  
  // 使用默认合约地址
  const redPacketService = useRedPacketService(connection, provider);
  
  // 或者使用指定的合约地址
  const customService = useRedPacketService(connection, provider, RED_PACKET_PROGRAM_ID);
  
  const handleClaim = async () => {
    if (redPacketService) {
      const result = await redPacketService.claimRedPacket('123', 'creator');
      console.log('领取成功:', result);
    }
  };
  
  return <button onClick={handleClaim}>领取红包</button>;
}
`; 