# Wallet Integration Guide

## Overview

Arc DEX supports multiple wallet connection methods, eliminating the dependency on MetaMask alone. This guide explains how wallet integration works and how to extend it.

## Supported Wallet Types

### 1. Browser Wallets (Injected Providers)

**Supported:**
- MetaMask
- Coinbase Wallet
- Brave Wallet
- Trust Wallet Browser Extension
- Rainbow Browser Extension
- Any wallet that injects `window.ethereum`

**How it works:**
```typescript
// Automatically detects injected provider
const provider = new ethers.BrowserProvider(window.ethereum);
await provider.send("eth_requestAccounts", []);
```

### 2. WalletConnect

**Supported:**
- Mobile wallets (Trust Wallet, Rainbow, Argent, etc.)
- Desktop wallets
- Hardware wallets that support WalletConnect
- 100+ compatible wallets

**How it works:**
```typescript
const walletConnectProvider = new WalletConnectProvider({
  rpc: {
    [ARC_CHAIN_ID]: "https://rpc-testnet.arc.network"
  },
  chainId: ARC_CHAIN_ID,
  qrcode: true,
});

await walletConnectProvider.enable();
const provider = new ethers.BrowserProvider(walletConnectProvider);
```

## Architecture

### WalletService Class

The `WalletService` class (`src/lib/walletService.ts`) provides a unified interface for all wallet connections.

```typescript
import { walletService } from './lib/walletService';

// Connect with preferred method
const walletInfo = await walletService.connectWallet({
  preferredMethod: 'injected' // or 'walletconnect'
});

console.log(walletInfo.address);  // User's address
console.log(walletInfo.type);     // 'metamask', 'walletconnect', or 'injected'
console.log(walletInfo.chainId);  // Network chain ID
```

### Key Methods

#### `connectWallet(options)`

Connects to a wallet using the specified method.

**Parameters:**
```typescript
interface WalletConnectionOptions {
  preferredMethod?: 'injected' | 'walletconnect';
}
```

**Returns:**
```typescript
interface WalletInfo {
  address: string;
  type: WalletType;
  chainId: number;
}
```

**Example:**
```typescript
try {
  const wallet = await walletService.connectWallet({
    preferredMethod: 'walletconnect'
  });
  console.log('Connected:', wallet.address);
} catch (error) {
  console.error('Connection failed:', error.message);
}
```

#### `switchToArcNetwork()`

Switches the connected wallet to Arc Network.

**Behavior:**
- For injected wallets: Uses `wallet_addEthereumChain` and `wallet_switchEthereumChain`
- For WalletConnect: Throws error asking user to switch manually in their wallet app

**Example:**
```typescript
try {
  await walletService.switchToArcNetwork();
  console.log('Switched to Arc Network');
} catch (error) {
  if (error.message.includes('manually switch')) {
    // Show user instruction to switch in their wallet
  }
}
```

#### `checkNetwork()`

Verifies if the current network is Arc Network.

**Returns:** `Promise<boolean>`

**Example:**
```typescript
const isCorrectNetwork = await walletService.checkNetwork();
if (!isCorrectNetwork) {
  // Prompt user to switch networks
}
```

#### `disconnect()`

Disconnects the current wallet connection.

**Example:**
```typescript
await walletService.disconnect();
```

#### `getProvider()`

Returns the current ethers.js BrowserProvider instance.

**Returns:** `ethers.BrowserProvider | null`

#### `getCurrentWalletType()`

Returns the type of currently connected wallet.

**Returns:** `'metamask' | 'walletconnect' | 'injected' | null`

#### `isConnected()`

Checks if a wallet is currently connected.

**Returns:** `boolean`

## Network Configuration

### Arc Network Details

```typescript
const ARC_TESTNET_CONFIG = {
  chainId: 4703,
  chainIdHex: '0x125F',
  chainName: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18  // Required by MetaMask standard
  },
  rpcUrls: ['https://rpc-testnet.arc.network'],
  blockExplorerUrls: ['https://explorer-testnet.arc.network']
};
```

**Important**: `nativeCurrency.decimals` must be 18 for MetaMask compatibility, even though Arc uses USDC with 6 decimals for actual gas calculations.

## Adding New Wallet Types

### Example: Adding Coinbase Wallet SDK

1. **Install SDK:**
```bash
npm install @coinbase/wallet-sdk
```

2. **Extend WalletService:**
```typescript
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';

class ExtendedWalletService extends WalletService {
  private coinbaseWallet: CoinbaseWalletSDK | null = null;

  async connectCoinbaseWallet(): Promise<WalletInfo> {
    this.coinbaseWallet = new CoinbaseWalletSDK({
      appName: 'Arc DEX',
      appLogoUrl: 'https://your-domain.com/logo.png',
    });

    const coinbaseProvider = this.coinbaseWallet.makeWeb3Provider(
      'https://rpc-testnet.arc.network',
      4703
    );

    await coinbaseProvider.request({ method: 'eth_requestAccounts' });

    this.provider = new ethers.BrowserProvider(coinbaseProvider);
    const signer = await this.provider.getSigner();
    const address = await signer.getAddress();
    const network = await this.provider.getNetwork();

    return {
      address,
      type: 'injected',
      chainId: Number(network.chainId)
    };
  }
}
```

3. **Update UI Component:**
```typescript
<button onClick={() => handleConnect('coinbase')}>
  Connect Coinbase Wallet
</button>
```

## Error Handling

### Common Errors and Solutions

#### "No Web3 wallet found"
```typescript
try {
  await walletService.connectWallet({ preferredMethod: 'injected' });
} catch (error) {
  if (error.message.includes('wallet not found')) {
    // Show modal with wallet installation instructions
    showInstallWalletModal();
  }
}
```

#### "User rejected connection"
```typescript
catch (error) {
  if (error.code === 4001) {
    // User declined in their wallet
    showNotification('Connection cancelled by user');
  }
}
```

#### "Wrong network"
```typescript
const isCorrect = await walletService.checkNetwork();
if (!isCorrect) {
  try {
    await walletService.switchToArcNetwork();
  } catch (error) {
    if (error.code === 4902) {
      // Network not added, add it first
    } else if (error.code === 4001) {
      // User rejected network switch
    }
  }
}
```

## Security Best Practices

### 1. Never Store Private Keys

```typescript
// ❌ NEVER DO THIS
const privateKey = "0x...";
const wallet = new ethers.Wallet(privateKey);

// ✅ ALWAYS use wallet connections
const provider = walletService.getProvider();
const signer = await provider.getSigner();
```

### 2. Verify Network Before Transactions

```typescript
async function executeSwap() {
  // Always check network first
  if (!(await walletService.checkNetwork())) {
    throw new Error('Please switch to Arc Network');
  }

  // Proceed with transaction
  const tx = await dexService.swap(...);
}
```

### 3. Handle Disconnections

```typescript
// Listen for disconnections
if (window.ethereum) {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) {
      // User disconnected
      handleDisconnect();
    }
  });

  window.ethereum.on('chainChanged', (chainId) => {
    // Network changed, reload or update UI
    window.location.reload();
  });
}
```

### 4. Validate Addresses

```typescript
import { ethers } from 'ethers';

function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

// Always validate before using
if (!isValidAddress(userInput)) {
  throw new Error('Invalid address');
}
```

## Testing Wallet Integration

### Manual Testing Checklist

- [ ] Connect with MetaMask
- [ ] Connect with WalletConnect (mobile wallet)
- [ ] Connect with Coinbase Wallet
- [ ] Switch networks successfully
- [ ] Handle network mismatch gracefully
- [ ] Disconnect and reconnect
- [ ] Reject connection from wallet
- [ ] Reject network switch from wallet
- [ ] Test on different browsers (Chrome, Firefox, Brave, Safari)
- [ ] Test on mobile devices

### Automated Testing

```typescript
import { expect } from 'chai';
import { WalletService } from './walletService';

describe('WalletService', () => {
  let walletService: WalletService;

  beforeEach(() => {
    walletService = new WalletService();
  });

  it('should detect injected provider', () => {
    expect(walletService.isConnected()).to.be.false;
  });

  it('should check network correctly', async () => {
    const isCorrect = await walletService.checkNetwork();
    expect(typeof isCorrect).to.equal('boolean');
  });
});
```

## Mobile Wallet Integration

### Deep Links

For mobile wallet deep linking:

```typescript
const wcUri = walletConnectProvider.connector.uri;

// Create deep link for popular wallets
const deepLinks = {
  trust: `trust://wc?uri=${encodeURIComponent(wcUri)}`,
  rainbow: `rainbow://wc?uri=${encodeURIComponent(wcUri)}`,
  metamask: `metamask://wc?uri=${encodeURIComponent(wcUri)}`,
};

// Open specific wallet
window.location.href = deepLinks.trust;
```

### QR Code Customization

```typescript
const walletConnectProvider = new WalletConnectProvider({
  rpc: { [chainId]: rpcUrl },
  qrcode: true,
  qrcodeModalOptions: {
    mobileLinks: [
      "rainbow",
      "metamask",
      "trust",
      "argent",
    ],
  },
});
```

## Troubleshooting

### Issue: WalletConnect not connecting

**Solution:**
1. Check RPC URL is correct and accessible
2. Verify chain ID matches Arc Network
3. Ensure QR code is displaying properly
4. Try restarting both devices

### Issue: MetaMask network not switching

**Solution:**
1. Ensure `decimals: 18` for nativeCurrency
2. Check chainId is in hex format (0x125F)
3. Verify RPC endpoint is accessible
4. Try adding network manually in MetaMask settings

### Issue: "Nonce too high" error

**Solution:**
```typescript
// Reset transaction count in MetaMask
// Settings > Advanced > Reset Account
```

## Advanced Features

### Multi-Wallet Support

Allow users to connect multiple wallets simultaneously:

```typescript
class MultiWalletService {
  private wallets: Map<string, WalletInfo> = new Map();

  async addWallet(method: 'injected' | 'walletconnect') {
    const wallet = await walletService.connectWallet({ preferredMethod: method });
    this.wallets.set(wallet.address, wallet);
    return wallet;
  }

  getWallets(): WalletInfo[] {
    return Array.from(this.wallets.values());
  }
}
```

### Hardware Wallet Support

For Ledger/Trezor integration:

```typescript
// Via WalletConnect
// Hardware wallets work automatically through WalletConnect

// Direct integration (advanced)
import Ledger from '@ledgerhq/hw-app-eth';
import Transport from '@ledgerhq/hw-transport-webusb';

async function connectLedger() {
  const transport = await Transport.create();
  const ledger = new Ledger(transport);
  // Implementation details...
}
```

## Resources

- [WalletConnect Documentation](https://docs.walletconnect.com/)
- [ethers.js Documentation](https://docs.ethers.org/)
- [EIP-1193: Ethereum Provider API](https://eips.ethereum.org/EIPS/eip-1193)
- [EIP-3085: wallet_addEthereumChain](https://eips.ethereum.org/EIPS/eip-3085)

---

For more information, see:
- [User Guide](./USER_GUIDE.md)
- [Security Documentation](./SECURITY.md)
- [Architecture Documentation](./ARCHITECTURE.md)
