# Arc DEX User Guide

## Overview

Arc DEX is a decentralized exchange built on the Arc Network, featuring lightning-fast transactions with sub-second finality and stablecoin (USDC) gas fees.

## Getting Started

### 1. Wallet Connection

Arc DEX supports multiple wallet connection methods:

- **Browser Wallet** (MetaMask, Coinbase Wallet, Brave Wallet, etc.)
- **WalletConnect** (Mobile wallets, Trust Wallet, Rainbow, and 100+ others)

#### How to Connect:

1. Click the "Connect Wallet" button in the top right corner
2. Select your preferred connection method:
   - **Browser Wallet**: Uses your installed browser extension wallet
   - **WalletConnect**: Scan QR code with your mobile wallet app
3. Approve the connection request in your wallet

### 2. Network Setup

Arc DEX automatically detects your current network and will prompt you to switch to Arc Network if needed.

**Arc Testnet Network Details:**
- Chain ID: 4703 (0x125F)
- RPC URL: https://rpc-testnet.arc.network
- Currency Symbol: USDC
- Block Explorer: https://explorer-testnet.arc.network

**Important**: If you're not on the correct network, you'll see a warning message with a button to automatically switch networks.

## Using the DEX

### Swapping Tokens

1. Connect your wallet and ensure you're on Arc Network
2. Click the "Swap" tab
3. Select the token you want to swap from in the "From" field
4. Enter the amount you want to swap
5. Select the token you want to receive in the "To" field
6. Review the swap details:
   - **Price Impact**: Shows how your trade affects the token price
   - **Slippage Tolerance**: Maximum price change you're willing to accept
   - **Minimum Received**: Minimum amount you'll receive after slippage
7. Click "Swap" to execute the transaction
8. Confirm the transaction in your wallet

#### Adjusting Slippage

Click the settings icon (⚙️) to adjust slippage tolerance:
- **0.5%**: Recommended for stablecoin pairs
- **1%**: Standard setting for most trades (default)
- **2%**: For tokens with higher volatility
- **Custom**: Enter your own percentage

**Warning**: Higher slippage may result in worse exchange rates but reduces failed transactions.

### Adding Liquidity

1. Click the "Liquidity" tab
2. Ensure "Add" mode is selected
3. Select the first token and enter the amount
4. Select the second token (amount auto-calculates based on current pool ratio)
5. Review your pool share percentage
6. Click "Add Liquidity"
7. Approve both token spending (if first time) and confirm the transaction

**You will receive LP (Liquidity Provider) tokens** representing your share of the pool. These tokens earn fees from all trades in the pool.

### Removing Liquidity

1. Click the "Liquidity" tab
2. Select "Remove" mode
3. Enter the amount of LP tokens you want to burn
4. Review the expected amounts of both tokens you'll receive
5. Click "Remove Liquidity"
6. Confirm the transaction

### Pool Information

When viewing the liquidity page, you'll see:
- **Pool Reserves**: Total amount of each token in the pool
- **Your LP Tokens**: Your liquidity provider token balance
- **Your Share**: Your percentage of the total pool
- **Fees Earned**: 0.3% of all trades, proportional to your share

## Transaction Status

Arc DEX provides real-time transaction tracking:

- **Pending**: Transaction is being processed (usually < 1 second on Arc)
- **Success**: Transaction completed successfully
  - Click "View on Explorer" to see transaction details
- **Error**: Transaction failed
  - Check your wallet for more details

## Gas Fees

**Arc Network uses USDC for gas fees**, providing predictable costs in dollars:
- Average swap: ~$0.01 - $0.05
- Add liquidity: ~$0.02 - $0.10
- Remove liquidity: ~$0.02 - $0.10

**Note**: Exact fees depend on network activity and transaction complexity.

## Security Best Practices

1. **Always verify the contract addresses** before approving transactions
2. **Never share your private keys or seed phrase**
3. **Start with small amounts** when testing new features
4. **Double-check recipient addresses** before confirming
5. **Use hardware wallets** for large amounts
6. **Be cautious of phishing attempts** - always check the URL

## Troubleshooting

### "Please switch to Arc Network"
- Click the "Switch to Arc" button in the error message
- Or manually add the network using the details above

### "Insufficient balance"
- Ensure you have enough USDC for gas fees
- Check that you have enough tokens for the swap/liquidity operation

### "Transaction failed"
- Check if you approved token spending
- Verify you have sufficient USDC for gas
- Try increasing slippage tolerance for swaps
- Ensure you're still connected to the correct network

### "Price impact too high"
- Your trade size is large relative to the pool
- Consider splitting into smaller trades
- Or accept higher slippage (use with caution)

## Support

For technical issues or questions:
- Check the [Architecture Documentation](./ARCHITECTURE.md)
- Review [Security Guidelines](./SECURITY.md)
- See [Troubleshooting Guide](./TROUBLESHOOTING.md)

## Legal Disclaimer

Arc DEX is a decentralized application. By using this service, you acknowledge that:
- You are responsible for your own funds
- Cryptocurrency trading involves risk
- Past performance doesn't indicate future results
- Smart contracts have been audited but use at your own risk
- The developers are not responsible for any losses

**Trade responsibly and never invest more than you can afford to lose.**
