import { useState, useEffect } from 'react';
import { ArrowDown } from 'lucide-react';
import { TokenSelector } from './TokenSelector';

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance?: string;
  formattedBalance?: string;
}

interface NewSwapWidgetProps {
  tokens: TokenInfo[];
  onSwap: (tokenIn: string, tokenOut: string, amountIn: string) => void;
}

export function NewSwapWidget({ tokens, onSwap }: NewSwapWidgetProps) {
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [tokenIn, setTokenIn] = useState<TokenInfo | null>(null);
  const [tokenOut, setTokenOut] = useState<TokenInfo | null>(null);

  useEffect(() => {
    if (tokens.length > 0 && !tokenIn) {
      setTokenIn(tokens[0]);
    }
    if (tokens.length > 1 && !tokenOut) {
      setTokenOut(tokens[1]);
    }
  }, [tokens]);

  const quickAmounts = [25, 50, 75, 100];

  const handleQuickAmount = (percentage: number) => {
    if (tokenIn && tokenIn.formattedBalance) {
      const balance = parseFloat(tokenIn.formattedBalance);
      const amount = (balance * percentage / 100).toFixed(6);
      setAmountIn(amount);
    }
  };

  const handleSwap = () => {
    if (tokenIn && tokenOut && amountIn) {
      onSwap(tokenIn.address, tokenOut.address, amountIn);
    }
  };

  const switchTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAmountIn(amountOut);
    setAmountOut(amountIn);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-card rounded-3xl p-6 shadow-xl">
        <div className="space-y-2">
          <div className="bg-white rounded-2xl p-4 border-2 border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">From</span>
              {tokenIn && tokenIn.formattedBalance && (
                <span className="text-sm text-gray-600">
                  Balance: {parseFloat(tokenIn.formattedBalance).toFixed(4)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                placeholder="0.0"
                className="text-3xl font-bold bg-transparent border-none outline-none flex-1 text-gray-900 min-w-0"
              />

              <TokenSelector
                tokens={tokens}
                selectedToken={tokenIn}
                onSelect={setTokenIn}
                otherToken={tokenOut}
              />
            </div>

            {tokenIn && tokenIn.formattedBalance && (
              <div className="flex gap-2 mt-3">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleQuickAmount(amount)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition"
                  >
                    {amount}%
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center -my-2 relative z-10">
            <button
              onClick={switchTokens}
              className="w-10 h-10 bg-white hover:bg-blue-50 rounded-xl border-4 border-blue-100 flex items-center justify-center transition shadow-sm"
            >
              <ArrowDown className="w-5 h-5 text-blue-600" />
            </button>
          </div>

          <div className="bg-white rounded-2xl p-4 border-2 border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">To</span>
              {tokenOut && tokenOut.formattedBalance && (
                <span className="text-sm text-gray-600">
                  Balance: {parseFloat(tokenOut.formattedBalance).toFixed(4)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amountOut}
                onChange={(e) => setAmountOut(e.target.value)}
                placeholder="0.0"
                className="text-3xl font-bold bg-transparent border-none outline-none flex-1 text-gray-900 min-w-0"
                disabled
              />

              <TokenSelector
                tokens={tokens}
                selectedToken={tokenOut}
                onSelect={setTokenOut}
                otherToken={tokenIn}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSwap}
          disabled={!amountIn || !tokenIn || !tokenOut}
          className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-2xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          Swap
        </button>

        {!tokenIn && (
          <div className="mt-6 p-4 bg-blue-50 rounded-2xl text-center">
            <p className="text-sm text-gray-700">
              Connect wallet to start trading
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
