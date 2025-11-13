# Arc DEX - Decentralized Exchange on Arc Network

A full-featured decentralized exchange (DEX) built on the Arc Network with automatic wallet connection, real token balances, and modern UI.

## Default Token Addresses (Arc Network)

The following tokens are pre-configured and available immediately after wallet connection:

- **USDC**: `0x3600000000000000000000000000000000000000`
- **WETH**: `0x3700000000000000000000000000000000000000`
- **DAI**: `0x3800000000000000000000000000000000000000`

These tokens are automatically loaded with your real balances when you connect your wallet.

## Key Features

### Multi-Wallet Support
- **Browser Wallets**: MetaMask, Coinbase Wallet, Brave Wallet, Trust Wallet Extension
- **WalletConnect**: Support for 100+ mobile wallets including Trust Wallet, Rainbow, Argent
- **No MetaMask Dependency**: Works with any Web3-compatible wallet

### Modern User Interface
- **Black/White/Accent Color Scheme** (#000000, #FFFFFF, #4C5866)
- **Responsive Design**: Works perfectly on desktop and mobile
- **Real-time Transaction Tracking**: Visual feedback for pending, successful, and failed transactions
- **Advanced Slippage Controls**: Preset options (0.5%, 1%, 2%) and custom input
- **Pool Information Display**: Real-time reserves, LP balances, and share percentages

### Arc Network Features
- **Stablecoin Gas (USDC)**: Predictable costs in dollars
- **Sub-second Finality**: Instant transaction confirmation
- **EVM Compatible**: Works with all Ethereum tools
- **Institutional Ready**: Built for high volumes

### Smart Contract Security
- ✅ ReentrancyGuard protection
- ✅ Pausable emergency stop
- ✅ Ownable access control
- ✅ SafeERC20 operations
- ✅ Token Whitelist protection
- ✅ Slippage protection

## Project Structure

```
arc-dex/
├── contracts/                  # Solidity smart contracts
│   ├── DEXCore.sol            # Main DEX contract
│   ├── LPToken.sol            # LP tokens for providers
│   ├── TokenWhitelist.sol     # Token whitelist
│   └── MockERC20.sol          # Mock tokens for testing
│
├── test/                       # Test infrastructure
│   ├── DEXCore.test.js        # DEX unit tests
│   └── TokenWhitelist.test.js
│
├── scripts/                    # Deployment scripts
│   ├── deploy.js              # Main deployment script
│   ├── verify.js              # Verification on Arc Explorer
│   └── createPool.js          # Create new pools
│
├── docs/                       # Documentation
│   ├── USER_GUIDE.md          # Complete user guide
│   ├── DEPLOYMENT_GUIDE.md    # Deployment instructions
│   ├── WALLET_INTEGRATION.md  # Wallet integration guide
│   ├── ARCHITECTURE.md        # Technical architecture
│   ├── SECURITY.md            # Security analysis
│   ├── INTEGRATION_EXAMPLES.md
│   └── TROUBLESHOOTING.md
│
├── src/                        # Frontend application (React)
│   ├── lib/
│   │   ├── dex.ts             # DEX SDK/service
│   │   └── walletService.ts   # Multi-wallet service
│   ├── components/
│   │   ├── SwapWidget.tsx     # Swap interface
│   │   ├── LiquidityWidget.tsx # Liquidity interface
│   │   └── WalletConnect.tsx  # Wallet connection
│   └── App.tsx
│
├── hardhat.config.js
├── package.json
└── .env
```

## Quick Start

### 1. Installation

```bash
git clone <repository-url>
cd arc-dex
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
# Arc Network
ARC_TESTNET_RPC=https://rpc-testnet.arc.network
ARC_MAINNET_RPC=https://rpc.arc.network

# Your private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Arc Explorer API key (for verification)
ARC_API_KEY=your_arc_explorer_api_key_here

# Contract addresses (after deployment)
VITE_DEX_ADDRESS=0x...
VITE_USDC_ADDRESS=0x...
VITE_WETH_ADDRESS=0x...
VITE_DAI_ADDRESS=0x...
```

### 3. Get Test Tokens

For testing on Arc Testnet:
1. Visit https://faucet-testnet.arc.network
2. Enter your wallet address
3. Receive test USDC for gas fees

### 4. Compile Contracts

```bash
npm run compile
```

### 5. Run Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage
```

### 6. Deploy

```bash
# Deploy to Arc Testnet
npm run deploy:arc-testnet

# Deploy to Arc Mainnet (production)
npm run deploy:arc-mainnet
```

### 7. Verify Contracts

```bash
npm run verify:arc-testnet
```

## Usage

### For Users

1. **Connect Wallet**
   - Click "Connect Wallet" button
   - Choose your preferred method (Browser Wallet or WalletConnect)
   - Approve connection in your wallet

2. **Switch to Arc Network**
   - If not on Arc Network, click "Switch to Arc"
   - Or manually add the network (automatic prompt)

3. **Swap Tokens**
   - Click "Swap" tab
   - Select tokens and enter amount
   - Adjust slippage if needed (settings icon)
   - Click "Swap" and confirm

4. **Add Liquidity**
   - Click "Liquidity" tab
   - Select "Add" mode
   - Enter token amounts
   - Approve tokens and confirm

5. **Remove Liquidity**
   - Click "Liquidity" tab
   - Select "Remove" mode
   - Enter LP token amount
   - Confirm transaction

### For Developers

#### Creating a Pool

```javascript
const dex = await ethers.getContractAt("DEXCore", dexAddress);
await dex.createPool(tokenA, tokenB);
```

#### Adding Liquidity

```javascript
await tokenA.approve(dexAddress, amountA);
await tokenB.approve(dexAddress, amountB);

await dex.addLiquidity(
  tokenA,
  tokenB,
  amountA,
  amountB,
  minLiquidity
);
```

#### Swapping Tokens

```javascript
await tokenIn.approve(dexAddress, amountIn);

const amountOut = await dex.getAmountOut(tokenIn, tokenOut, amountIn);
const minAmountOut = amountOut * 99n / 100n; // 1% slippage

await dex.swap(tokenIn, tokenOut, amountIn, minAmountOut);
```

## Documentation

### User Documentation
- **[docs/USER_GUIDE.md](./docs/USER_GUIDE.md)** - Complete user guide with screenshots and troubleshooting
- **[docs/WALLET_INTEGRATION.md](./docs/WALLET_INTEGRATION.md)** - Multi-wallet integration guide

### Developer Documentation
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Technical architecture and AMM mathematics
- **[docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[docs/INTEGRATION_EXAMPLES.md](./docs/INTEGRATION_EXAMPLES.md)** - Code examples
- **[docs/SECURITY.md](./docs/SECURITY.md)** - Security analysis and audit recommendations

## Wallet Integration

Arc DEX supports multiple wallet connection methods:

### Browser Wallets (Injected)
- MetaMask
- Coinbase Wallet
- Brave Wallet
- Trust Wallet Extension
- Any wallet that injects `window.ethereum`

### WalletConnect
- Mobile wallets (Trust Wallet, Rainbow, Argent, etc.)
- Hardware wallets (Ledger, Trezor via WalletConnect)
- 100+ compatible wallets

**See [docs/WALLET_INTEGRATION.md](./docs/WALLET_INTEGRATION.md) for detailed integration guide**

## Network Configuration

### Arc Testnet
- Chain ID: 4703 (0x125F)
- RPC URL: https://rpc-testnet.arc.network
- Currency: USDC (18 decimals for MetaMask)
- Explorer: https://explorer-testnet.arc.network

### Arc Mainnet
- Chain ID: 4702
- RPC URL: https://rpc.arc.network
- Currency: USDC
- Explorer: https://explorer.arc.network

## Security Features

### Smart Contract Level
- **ReentrancyGuard**: Protection against reentrancy attacks
- **Pausable**: Emergency stop mechanism
- **Ownable**: Access control for admin functions
- **SafeERC20**: Secure token operations
- **Token Whitelist**: Protection against malicious tokens

### Frontend Level
- **Network Detection**: Automatic detection and switching
- **Transaction Status**: Real-time tracking of transactions
- **Slippage Protection**: User-configurable slippage tolerance
- **Price Impact**: Visual warning for large trades
- **Error Handling**: Comprehensive error messages

### Wallet Security
- No private key storage
- Secure provider management
- Disconnect functionality
- Network mismatch warnings

## Testing

```bash
# Run all tests
npm test

# Test with coverage
npm run test:coverage

# Test specific contract
npx hardhat test test/DEXCore.test.js
```

## UI Color Scheme

Arc DEX uses a professional black, white, and accent color scheme:

- **Primary (Black)**: #000000 - Base background
- **Secondary (White)**: #FFFFFF - Text and cards
- **Accent**: #4C5866 - Buttons, links, highlights
- **Accent Dark**: #3a4350 - Hover states
- **Accent Light**: #5e6a7a - Secondary elements

## Technology Stack

### Blockchain
- Solidity 0.8.20
- Hardhat (development framework)
- OpenZeppelin Contracts 5.0
- Ethers.js 6.9

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Vite (build tool)
- Lucide React (icons)
- WalletConnect v1

### Testing
- Hardhat Network (local blockchain)
- Chai (assertions)
- Mocha (test runner)

## Commands

```bash
# Compile contracts
npm run compile

# Run tests
npm test
npm run test:coverage

# Deploy
npm run deploy:arc-testnet
npm run deploy:arc-mainnet

# Verify
npm run verify:arc-testnet

# Frontend build
npm run build

# Frontend dev (automatically started)
npm run dev

# Linting
npm run lint

# Type checking
npm run typecheck
```

## Roadmap

### Completed ✅
- [x] Smart contracts (DEXCore, LPToken, Whitelist)
- [x] Unit tests
- [x] Deployment scripts for Arc
- [x] Frontend SDK (DEXService)
- [x] Multi-wallet support (Browser + WalletConnect)
- [x] Modern UI with black/white/accent color scheme
- [x] Swap and Liquidity UI components
- [x] Advanced slippage controls
- [x] Transaction status tracking
- [x] Automatic network detection
- [x] Comprehensive documentation

### Before Mainnet
- [ ] Professional security audit
- [ ] Extended testnet testing (2+ weeks)
- [ ] Bug bounty program
- [ ] Multi-sig ownership
- [ ] Timelock for admin functions
- [ ] Integration with Arc oracles (if needed)

### Future Improvements
- [ ] Concentrated liquidity (Uniswap V3 model)
- [ ] Limit orders
- [ ] Advanced routing (multi-hop swaps)
- [ ] Governance token and DAO
- [ ] Analytics dashboard
- [ ] Mobile app

## Gas Fees on Arc Network

Arc Network uses USDC for gas fees, providing predictable costs:
- Average swap: ~$0.01 - $0.05
- Add liquidity: ~$0.02 - $0.10
- Remove liquidity: ~$0.02 - $0.10

Fees depend on network activity and transaction complexity.

## Support

For questions, issues, or improvements:
1. Review documentation in `docs/` folder
2. Check [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
3. Create an issue in the repository
4. Join the Arc Network community

## License

MIT License

## Disclaimer

This project is provided "as is" without any warranties. Always conduct your own research (DYOR) and professional security audit before using in production with real funds.

**Use at your own risk. The developers are not responsible for any losses.**

---

**Built for Arc Network** ⚡
- Stablecoin gas (USDC)
- Sub-second finality
- EVM compatible
- Multi-wallet support
- Institutional ready
