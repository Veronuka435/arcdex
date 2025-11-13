import { ethers } from 'ethers';

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
  vaultBalance?: string;
}

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

export class TokenService {
  private provider: ethers.Provider;
  private knownTokens: Map<string, Token> = new Map();

  constructor(provider: ethers.Provider) {
    this.provider = provider;
    this.loadKnownTokens();
  }

  private loadKnownTokens() {
    const tokens = [
      {
        address: import.meta.env.VITE_USDC_ADDRESS,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      },
      {
        address: import.meta.env.VITE_WETH_ADDRESS,
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
      },
      {
        address: import.meta.env.VITE_DAI_ADDRESS,
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
      },
    ].filter(t => t.address);

    tokens.forEach(token => {
      this.knownTokens.set(token.address.toLowerCase(), token as Token);
    });
  }

  async discoverToken(address: string): Promise<Token | null> {
    try {
      const checksumAddress = ethers.getAddress(address);

      if (this.knownTokens.has(checksumAddress.toLowerCase())) {
        return this.knownTokens.get(checksumAddress.toLowerCase())!;
      }

      const contract = new ethers.Contract(checksumAddress, ERC20_ABI, this.provider);

      const [symbol, name, decimals] = await Promise.all([
        contract.symbol(),
        contract.name(),
        contract.decimals(),
      ]);

      const token: Token = {
        address: checksumAddress,
        symbol,
        name,
        decimals,
      };

      this.knownTokens.set(checksumAddress.toLowerCase(), token);
      return token;
    } catch (error) {
      console.error('Error discovering token:', error);
      return null;
    }
  }

  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const balance = await contract.balanceOf(userAddress);
      return balance.toString();
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0';
    }
  }

  async getTokensWithBalances(userAddress: string): Promise<Token[]> {
    const tokens: Token[] = [];

    for (const token of this.knownTokens.values()) {
      try {
        const balance = await this.getTokenBalance(token.address, userAddress);
        const formattedBalance = ethers.formatUnits(balance, token.decimals);

        tokens.push({
          ...token,
          balance,
          vaultBalance: '0',
        });
      } catch (error) {
        console.error(`Error loading ${token.symbol}:`, error);
      }
    }

    return tokens;
  }

  async checkAllowance(
    tokenAddress: string,
    owner: string,
    spender: string
  ): Promise<bigint> {
    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const allowance = await contract.allowance(owner, spender);
      return allowance;
    } catch (error) {
      console.error('Error checking allowance:', error);
      return 0n;
    }
  }

  async approveToken(
    tokenAddress: string,
    spender: string,
    amount: bigint,
    signer: ethers.Signer
  ): Promise<ethers.ContractTransactionResponse> {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    return await contract.approve(spender, amount);
  }

  getKnownTokens(): Token[] {
    return Array.from(this.knownTokens.values());
  }

  async scanForTokens(userAddress: string): Promise<Token[]> {
    const tokens = await this.getTokensWithBalances(userAddress);
    return tokens.filter(t => BigInt(t.balance || '0') > 0n);
  }
}
