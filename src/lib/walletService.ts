import { ethers } from 'ethers';

export interface WalletConnectionOptions {
  preferredMethod?: 'injected';
}

export type WalletType = 'metamask' | 'coinbase' | 'trust' | 'brave' | 'injected';

export interface WalletInfo {
  address: string;
  type: WalletType;
  chainId: number;
}

const ARC_TESTNET_CHAIN_ID = 4703;
const ARC_TESTNET_CHAIN_ID_HEX = '0x125F';

export class WalletService {
  private provider: ethers.BrowserProvider | null = null;
  private currentWalletType: WalletType | null = null;

  async connectWallet(options?: WalletConnectionOptions): Promise<WalletInfo> {
    return this.connectInjected();
  }

  private detectWalletType(): WalletType {
    if (typeof window === 'undefined' || !window.ethereum) {
      return 'injected';
    }

    const ethereum = window.ethereum as any;

    if (ethereum.isMetaMask && !ethereum.isBraveWallet && !ethereum.isCoinbaseWallet) {
      return 'metamask';
    }
    if (ethereum.isCoinbaseWallet) {
      return 'coinbase';
    }
    if (ethereum.isBraveWallet) {
      return 'brave';
    }
    if (ethereum.isTrust) {
      return 'trust';
    }

    return 'injected';
  }

  private async connectInjected(): Promise<WalletInfo> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No Web3 wallet found. Please install MetaMask, Coinbase Wallet, Trust Wallet, or another Web3-compatible wallet.');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    await this.provider.send("eth_requestAccounts", []);

    const signer = await this.provider.getSigner();
    const address = await signer.getAddress();
    const network = await this.provider.getNetwork();

    this.currentWalletType = this.detectWalletType();

    return {
      address,
      type: this.currentWalletType,
      chainId: Number(network.chainId)
    };
  }

  async switchToArcNetwork(): Promise<void> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }

    const currentNetwork = await this.provider.getNetwork();

    if (Number(currentNetwork.chainId) === ARC_TESTNET_CHAIN_ID) {
      return;
    }

    if (!window.ethereum) {
      throw new Error('No injected wallet found');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_TESTNET_CHAIN_ID_HEX }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: ARC_TESTNET_CHAIN_ID_HEX,
              chainName: 'Arc Testnet',
              nativeCurrency: {
                name: 'USDC',
                symbol: 'USDC',
                decimals: 18
              },
              rpcUrls: ['https://rpc-testnet.arc.network'],
              blockExplorerUrls: ['https://explorer-testnet.arc.network']
            }
          ],
        });
      } else {
        throw error;
      }
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
  }

  async disconnect(): Promise<void> {
    this.provider = null;
    this.currentWalletType = null;
  }

  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  getCurrentWalletType(): WalletType | null {
    return this.currentWalletType;
  }

  isConnected(): boolean {
    return this.provider !== null;
  }

  async checkNetwork(): Promise<boolean> {
    if (!this.provider) return false;

    try {
      const network = await this.provider.getNetwork();
      return Number(network.chainId) === ARC_TESTNET_CHAIN_ID;
    } catch {
      return false;
    }
  }
}

export const walletService = new WalletService();
