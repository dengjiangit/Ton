# SPL Token 信息获取功能使用指南

## 概述

本项目提供了完整的 SPL Token 信息获取功能，可以根据代币地址自动获取代币的名称、符号、图标等元数据信息。

## 功能特性

- ✅ 支持 Jupiter API（推荐，包含大量验证代币）
- ✅ 支持 Token-2022 标准（新一代代币标准）
- ✅ 支持 Metaplex Token Metadata（链上数据）
- ✅ 智能查询顺序：Jupiter API -> Token-2022 -> Metaplex
- ✅ 自动缓存代币信息
- ✅ 错误处理和重试机制
- ✅ React Hook 和组件封装
- ✅ TypeScript 类型支持

## 查询顺序

系统按以下顺序查询代币信息：

1. **Jupiter API** - 优先使用，包含大量验证代币和图标
2. **Token-2022** - 支持新标准的代币，包含扩展元数据
3. **Metaplex Token Metadata** - 传统标准的链上元数据

## 核心文件

### 1. 工具函数 (`src/utils/tokenInfo.ts`)

```typescript
import { getTokenInfo, formatTokenDisplay } from '../utils/tokenInfo';
```

**主要功能：**
- `getTokenInfo()`: 获取代币完整信息（支持所有三种数据源）
- `getTokenInfoFromJupiter()`: 从 Jupiter API 获取
- `getTokenInfoFromToken2022()`: 从 Token-2022 获取
- `getTokenInfoFromMetaplex()`: 从 Metaplex 获取
- `formatTokenDisplay()`: 格式化显示名称
- `clearTokenCache()`: 清空缓存

### 2. React Hook (`src/hooks/useTokenInfo.ts`)

```typescript
import { useTokenInfo } from '../hooks/useTokenInfo';

const { tokenInfo, loading, error, displayName, refetch } = useTokenInfo(mintAddress);
```

### 3. React 组件 (`src/components/TokenInfo.tsx`)

```typescript
import { TokenInfo, TokenName } from '../components/TokenInfo';
```

## 使用方法

### 1. 基本用法 - 使用 Hook

```typescript
import React from 'react';
import { useTokenInfo } from '../hooks/useTokenInfo';

const MyComponent = () => {
  const mintAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC
  const { tokenInfo, loading, error, displayName } = useTokenInfo(mintAddress);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      <h3>{displayName}</h3>
      {tokenInfo && (
        <div>
          <p>符号: {tokenInfo.symbol}</p>
          <p>名称: {tokenInfo.name}</p>
          <p>精度: {tokenInfo.decimals}</p>
          <p>已验证: {tokenInfo.verified ? '是' : '否'}</p>
          {tokenInfo.tags && <p>标签: {tokenInfo.tags.join(', ')}</p>}
        </div>
      )}
    </div>
  );
};
```

### 2. 使用 TokenInfo 组件

```typescript
import React from 'react';
import { TokenInfo } from '../components/TokenInfo';

const MyComponent = () => {
  return (
    <div>
      {/* 简化显示 */}
      <TokenInfo 
        mintAddress="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" 
        size="md" 
      />
      
      {/* 详细显示 */}
      <TokenInfo 
        mintAddress="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" 
        showDetails={true}
        size="lg" 
      />
    </div>
  );
};
```

### 3. 使用 TokenName 组件

```typescript
import React from 'react';
import { TokenName } from '../components/TokenInfo';

const MyComponent = () => {
  return (
    <div>
      代币: <TokenName mintAddress="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" />
    </div>
  );
};
```

### 4. 在表单中使用

```typescript
import React, { useState } from 'react';
import { TokenInfo } from '../components/TokenInfo';

const TokenSelector = () => {
  const [tokenAddress, setTokenAddress] = useState('');

  return (
    <div>
      <input
        value={tokenAddress}
        onChange={(e) => setTokenAddress(e.target.value)}
        placeholder="输入代币地址"
      />
      
      {tokenAddress && (
        <TokenInfo 
          mintAddress={tokenAddress} 
          showDetails={true} 
        />
      )}
    </div>
  );
};
```

## 数据源详情

### 1. Jupiter API (优先使用)

- **URL**: `https://token.jup.ag/all`
- **优点**: 包含大量验证代币，有图标和详细信息
- **缺点**: 不包含所有代币，需要网络请求
- **缓存**: 5分钟有效期

### 2. Token-2022 (新增支持)

- **来源**: Solana Token-2022 程序
- **优点**: 支持新标准代币，包含扩展元数据
- **特性**: 支持原生元数据扩展
- **标识**: 会添加 `token-2022` 标签

### 3. Metaplex Token Metadata (备用)

- **来源**: Solana 链上 Token Metadata 程序
- **优点**: 包含所有有 metadata 的传统代币
- **缺点**: 需要链上查询，解析复杂
- **标识**: 会添加 `metaplex` 标签

## 组件属性

### TokenInfo 组件

```typescript
interface TokenInfoProps {
  mintAddress: string;      // 代币地址
  showDetails?: boolean;    // 是否显示详细信息 (默认: false)
  size?: 'sm' | 'md' | 'lg'; // 组件大小 (默认: 'md')
}
```

### useTokenInfo Hook

```typescript
interface UseTokenInfoReturn {
  tokenInfo: TokenInfo | null;    // 代币信息对象
  loading: boolean;               // 是否正在加载
  error: string | null;           // 错误信息
  displayName: string;            // 格式化的显示名称
  refetch: () => void;            // 重新获取函数
}
```

### TokenInfo 接口

```typescript
interface TokenInfo {
  symbol: string;           // 代币符号
  name: string;             // 代币名称
  logoURI?: string;         // 代币图标URL
  decimals: number;         // 精度
  tags?: string[];          // 标签数组
  verified?: boolean;       // 是否已验证
}
```

## 常见代币地址示例

```typescript
const COMMON_TOKENS = {
  // 传统代币
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  SOL: 'So11111111111111111111111111111111111111112',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  SRM: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
  
  // Token-2022 示例（请用实际地址替换）
  // EXAMPLE_TOKEN_2022: '...',
};
```

## 错误处理

```typescript
const { tokenInfo, error } = useTokenInfo(mintAddress);

if (error) {
  // 可能的错误类型：
  // - "无效的代币地址格式"
  // - "未找到代币信息"  
  // - "获取代币信息失败"
  console.error('代币信息获取失败:', error);
}
```

## 性能优化

1. **缓存机制**: Jupiter API 数据会被缓存，避免重复请求
2. **懒加载**: 只有在需要时才获取代币信息
3. **防抖处理**: 300ms防抖延迟，避免频繁请求
4. **并发控制**: 防止同时发起多个相同请求

```typescript
import { useMemo } from 'react';
import { useTokenInfo } from '../hooks/useTokenInfo';

const MyComponent = ({ mintAddress }: { mintAddress: string }) => {
  // 使用 useMemo 避免频繁调用
  const validAddress = useMemo(() => {
    try {
      return mintAddress.trim() ? mintAddress : undefined;
    } catch {
      return undefined;
    }
  }, [mintAddress]);

  const { tokenInfo } = useTokenInfo(validAddress);
  
  return <div>{/* 组件内容 */}</div>;
};
```

## Token-2022 特性支持

Token-2022 是 Solana 的新一代代币标准，支持以下特性：

- **原生元数据**: 直接存储在 mint 账户中
- **扩展功能**: 支持多种扩展（转账费、利息等）
- **向后兼容**: 与传统 SPL Token 兼容

当检测到 Token-2022 代币时，系统会：
- 自动识别并解析扩展元数据
- 添加 `token-2022` 标签
- 提取 name、symbol、uri 等信息

## 注意事项

1. **网络依赖**: Jupiter API 需要网络连接
2. **RPC 限制**: 频繁查询可能触发 RPC 限制
3. **地址验证**: 确保提供有效的代币地址
4. **缓存更新**: 可使用 `clearTokenCache()` 强制刷新缓存
5. **Token-2022**: 新标准代币可能不在 Jupiter API 中

## 更新日志

- **v2.0**: 添加 Token-2022 支持
- **v1.1**: 优化缓存机制和错误处理
- **v1.0**: 基础功能实现

## 示例页面

查看 `src/examples/TokenInfoExample.tsx` 获取完整的使用示例。 