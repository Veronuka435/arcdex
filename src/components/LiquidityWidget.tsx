import { useState, useEffect } from 'react';
import { Plus, Minus, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { DEXService, TokenInfo, Pool } from '../lib/dex';

interface LiquidityWidgetProps {
  dexService: DEXService;
  tokens: TokenInfo[];
}

export function LiquidityWidget({ dexService, tokens }: LiquidityWidgetProps) {
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [tokenA, setTokenA] = useState<TokenInfo | null>(null);
  const [tokenB, setTokenB] = useState<TokenInfo | null>(null);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [pool, setPool] = useState<Pool | null>(null);
  const [lpBalance, setLpBalance] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<'pending' | 'success' | 'error' | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (tokens.length >= 2) {
      setTokenA(tokens[0]);
      setTokenB(tokens[1]);
    }
  }, [tokens]);

  useEffect(() => {
    const loadPool = async () => {
      if (!tokenA || !tokenB) return;

      try {
        const poolData = await dexService.getPool(tokenA.address, tokenB.address);
        setPool(poolData);

        if (poolData) {
          const lpTokenInfo = await dexService.getTokenInfo(poolData.lpToken);
          setLpBalance(lpTokenInfo.balance);
        }
      } catch (error) {
        console.error('Pool loading error:', error);
      }
    };

    loadPool();
  }, [tokenA, tokenB]);

  useEffect(() => {
    if (mode === 'add' && pool && pool.totalLiquidity > 0) {
      if (amountA && parseFloat(amountA) > 0) {
        const amountAParsed = dexService.parseAmount(amountA, tokenA!.decimals);
        const isTokenAFirst = tokenA!.address.toLowerCase() < tokenB!.address.toLowerCase();
        const reserve = isTokenAFirst ? pool.reserveA : pool.reserveB;
        const otherReserve = isTokenAFirst ? pool.reserveB : pool.reserveA;

        const calculatedAmountB = (amountAParsed * otherReserve) / reserve;
        setAmountB(dexService.formatAmount(calculatedAmountB, tokenB!.decimals));
      }
    }
  }, [amountA, pool, mode]);

  const handleAddLiquidity = async () => {
    if (!tokenA || !tokenB || !amountA || !amountB) return;

    setIsLoading(true);
    setTxStatus('pending');
    setTxHash(null);

    try {
      const amountAParsed = dexService.parseAmount(amountA, tokenA.decimals);
      const amountBParsed = dexService.parseAmount(amountB, tokenB.decimals);

      const tx = await dexService.addLiquidity(
        tokenA.address,
        tokenB.address,
        amountAParsed,
        amountBParsed,
        1
      );

      setTxHash(tx.hash);
      await tx.wait();

      setTxStatus('success');
      setAmountA('');
      setAmountB('');

      setTimeout(() => {
        setTxStatus(null);
        setTxHash(null);
      }, 5000);
    } catch (error: any) {
      console.error('Add liquidity error:', error);
      setTxStatus('error');

      setTimeout(() => {
        setTxStatus(null);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!tokenA || !tokenB || !amountA || !pool) return;

    setIsLoading(true);
    setTxStatus('pending');
    setTxHash(null);

    try {
      const liquidityParsed = dexService.parseAmount(amountA, 18);

      const tx = await dexService.removeLiquidity(
        tokenA.address,
        tokenB.address,
        liquidityParsed,
        1
      );

      setTxHash(tx.hash);
      await tx.wait();

      setTxStatus('success');
      setAmountA('');
      setAmountB('');

      setTimeout(() => {
        setTxStatus(null);
        setTxHash(null);
      }, 5000);
    } catch (error: any) {
      console.error('Remove liquidity error:', error);
      setTxStatus('error');

      setTimeout(() => {
        setTxStatus(null);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateShare = (): string => {
    if (!pool || !amountA || !tokenA) return '0';

    const amountAParsed = dexService.parseAmount(amountA, tokenA.decimals);
    const isTokenAFirst = tokenA.address.toLowerCase() < tokenB!.address.toLowerCase();
    const reserve = isTokenAFirst ? pool.reserveA : pool.reserveB;

    if (pool.totalLiquidity === BigInt(0)) {
      return '100';
    }

    const expectedLiquidity = (amountAParsed * pool.totalLiquidity) / reserve;
    const newTotal = pool.totalLiquidity + expectedLiquidity;
    const share = (expectedLiquidity * BigInt(10000)) / newTotal;

    return (Number(share) / 100).toFixed(2);
  };

  const calculateExpectedTokens = (): { amountA: string; amountB: string } => {
    if (!pool || !amountA || !tokenA || !tokenB) return { amountA: '0', amountB: '0' };

    const liquidityParsed = dexService.parseAmount(amountA, 18);
    const sharePercent = (liquidityParsed * BigInt(10000)) / pool.totalLiquidity;

    const expectedA = (pool.reserveA * sharePercent) / BigInt(10000);
    const expectedB = (pool.reserveB * sharePercent) / BigInt(10000);

    return {
      amountA: dexService.formatAmount(expectedA, tokenA.decimals),
      amountB: dexService.formatAmount(expectedB, tokenB.decimals),
    };
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto border-2 border-accent/10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary">Liquidity</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('add')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              mode === 'add'
                ? 'bg-blue-500/80 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Add
          </button>
          <button
            onClick={() => setMode('remove')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              mode === 'remove'
                ? 'bg-blue-500/80 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Minus className="w-4 h-4 inline mr-1" />
            Remove
          </button>
        </div>
      </div>

      {txStatus && (
        <div className={`mb-4 p-4 rounded-lg border-2 ${
          txStatus === 'success' ? 'bg-green-50 border-green-500' :
          txStatus === 'error' ? 'bg-red-50 border-red-500' :
          'bg-blue-50 border-blue-500'
        }`}>
          <div className="flex items-center gap-2">
            {txStatus === 'success' ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800">Transaction Successful!</p>
                  {txHash && (
                    <a
                      href={`https://explorer-testnet.arc.network/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:underline"
                    >
                      View on Explorer
                    </a>
                  )}
                </div>
              </>
            ) : txStatus === 'error' ? (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm font-semibold text-red-800">Transaction Failed</p>
              </>
            ) : (
              <>
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-blue-800">Processing transaction...</p>
              </>
            )}
          </div>
        </div>
      )}

      {pool && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-accent/10">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Pool {tokenA?.symbol}</div>
              <div className="font-semibold text-primary">
                {pool.reserveA && tokenA
                  ? dexService.formatAmount(pool.reserveA, tokenA.decimals)
                  : '0'}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Pool {tokenB?.symbol}</div>
              <div className="font-semibold text-primary">
                {pool.reserveB && tokenB
                  ? dexService.formatAmount(pool.reserveB, tokenB.decimals)
                  : '0'}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Your LP Tokens</div>
              <div className="font-semibold text-primary">
                {dexService.formatAmount(lpBalance, 18)}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Your Share</div>
              <div className="font-semibold text-primary">
                {pool.totalLiquidity > 0
                  ? ((Number(lpBalance) / Number(pool.totalLiquidity)) * 100).toFixed(2)
                  : '0'}
                %
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'add' ? (
        <>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-accent/10">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                {tokenA?.symbol} Amount
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-2xl font-semibold outline-none text-primary"
                />
                <select
                  value={tokenA?.address || ''}
                  onChange={(e) => {
                    const token = tokens.find((t) => t.address === e.target.value);
                    if (token) setTokenA(token);
                  }}
                  className="px-4 py-2 bg-blue-500/80 text-white rounded-lg font-medium outline-none hover:bg-blue-600/80 transition"
                >
                  {tokens.map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
              </div>
              {tokenA && (
                <div className="text-sm text-gray-500 mt-2">
                  Balance: {dexService.formatAmount(tokenA.balance, tokenA.decimals)}
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-accent/10">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                {tokenB?.symbol} Amount
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  placeholder="0.0"
                  disabled={pool && pool.totalLiquidity > 0}
                  className="flex-1 bg-transparent text-2xl font-semibold outline-none text-primary disabled:opacity-50"
                />
                <select
                  value={tokenB?.address || ''}
                  onChange={(e) => {
                    const token = tokens.find((t) => t.address === e.target.value);
                    if (token) setTokenB(token);
                  }}
                  className="px-4 py-2 bg-blue-500/80 text-white rounded-lg font-medium outline-none hover:bg-blue-600/80 transition"
                >
                  {tokens.map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
              </div>
              {tokenB && (
                <div className="text-sm text-gray-500 mt-2">
                  Balance: {dexService.formatAmount(tokenB.balance, tokenB.decimals)}
                </div>
              )}
            </div>
          </div>

          {amountA && amountB && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-accent/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Pool Share</span>
                <span className="font-medium text-primary">{calculateShare()}%</span>
              </div>
              <div className="mt-2 flex items-start gap-2 text-xs text-gray-600">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>You will receive LP tokens representing your share of the pool</p>
              </div>
            </div>
          )}

          <button
            onClick={handleAddLiquidity}
            disabled={!tokenA || !tokenB || !amountA || !amountB || isLoading}
            className="w-full mt-6 py-4 bg-blue-500/80 text-white font-bold rounded-xl hover:bg-blue-600/80 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
          </button>
        </>
      ) : (
        <>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-accent/10">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                LP Token Amount
              </label>
              <input
                type="number"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent text-2xl font-semibold outline-none text-primary"
              />
              <div className="text-sm text-gray-500 mt-2">
                Available: {dexService.formatAmount(lpBalance, 18)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg border border-accent/10">
                <div className="text-xs text-gray-600 mb-1">{tokenA?.symbol}</div>
                <div className="font-semibold text-sm text-primary">
                  {calculateExpectedTokens().amountA}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-accent/10">
                <div className="text-xs text-gray-600 mb-1">{tokenB?.symbol}</div>
                <div className="font-semibold text-sm text-primary">
                  {calculateExpectedTokens().amountB}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleRemoveLiquidity}
            disabled={!tokenA || !tokenB || !amountA || isLoading || lpBalance === BigInt(0)}
            className="w-full mt-6 py-4 bg-blue-500/80 text-white font-bold rounded-xl hover:bg-blue-600/80 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Removing Liquidity...' : 'Remove Liquidity'}
          </button>
        </>
      )}

      <div className="mt-4 text-center text-xs text-gray-500">
        Fees earned: 0.3% of all trades proportional to your share
      </div>
    </div>
  );
}
