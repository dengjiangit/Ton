import { WhitelistEntry } from '../utils/merkle';

export interface IPFSWhitelistData {
  redPacketId: string;
  creator: string;
  timestamp: number;
  merkleRoot: string;
  entries: WhitelistEntry[];
  metadata: {
    totalAmount: number;
    totalAddresses: number;
    tokenAddress?: string;
    tokenName?: string;
  };
}

export class IPFSService {
  private pinataApiKey: string;
  private pinataSecretKey: string;
  private pinataGateway: string;

  constructor() {
    // 从环境变量获取Pinata配置
    this.pinataApiKey = process.env.REACT_APP_PINATA_API_KEY || '3097d8b2bbcf7bec217a';
    this.pinataSecretKey = process.env.REACT_APP_PINATA_SECRET_KEY || '838defbab3c4f60f9509277426772516437a608ef9d45aef20b1792456a0b15c';
    this.pinataGateway = process.env.REACT_APP_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
  }

  // 上传白名单数据到IPFS
  async uploadWhitelistToIPFS(data: IPFSWhitelistData): Promise<string> {
    try {
      console.log('【IPFS上传】开始上传白名单数据到IPFS...');
      
      const pinataData = {
        pinataContent: data,
        pinataMetadata: {
          name: `whitelist-${data.redPacketId}`,
          keyvalues: {
            redPacketId: data.redPacketId,
            creator: data.creator,
            type: 'whitelist',
            totalAddresses: data.metadata.totalAddresses.toString(),
            timestamp: data.timestamp.toString()
          }
        }
      };

      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey
        },
        body: JSON.stringify(pinataData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Pinata API错误: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      const cid = result.IpfsHash;
      
      console.log('【IPFS上传】上传成功！');
      console.log('- CID:', cid);
      console.log('- 访问链接:', `${this.pinataGateway}${cid}`);
      console.log('- 数据大小:', JSON.stringify(data).length, 'bytes');
      
      return cid;
    } catch (error) {
      console.error('【IPFS上传】上传失败:', error);
      throw new Error(`IPFS上传失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 简化接口，供外部使用
  async getWhitelistData(cid: string): Promise<IPFSWhitelistData | null> {
    try {
      return await this.getWhitelistFromIPFS(cid);
    } catch (error) {
      console.error('【IPFS】获取白名单数据失败:', error);
      return null;
    }
  }

  // 从IPFS获取白名单数据
  async getWhitelistFromIPFS(cid: string): Promise<IPFSWhitelistData> {
    try {
      console.log('【IPFS获取】从IPFS获取白名单数据:', cid);
      
      const response = await fetch(`${this.pinataGateway}${cid}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`IPFS获取失败: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('【IPFS获取】获取成功:', {
        redPacketId: data.redPacketId,
        entriesCount: data.entries?.length || 0,
        timestamp: data.timestamp
      });
      
      return data;
    } catch (error) {
      console.error('【IPFS获取】获取失败:', error);
      throw new Error(`IPFS获取失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 通用方法：从IPFS获取任意JSON数据
  async getData(cid: string): Promise<any> {
    try {
      console.log('【IPFS获取】从IPFS获取数据:', cid);
      
      const response = await fetch(`${this.pinataGateway}${cid}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`IPFS获取失败: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('【IPFS获取】获取成功:', data);
      
      return data;
    } catch (error) {
      console.error('【IPFS获取】获取失败:', error);
      throw new Error(`IPFS获取失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 验证CID格式
  isValidCID(cid: string): boolean {
    // 基本的CID格式验证
    return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid) || /^bafy[a-z2-7]{55}$/.test(cid);
  }

  // 生成IPFS访问URL
  getIPFSUrl(cid: string): string {
    return `${this.pinataGateway}${cid}`;
  }

  // 测试IPFS连接
  async testConnection(): Promise<boolean> {
    try {
      const testData = {
        test: true,
        timestamp: Date.now()
      };

      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey
        },
        body: JSON.stringify({
          pinataContent: testData,
          pinataMetadata: {
            name: 'connection-test'
          }
        })
      });

      return response.ok;
    } catch (error) {
      console.error('【IPFS连接测试】失败:', error);
      return false;
    }
  }
}

// 创建单例实例
export const ipfsService = new IPFSService(); 