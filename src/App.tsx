import { useState, useEffect } from 'react';
import { TrendingUp, Droplets, Wallet, MoreHorizontal, Info } from 'lucide-react';
import { DEXService, TokenInfo } from './lib/dex';
import { walletService, WalletType } from './lib/walletService';
import { TokenService } from './lib/tokenService';
import { NewSwapWidget } from './components/NewSwapWidget';
import { LiquidityWidget } from './components/LiquidityWidget';
import { ethers } from 'ethers';

const DEX_ADDRESS = import.meta.env.VITE_DEX_ADDRESS || '0x0000000000000000000000000000000000000000';

type Page = 'swap' | 'pools' | 'positions' | 'more' | 'about';

interface TokenBalance extends TokenInfo {
  balance: string;
  formattedBalance: string;
}

function App() {
  const [dexService, setDexService] = useState<DEXService | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [activePage, setActivePage] = useState<Page>('swap');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const service = new DEXService(DEX_ADDRESS);
    setDexService(service);
  }, []);

  const loadTokenBalances = async (address: string, provider: any) => {
    try {
      const tokenService = new TokenService(provider);
      const userTokens = await tokenService.getTokensWithBalances(address);

      const formattedTokens: TokenBalance[] = userTokens.map(token => ({
        ...token,
        formattedBalance: ethers.formatUnits(token.balance || '0', token.decimals)
      }));

      setTokens(formattedTokens);
    } catch (error) {
      console.error('Error loading token balances:', error);
    }
  };

  const connectWallet = async () => {
    if (!dexService) return;

    setIsLoading(true);

    try {
      const walletInfo = await walletService.connectWallet({
        preferredMethod: 'injected'
      });

      await walletService.switchToArcNetwork();

      setAccount(walletInfo.address);
      setWalletType(walletInfo.type);

      const provider = walletService.getProvider();
      if (provider) {
        dexService.setProvider(provider);
        await loadTokenBalances(walletInfo.address, provider);
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      alert(`Failed to connect wallet: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async () => {
    await walletService.disconnect();
    setAccount(null);
    setWalletType(null);
    setTokens([]);
  };

  const handleSwap = async (tokenIn: string, tokenOut: string, amountIn: string) => {
    console.log('Swap:', { tokenIn, tokenOut, amountIn });
  };

  if (activePage === 'about') {
    return (
      <div className="min-h-screen animated-gradient p-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setActivePage('swap')}
            className="glass-card px-4 py-2 rounded-xl text-gray-900 font-medium mb-6"
          >
            ← Back
          </button>
          <div className="glass-card rounded-3xl p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">About Arc DEX</h1>
            <p className="text-gray-700 mb-4">
              Arc DEX is a vault-based decentralized exchange built on Arc Network.
            </p>
            <p className="text-gray-600">
              Features: Lightning-fast swaps, liquidity pools, and stablecoin gas fees.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-gradient">
      <div className="max-w-lg mx-auto px-4 pb-24">
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Arc DEX</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {account && (
              <div className="glass-card px-3 py-1.5 rounded-xl flex items-center gap-2">
                <img
                  src="/photo_2025-11-13_15-44-41.jpg"
                  alt="Arc Network"
                  className="w-5 h-5 rounded-full"
                />
                <span className="text-sm font-medium text-gray-900">Arc</span>
              </div>
            )}

            <button
              onClick={() => setActivePage('about')}
              className="w-10 h-10 glass-card rounded-xl flex items-center justify-center"
            >
              <Info className="w-5 h-5 text-gray-700" />
            </button>

            {account ? (
              <button
                onClick={disconnectWallet}
                className="glass-card px-4 py-2 rounded-xl flex items-center gap-2 font-medium text-gray-900"
              >
                <Wallet className="w-4 h-4" />
                <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
              </button>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isLoading}
                className="glass-card px-4 py-2 rounded-xl flex items-center gap-2 font-medium text-gray-900 hover:bg-white transition"
              >
                <Wallet className="w-4 h-4" />
                <span>{isLoading ? 'Connecting...' : 'Connect'}</span>
              </button>
            )}
          </div>
        </header>

        <main className="pt-4">
          {activePage === 'swap' && (
            <>
              {account && tokens.length > 0 && (
                <div className="glass-card rounded-2xl p-4 mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Your Tokens</h3>
                  <div className="space-y-2">
                    {tokens.map((token) => (
                      <div key={token.address} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full" />
                          <span className="font-medium text-gray-900">{token.symbol}</span>
                        </div>
                        <span className="font-bold text-gray-900">{token.formattedBalance}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <NewSwapWidget
                tokens={tokens}
                onSwap={handleSwap}
              />
            </>
          )}

          {activePage === 'pools' && (
            <>
              {account && dexService ? (
                <LiquidityWidget dexService={dexService} tokens={tokens} />
              ) : (
                <div className="glass-card rounded-3xl p-8 text-center">
                  <Wallet className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Wallet</h3>
                  <p className="text-gray-600 mb-6">Connect your wallet to add liquidity</p>
                  <button
                    onClick={connectWallet}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl"
                  >
                    Connect Wallet
                  </button>
                </div>
              )}
            </>
          )}

          {activePage === 'positions' && (
            <div className="glass-card rounded-3xl p-8 text-center">
              <Droplets className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Positions</h3>
              <p className="text-gray-600">Add liquidity to a pool to get started</p>
            </div>
          )}

          {activePage === 'more' && (
            <div className="glass-card rounded-3xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">More Options</h2>
              <div className="space-y-2">
                <button
                  onClick={() => setActivePage('about')}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-xl transition font-medium text-gray-700"
                >
                  About Arc DEX
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 glass-card border-t border-gray-200">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-around py-3">
            <button
              onClick={() => setActivePage('swap')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition ${
                activePage === 'swap' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <TrendingUp className="w-6 h-6" />
              <span className="text-xs font-medium">Swap</span>
            </button>

            <button
              onClick={() => setActivePage('pools')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition ${
                activePage === 'pools' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <Droplets className="w-6 h-6" />
              <span className="text-xs font-medium">Pools</span>
            </button>

            <button
              onClick={() => setActivePage('positions')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition ${
                activePage === 'positions' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xs font-medium">Positions</span>
            </button>

            <button
              onClick={() => setActivePage('more')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition ${
                activePage === 'more' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <MoreHorizontal className="w-6 h-6" />
              <span className="text-xs font-medium">More</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}

export default App;
