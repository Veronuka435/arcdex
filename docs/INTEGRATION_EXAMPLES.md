# Приклади інтеграції Arc DEX

Практичні приклади використання Arc DEX у різних сценаріях.

## Зміст

1. [Базова інтеграція](#базова-інтеграція)
2. [Приклади для Frontend](#приклади-для-frontend)
3. [Приклади для Backend/Scripts](#приклади-для-backendscripts)
4. [Advanced сценарії](#advanced-сценарії)
5. [Обробка помилок](#обробка-помилок)

## Базова інтеграція

### Підключення до Arc Network

```typescript
import { ethers } from 'ethers';

async function connectToArc() {
  const provider = new ethers.BrowserProvider(window.ethereum);

  try {
    await provider.send("wallet_switchEthereumChain", [
      { chainId: "0x122F" }
    ]);
  } catch (error: any) {
    if (error.code === 4902) {
      await provider.send("wallet_addEthereumChain", [{
        chainId: "0x122F",
        chainName: "Arc Testnet",
        nativeCurrency: {
          name: "USDC",
          symbol: "USDC",
          decimals: 6
        },
        rpcUrls: ["https://rpc-testnet.arc.network"],
        blockExplorerUrls: ["https://explorer-testnet.arc.network"]
      }]);
    }
  }

  const signer = await provider.getSigner();
  return { provider, signer };
}
```

## Приклади для Frontend

### 1. Простий Swap компонент

```typescript
import { useState } from 'react';
import { ethers } from 'ethers';

const DEX_ABI = [
  "function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) external returns (uint256)",
  "function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

export function SimpleSwap() {
  const [amountIn, setAmountIn] = useState('');
  const [expectedOut, setExpectedOut] = useState('0');

  const DEX_ADDRESS = '0x...'; // Ваша адреса DEX
  const USDC_ADDRESS = '0x...';
  const WETH_ADDRESS = '0x...';

  async function handleSwap() {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);

    const amount = ethers.parseUnits(amountIn, 6);

    await usdc.approve(DEX_ADDRESS, amount);

    const minOut = ethers.parseUnits(expectedOut, 18) * 99n / 100n;

    const tx = await dex.swap(
      USDC_ADDRESS,
      WETH_ADDRESS,
      amount,
      minOut
    );

    await tx.wait();
    alert('Swap успішно виконано!');
  }

  async function updateQuote() {
    if (!amountIn) return;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, provider);

    const amount = ethers.parseUnits(amountIn, 6);
    const quote = await dex.getAmountOut(USDC_ADDRESS, WETH_ADDRESS, amount);

    setExpectedOut(ethers.formatUnits(quote, 18));
  }

  return (
    <div>
      <input
        type="number"
        value={amountIn}
        onChange={(e) => {
          setAmountIn(e.target.value);
          updateQuote();
        }}
        placeholder="Amount USDC"
      />
      <p>Expected: {expectedOut} WETH</p>
      <button onClick={handleSwap}>Swap</button>
    </div>
  );
}
```

### 2. Liquidity Provider Dashboard

```typescript
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

interface PoolStats {
  reserveUSDC: string;
  reserveWETH: string;
  myLPBalance: string;
  myShare: string;
  poolPrice: string;
}

export function LiquidityDashboard() {
  const [stats, setStats] = useState<PoolStats | null>(null);

  const DEX_ADDRESS = '0x...';
  const USDC_ADDRESS = '0x...';
  const WETH_ADDRESS = '0x...';

  useEffect(() => {
    async function loadStats() {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const dex = new ethers.Contract(DEX_ADDRESS, [
        "function getPool(address tokenA, address tokenB) external view returns (tuple(address tokenA, address tokenB, uint256 reserveA, uint256 reserveB, address lpToken, uint256 totalLiquidity, bool exists))"
      ], provider);

      const pool = await dex.getPool(USDC_ADDRESS, WETH_ADDRESS);

      const lpToken = new ethers.Contract(pool.lpToken, [
        "function balanceOf(address account) external view returns (uint256)"
      ], provider);

      const lpBalance = await lpToken.balanceOf(userAddress);
      const share = pool.totalLiquidity > 0
        ? (Number(lpBalance) / Number(pool.totalLiquidity) * 100).toFixed(2)
        : '0';

      const price = Number(pool.reserveA) / Number(pool.reserveB);

      setStats({
        reserveUSDC: ethers.formatUnits(pool.reserveA, 6),
        reserveWETH: ethers.formatUnits(pool.reserveB, 18),
        myLPBalance: ethers.formatUnits(lpBalance, 18),
        myShare: share,
        poolPrice: price.toFixed(2)
      });
    }

    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h2>USDC/WETH Pool</h2>
      <p>Reserve USDC: {stats.reserveUSDC}</p>
      <p>Reserve WETH: {stats.reserveWETH}</p>
      <p>Price: 1 WETH = {stats.poolPrice} USDC</p>
      <p>My LP Tokens: {stats.myLPBalance}</p>
      <p>My Share: {stats.myShare}%</p>
    </div>
  );
}
```

### 3. Real-time Price Chart

```typescript
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

interface PricePoint {
  timestamp: number;
  price: number;
}

export function PriceChart() {
  const [prices, setPrices] = useState<PricePoint[]>([]);

  const DEX_ADDRESS = '0x...';
  const USDC_ADDRESS = '0x...';
  const WETH_ADDRESS = '0x...';

  useEffect(() => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const dex = new ethers.Contract(DEX_ADDRESS, [
      "event Swap(bytes32 indexed poolId, address indexed trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)"
    ], provider);

    dex.on("Swap", async (poolId, trader, tokenIn, tokenOut, amountIn, amountOut) => {
      const pool = await dex.getPool(USDC_ADDRESS, WETH_ADDRESS);
      const price = Number(pool.reserveA) / Number(pool.reserveB);

      setPrices(prev => [...prev, {
        timestamp: Date.now(),
        price
      }].slice(-100));
    });

    return () => {
      dex.removeAllListeners("Swap");
    };
  }, []);

  return (
    <div>
      {prices.map((point, i) => (
        <div key={i}>
          {new Date(point.timestamp).toLocaleTimeString()}: ${point.price.toFixed(2)}
        </div>
      ))}
    </div>
  );
}
```

## Приклади для Backend/Scripts

### 1. Automated Market Maker Bot

```javascript
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://rpc-testnet.arc.network');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const DEX_ADDRESS = '0x...';
const USDC_ADDRESS = '0x...';
const WETH_ADDRESS = '0x...';

async function monitorAndArbitrage() {
  const dex = new ethers.Contract(DEX_ADDRESS, [
    "function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256)",
    "function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) external returns (uint256)"
  ], wallet);

  setInterval(async () => {
    const amountIn = ethers.parseUnits('1000', 6);

    const amountOut1 = await dex.getAmountOut(USDC_ADDRESS, WETH_ADDRESS, amountIn);
    const amountOut2 = await dex.getAmountOut(WETH_ADDRESS, USDC_ADDRESS, amountOut1);

    const profit = amountOut2 - amountIn;
    const profitPercent = Number(profit) / Number(amountIn) * 100;

    console.log(`Profit opportunity: ${profitPercent.toFixed(4)}%`);

    if (profitPercent > 1) {
      console.log('Executing arbitrage...');

      const usdc = new ethers.Contract(USDC_ADDRESS, [
        "function approve(address spender, uint256 amount) external returns (bool)"
      ], wallet);

      await usdc.approve(DEX_ADDRESS, amountIn);
      await dex.swap(USDC_ADDRESS, WETH_ADDRESS, amountIn, amountOut1 * 99n / 100n);

      const weth = new ethers.Contract(WETH_ADDRESS, [
        "function approve(address spender, uint256 amount) external returns (bool)"
      ], wallet);

      await weth.approve(DEX_ADDRESS, amountOut1);
      await dex.swap(WETH_ADDRESS, USDC_ADDRESS, amountOut1, amountOut2 * 99n / 100n);

      console.log('Arbitrage completed!');
    }
  }, 5000);
}

monitorAndArbitrage();
```

### 2. Liquidity Rebalancing Script

```javascript
const { ethers } = require('ethers');

async function rebalanceLiquidity() {
  const provider = new ethers.JsonRpcProvider('https://rpc-testnet.arc.network');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const DEX_ADDRESS = '0x...';
  const USDC_ADDRESS = '0x...';
  const WETH_ADDRESS = '0x...';

  const dex = new ethers.Contract(DEX_ADDRESS, [
    "function getPool(address tokenA, address tokenB) external view returns (tuple(address tokenA, address tokenB, uint256 reserveA, uint256 reserveB, address lpToken, uint256 totalLiquidity, bool exists))",
    "function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 minAmountA, uint256 minAmountB) external returns (uint256 amountA, uint256 amountB)",
    "function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB, uint256 minLiquidity) external returns (uint256 liquidity)"
  ], wallet);

  const pool = await dex.getPool(USDC_ADDRESS, WETH_ADDRESS);

  const currentRatio = Number(pool.reserveA) / Number(pool.reserveB);
  const targetRatio = 1000;

  console.log(`Current ratio: ${currentRatio.toFixed(2)}, Target: ${targetRatio}`);

  if (Math.abs(currentRatio - targetRatio) / targetRatio > 0.05) {
    console.log('Rebalancing needed...');

    const lpToken = new ethers.Contract(pool.lpToken, [
      "function balanceOf(address account) external view returns (uint256)",
      "function approve(address spender, uint256 amount) external returns (bool)"
    ], wallet);

    const lpBalance = await lpToken.balanceOf(wallet.address);

    await lpToken.approve(DEX_ADDRESS, lpBalance);
    await dex.removeLiquidity(USDC_ADDRESS, WETH_ADDRESS, lpBalance, 0, 0);

    const usdc = new ethers.Contract(USDC_ADDRESS, [
      "function balanceOf(address account) external view returns (uint256)",
      "function approve(address spender, uint256 amount) external returns (bool)"
    ], wallet);

    const weth = new ethers.Contract(WETH_ADDRESS, [
      "function balanceOf(address account) external view returns (uint256)",
      "function approve(address spender, uint256 amount) external returns (bool)"
    ], wallet);

    const usdcBalance = await usdc.balanceOf(wallet.address);
    const wethBalance = await weth.balanceOf(wallet.address);

    const newUsdcAmount = usdcBalance / 2n;
    const newWethAmount = newUsdcAmount / BigInt(targetRatio);

    await usdc.approve(DEX_ADDRESS, newUsdcAmount);
    await weth.approve(DEX_ADDRESS, newWethAmount);

    await dex.addLiquidity(USDC_ADDRESS, WETH_ADDRESS, newUsdcAmount, newWethAmount, 0);

    console.log('Rebalancing completed!');
  }
}

rebalanceLiquidity();
```

### 3. Analytics Data Collector

```javascript
const { ethers } = require('ethers');
const { createClient } = require('@supabase/supabase-js');

const provider = new ethers.JsonRpcProvider('https://rpc-testnet.arc.network');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const DEX_ADDRESS = '0x...';

async function collectSwapData() {
  const dex = new ethers.Contract(DEX_ADDRESS, [
    "event Swap(bytes32 indexed poolId, address indexed trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)"
  ], provider);

  dex.on("Swap", async (poolId, trader, tokenIn, tokenOut, amountIn, amountOut, event) => {
    const block = await provider.getBlock(event.blockNumber);

    const swapData = {
      pool_id: poolId,
      trader: trader,
      token_in: tokenIn,
      token_out: tokenOut,
      amount_in: amountIn.toString(),
      amount_out: amountOut.toString(),
      tx_hash: event.transactionHash,
      block_number: event.blockNumber,
      timestamp: new Date(block.timestamp * 1000).toISOString()
    };

    const { error } = await supabase.from('swaps').insert(swapData);

    if (error) {
      console.error('Error saving swap:', error);
    } else {
      console.log('Swap saved:', swapData.tx_hash);
    }
  });

  console.log('Listening for swaps...');
}

collectSwapData();
```

## Advanced сценарії

### Multi-hop Swap (Routing)

```typescript
async function multiHopSwap(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  intermediateToken: string
) {
  const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);

  const quote1 = await dex.getAmountOut(tokenIn, intermediateToken, amountIn);
  const quote2 = await dex.getAmountOut(intermediateToken, tokenOut, quote1);

  const directQuote = await dex.getAmountOut(tokenIn, tokenOut, amountIn);

  if (quote2 > directQuote) {
    console.log('Multi-hop is better!');

    const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, signer);
    await tokenInContract.approve(DEX_ADDRESS, amountIn);

    const tx1 = await dex.swap(tokenIn, intermediateToken, amountIn, quote1 * 99n / 100n);
    await tx1.wait();

    const intermediateContract = new ethers.Contract(intermediateToken, ERC20_ABI, signer);
    await intermediateContract.approve(DEX_ADDRESS, quote1);

    const tx2 = await dex.swap(intermediateToken, tokenOut, quote1, quote2 * 99n / 100n);
    await tx2.wait();
  } else {
    console.log('Direct swap is better!');

    const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, signer);
    await tokenInContract.approve(DEX_ADDRESS, amountIn);

    const tx = await dex.swap(tokenIn, tokenOut, amountIn, directQuote * 99n / 100n);
    await tx.wait();
  }
}
```

### Flash Swap (without flash loans)

```typescript
async function flashSwap(token: string, amount: bigint) {
  const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);

  const tx = await signer.sendTransaction({
    to: DEX_ADDRESS,
    data: dex.interface.encodeFunctionData('swap', [
      token,
      WETH_ADDRESS,
      amount,
      0
    ]),
    gasLimit: 500000
  });

  await tx.wait();
}
```

## Обробка помилок

### Всеохоплююча обробка

```typescript
async function safeSwap(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint
) {
  try {
    const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, signer);

    const balance = await tokenInContract.balanceOf(await signer.getAddress());
    if (balance < amountIn) {
      throw new Error('Недостатній баланс');
    }

    const allowance = await tokenInContract.allowance(
      await signer.getAddress(),
      DEX_ADDRESS
    );

    if (allowance < amountIn) {
      console.log('Approving token...');
      const approveTx = await tokenInContract.approve(DEX_ADDRESS, amountIn);
      await approveTx.wait();
    }

    const quote = await dex.getAmountOut(tokenIn, tokenOut, amountIn);
    const minOut = quote * 99n / 100n;

    console.log('Executing swap...');
    const swapTx = await dex.swap(tokenIn, tokenOut, amountIn, minOut);
    const receipt = await swapTx.wait();

    console.log('Swap успішно!', receipt.hash);
    return receipt;

  } catch (error: any) {
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('Недостатньо USDC для оплати газу');
    } else if (error.message.includes('slippage')) {
      console.error('Slippage занадто великий, спробуйте меншу суму');
    } else if (error.message.includes('insufficient liquidity')) {
      console.error('Недостатня ліквідність у пулі');
    } else {
      console.error('Невідома помилка:', error.message);
    }
    throw error;
  }
}
```

### Retry логіка

```typescript
async function retryableSwap(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await safeSwap(tokenIn, tokenOut, amountIn);
    } catch (error: any) {
      console.error(`Attempt ${i + 1} failed:`, error.message);

      if (i === maxRetries - 1) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
}
```

---

Усі приклади готові до використання та адаптовані під особливості Arc Network!
