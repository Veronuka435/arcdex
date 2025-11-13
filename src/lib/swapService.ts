import { ethers } from 'ethers';

const ROUTER_ABI = [
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)',
  'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)',
  'function getAmountsIn(uint256 amountOut, address[] path) view returns (uint256[] amounts)',
];

const VAULT_ABI = [
  'function deposit(address token, uint256 amount, address to) external',
  'function withdraw(address token, uint256 amount, address to) external',
  'function balanceOf(address token, address owner) view returns (uint256)',
  'function transferInternal(address token, address from, address to, uint256 amount) external',
];

export interface SwapQuote {
  amountIn: string;
  amountOut: string;
  priceImpact: number;
  route: string[];
  minimumReceived: string;
}

export class SwapService {
  private provider: ethers.Provider;
  private routerAddress: string;
  private vaultAddress: string;

  constructor(provider: ethers.Provider, routerAddress: string, vaultAddress: string) {
    this.provider = provider;
    this.routerAddress = routerAddress;
    this.vaultAddress = vaultAddress;
  }

  async getQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    decimalsIn: number
  ): Promise<SwapQuote | null> {
    try {
      const router = new ethers.Contract(this.routerAddress, ROUTER_ABI, this.provider);
      const path = [tokenIn, tokenOut];

      const amounts = await router.getAmountsOut(
        ethers.parseUnits(amountIn, decimalsIn),
        path
      );

      const amountOut = amounts[1];
      const priceImpact = this.calculatePriceImpact(amounts[0], amounts[1]);

      const slippageTolerance = 0.005;
      const minimumReceived = (amountOut * BigInt(Math.floor((1 - slippageTolerance) * 10000))) / 10000n;

      return {
        amountIn: amounts[0].toString(),
        amountOut: amounts[1].toString(),
        priceImpact,
        route: path,
        minimumReceived: minimumReceived.toString(),
      };
    } catch (error) {
      console.error('Error getting quote:', error);
      return null;
    }
  }

  private calculatePriceImpact(amountIn: bigint, amountOut: bigint): number {
    if (amountIn === 0n || amountOut === 0n) return 0;

    const expectedPrice = Number(amountIn) / Number(amountOut);
    const actualPrice = 1;
    const impact = Math.abs((actualPrice - expectedPrice) / expectedPrice) * 100;

    return Math.min(impact, 100);
  }

  async executeSwap(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    amountOutMin: string,
    decimalsIn: number,
    signer: ethers.Signer,
    userAddress: string
  ): Promise<ethers.ContractTransactionResponse> {
    const router = new ethers.Contract(this.routerAddress, ROUTER_ABI, signer);
    const path = [tokenIn, tokenOut];

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    return await router.swapExactTokensForTokens(
      ethers.parseUnits(amountIn, decimalsIn),
      ethers.parseUnits(amountOutMin, decimalsIn),
      path,
      userAddress,
      deadline
    );
  }

  async depositToVault(
    token: string,
    amount: string,
    decimals: number,
    signer: ethers.Signer,
    to: string
  ): Promise<ethers.ContractTransactionResponse> {
    const vault = new ethers.Contract(this.vaultAddress, VAULT_ABI, signer);
    return await vault.deposit(
      token,
      ethers.parseUnits(amount, decimals),
      to
    );
  }

  async withdrawFromVault(
    token: string,
    amount: string,
    decimals: number,
    signer: ethers.Signer,
    to: string
  ): Promise<ethers.ContractTransactionResponse> {
    const vault = new ethers.Contract(this.vaultAddress, VAULT_ABI, signer);
    return await vault.withdraw(
      token,
      ethers.parseUnits(amount, decimals),
      to
    );
  }

  async getVaultBalance(token: string, user: string): Promise<string> {
    try {
      const vault = new ethers.Contract(this.vaultAddress, VAULT_ABI, this.provider);
      const balance = await vault.balanceOf(token, user);
      return balance.toString();
    } catch (error) {
      console.error('Error getting vault balance:', error);
      return '0';
    }
  }
}
