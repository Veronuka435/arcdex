import { ethers } from 'ethers';

const DEXCoreABI = [
  "function createPool(address tokenA, address tokenB) external returns (bytes32)",
  "function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB, uint256 minLiquidity) external returns (uint256 liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 minAmountA, uint256 minAmountB) external returns (uint256 amountA, uint256 amountB)",
  "function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut)",
  "function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut)",
  "function getPool(address tokenA, address tokenB) external view returns (tuple(address tokenA, address tokenB, uint256 reserveA, uint256 reserveB, address lpToken, uint256 totalLiquidity, bool exists))",
  "function getPoolId(address tokenA, address tokenB) external pure returns (bytes32)",
  "function getAllPoolIds() external view returns (bytes32[] memory)",
  "function swapFee() external view returns (uint256)",
  "event PoolCreated(bytes32 indexed poolId, address indexed tokenA, address indexed tokenB, address lpToken)",
  "event LiquidityAdded(bytes32 indexed poolId, address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity)",
  "event LiquidityRemoved(bytes32 indexed poolId, address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity)",
  "event Swap(bytes32 indexed poolId, address indexed trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)"
];

const ERC20ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)"
];

export interface Pool {
  tokenA: string;
  tokenB: string;
  reserveA: bigint;
  reserveB: bigint;
  lpToken: string;
  totalLiquidity: bigint;
  exists: boolean;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
}

export class DEXService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private dexAddress: string;

  constructor(dexAddress: string) {
    this.dexAddress = dexAddress;
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
    }
  }

  setProvider(provider: ethers.BrowserProvider): void {
    this.provider = provider;
    this.signer = null;
  }

  private ensureProvider(): ethers.BrowserProvider {
    if (!this.provider) {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Web3 wallet not found. Please install MetaMask or another Web3 wallet.');
      }
      this.provider = new ethers.BrowserProvider(window.ethereum);
    }
    return this.provider;
  }

  async connect(): Promise<string> {
    const provider = this.ensureProvider();

    try {
      await provider.send("eth_requestAccounts", []);
      this.signer = await provider.getSigner();
      return await this.signer.getAddress();
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected wallet connection');
      }
      throw new Error(`Connection error: ${error.message}`);
    }
  }

  async switchToArcNetwork(): Promise<void> {
    const provider = this.ensureProvider();

    try {
      await provider.send("wallet_switchEthereumChain", [
        { chainId: "0x122F" }
      ]);
    } catch (error: any) {
      const errorCode = error.code || error.error?.code || error.info?.error?.code;
      const needsToAddNetwork = errorCode === 4902 ||
                                 error.message?.includes('Unrecognized chain ID') ||
                                 error.message?.includes('wallet_addEthereumChain');

      if (needsToAddNetwork) {
        try {
          await provider.send("wallet_addEthereumChain", [
            {
              chainId: "0x122F",
              chainName: "Arc Testnet",
              nativeCurrency: {
                name: "USDC",
                symbol: "USDC",
                decimals: 18
              },
              rpcUrls: ["https://rpc-testnet.arc.network"],
              blockExplorerUrls: ["https://explorer-testnet.arc.network"]
            }
          ]);
        } catch (addError: any) {
          throw new Error(`Failed to add Arc network: ${addError.message}`);
        }
      } else if (errorCode === 4001) {
        throw new Error('User rejected network change');
      } else {
        throw new Error(`Network change error: ${error.message}`);
      }
    }
  }

  private getDEXContract(withSigner: boolean = false) {
    if (withSigner && !this.signer) {
      throw new Error('Wallet not connected');
    }
    const provider = this.ensureProvider();
    return new ethers.Contract(
      this.dexAddress,
      DEXCoreABI,
      withSigner ? this.signer! : provider
    );
  }

  private getTokenContract(tokenAddress: string, withSigner: boolean = false) {
    if (withSigner && !this.signer) {
      throw new Error('Wallet not connected');
    }
    const provider = this.ensureProvider();
    return new ethers.Contract(
      tokenAddress,
      ERC20ABI,
      withSigner ? this.signer! : provider
    );
  }

  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    const token = this.getTokenContract(tokenAddress);
    const userAddress = this.signer ? await this.signer.getAddress() : ethers.ZeroAddress;

    const [symbol, name, decimals, balance] = await Promise.all([
      token.symbol(),
      token.name(),
      token.decimals(),
      token.balanceOf(userAddress)
    ]);

    return {
      address: tokenAddress,
      symbol,
      name,
      decimals: Number(decimals),
      balance
    };
  }

  async getPool(tokenA: string, tokenB: string): Promise<Pool | null> {
    const dex = this.getDEXContract();
    const pool = await dex.getPool(tokenA, tokenB);

    if (!pool.exists) {
      return null;
    }

    return {
      tokenA: pool.tokenA,
      tokenB: pool.tokenB,
      reserveA: pool.reserveA,
      reserveB: pool.reserveB,
      lpToken: pool.lpToken,
      totalLiquidity: pool.totalLiquidity,
      exists: pool.exists
    };
  }

  async getAllPools(): Promise<Pool[]> {
    const dex = this.getDEXContract();
    const poolIds = await dex.getAllPoolIds();

    const pools: Pool[] = [];
    for (const poolId of poolIds) {
      const pool = await dex.pools(poolId);
      if (pool.exists) {
        pools.push({
          tokenA: pool.tokenA,
          tokenB: pool.tokenB,
          reserveA: pool.reserveA,
          reserveB: pool.reserveB,
          lpToken: pool.lpToken,
          totalLiquidity: pool.totalLiquidity,
          exists: pool.exists
        });
      }
    }

    return pools;
  }

  async getSwapQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint
  ): Promise<{ amountOut: bigint; priceImpact: number }> {
    const dex = this.getDEXContract();
    const pool = await this.getPool(tokenIn, tokenOut);

    if (!pool) {
      throw new Error('Pool does not exist');
    }

    const amountOut = await dex.getAmountOut(tokenIn, tokenOut, amountIn);

    const isTokenA = tokenIn.toLowerCase() < tokenOut.toLowerCase();
    const reserveIn = isTokenA ? pool.reserveA : pool.reserveB;
    const reserveOut = isTokenA ? pool.reserveB : pool.reserveA;

    const expectedPrice = (reserveOut * BigInt(1e18)) / reserveIn;
    const executedPrice = (amountOut * BigInt(1e18)) / amountIn;
    const priceImpact = Number((expectedPrice - executedPrice) * BigInt(10000) / expectedPrice) / 100;

    return {
      amountOut,
      priceImpact
    };
  }

  async approveToken(
    tokenAddress: string,
    amount: bigint
  ): Promise<ethers.ContractTransactionResponse> {
    const token = this.getTokenContract(tokenAddress, true);
    return await token.approve(this.dexAddress, amount);
  }

  async checkAllowance(tokenAddress: string): Promise<bigint> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const token = this.getTokenContract(tokenAddress);
    const userAddress = await this.signer.getAddress();
    return await token.allowance(userAddress, this.dexAddress);
  }

  async swap(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    minAmountOut: bigint
  ): Promise<ethers.ContractTransactionResponse> {
    const dex = this.getDEXContract(true);

    const allowance = await this.checkAllowance(tokenIn);
    if (allowance < amountIn) {
      const approveTx = await this.approveToken(tokenIn, amountIn);
      await approveTx.wait();
    }

    return await dex.swap(tokenIn, tokenOut, amountIn, minAmountOut);
  }

  async addLiquidity(
    tokenA: string,
    tokenB: string,
    amountA: bigint,
    amountB: bigint,
    slippageTolerance: number = 1
  ): Promise<ethers.ContractTransactionResponse> {
    const dex = this.getDEXContract(true);

    const allowanceA = await this.checkAllowance(tokenA);
    if (allowanceA < amountA) {
      const approveTx = await this.approveToken(tokenA, amountA);
      await approveTx.wait();
    }

    const allowanceB = await this.checkAllowance(tokenB);
    if (allowanceB < amountB) {
      const approveTx = await this.approveToken(tokenB, amountB);
      await approveTx.wait();
    }

    const pool = await this.getPool(tokenA, tokenB);
    let minLiquidity = BigInt(0);

    if (pool && pool.totalLiquidity > 0) {
      const isTokenA = tokenA.toLowerCase() < tokenB.toLowerCase();
      const amount0 = isTokenA ? amountA : amountB;
      const reserve0 = isTokenA ? pool.reserveA : pool.reserveB;

      const expectedLiquidity = (amount0 * pool.totalLiquidity) / reserve0;
      minLiquidity = (expectedLiquidity * BigInt(100 - slippageTolerance)) / BigInt(100);
    }

    return await dex.addLiquidity(
      tokenA,
      tokenB,
      amountA,
      amountB,
      minLiquidity
    );
  }

  async removeLiquidity(
    tokenA: string,
    tokenB: string,
    liquidity: bigint,
    slippageTolerance: number = 1
  ): Promise<ethers.ContractTransactionResponse> {
    const dex = this.getDEXContract(true);
    const pool = await this.getPool(tokenA, tokenB);

    if (!pool) {
      throw new Error('Pool does not exist');
    }

    const lpToken = this.getTokenContract(pool.lpToken, true);
    const allowance = await lpToken.allowance(
      await this.signer!.getAddress(),
      this.dexAddress
    );

    if (allowance < liquidity) {
      const approveTx = await lpToken.approve(this.dexAddress, liquidity);
      await approveTx.wait();
    }

    const isTokenA = tokenA.toLowerCase() < tokenB.toLowerCase();
    const amount0 = (liquidity * (isTokenA ? pool.reserveA : pool.reserveB)) / pool.totalLiquidity;
    const amount1 = (liquidity * (isTokenA ? pool.reserveB : pool.reserveA)) / pool.totalLiquidity;

    const minAmount0 = (amount0 * BigInt(100 - slippageTolerance)) / BigInt(100);
    const minAmount1 = (amount1 * BigInt(100 - slippageTolerance)) / BigInt(100);

    return await dex.removeLiquidity(
      tokenA,
      tokenB,
      liquidity,
      isTokenA ? minAmount0 : minAmount1,
      isTokenA ? minAmount1 : minAmount0
    );
  }

  async getSwapFee(): Promise<number> {
    const dex = this.getDEXContract();
    const fee = await dex.swapFee();
    return Number(fee) / 10000;
  }

  async listenToSwaps(
    callback: (event: {
      poolId: string;
      trader: string;
      tokenIn: string;
      tokenOut: string;
      amountIn: bigint;
      amountOut: bigint;
    }) => void
  ): Promise<void> {
    const dex = this.getDEXContract();

    dex.on("Swap", (poolId, trader, tokenIn, tokenOut, amountIn, amountOut) => {
      callback({
        poolId,
        trader,
        tokenIn,
        tokenOut,
        amountIn,
        amountOut
      });
    });
  }

  formatAmount(amount: bigint, decimals: number): string {
    return ethers.formatUnits(amount, decimals);
  }

  parseAmount(amount: string, decimals: number): bigint {
    return ethers.parseUnits(amount, decimals);
  }
}
