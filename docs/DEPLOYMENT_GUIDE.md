# Arc DEX Deployment Guide

## Prerequisites

Before deploying Arc DEX, ensure you have:

1. Node.js 18+ and npm installed
2. A wallet with USDC on Arc Network (for gas fees)
3. Access to Arc Network RPC endpoints
4. Git installed

## Environment Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd arc-dex
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Network Configuration
VITE_DEX_ADDRESS=<your-deployed-dex-contract-address>
VITE_USDC_ADDRESS=<usdc-token-address>
VITE_WETH_ADDRESS=<weth-token-address>
VITE_DAI_ADDRESS=<dai-token-address>

# Deployment Configuration
PRIVATE_KEY=<your-wallet-private-key>
ARC_TESTNET_RPC=https://rpc-testnet.arc.network
ARC_MAINNET_RPC=https://rpc.arc.network
```

**Security Warning**: Never commit your `.env` file to version control!

## Smart Contract Deployment

### Deploy to Arc Testnet

```bash
npm run deploy:arc-testnet
```

This will deploy:
1. DEXCore contract
2. TokenWhitelist contract
3. LPToken factory
4. Mock ERC20 tokens (for testing)

### Deploy to Arc Mainnet

```bash
npm run deploy:arc-mainnet
```

**Important**: Carefully review all contract addresses before deploying to mainnet!

### Verify Contracts

After deployment, verify your contracts on Arc Explorer:

```bash
npm run verify:arc-testnet
```

This makes your contract source code publicly viewable and builds trust.

## Frontend Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Deploy to Hosting Services

#### Netlify

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard
5. Deploy!

#### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts
4. Add environment variables in Vercel dashboard

#### Traditional Hosting (Apache/Nginx)

1. Upload `dist/` contents to your web server
2. Configure server to serve `index.html` for all routes
3. Ensure HTTPS is enabled
4. Set appropriate CORS headers

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/arc-dex/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

## Post-Deployment Configuration

### 1. Create Initial Liquidity Pools

```bash
node scripts/createPool.js
```

This script creates initial pools for your supported token pairs.

### 2. Whitelist Tokens

Add approved tokens to the whitelist contract:

```javascript
// In Hardhat console
const TokenWhitelist = await ethers.getContractAt("TokenWhitelist", "<whitelist-address>");
await TokenWhitelist.addToken("<token-address>");
```

### 3. Test Core Functionality

Before announcing your DEX:

1. ✅ Connect wallet successfully
2. ✅ Switch to Arc Network works
3. ✅ Approve token spending
4. ✅ Execute a small test swap
5. ✅ Add and remove small amount of liquidity
6. ✅ Verify transactions on Arc Explorer
7. ✅ Check gas fee calculations

## Security Checklist

Before launching to production:

- [ ] All smart contracts audited by professional auditors
- [ ] Private keys stored securely (never in code)
- [ ] Rate limiting configured on backend (if applicable)
- [ ] HTTPS enabled on all domains
- [ ] Environment variables properly configured
- [ ] Emergency pause functionality tested
- [ ] Multi-sig wallet setup for contract ownership
- [ ] Monitor contracts for unusual activity
- [ ] Backup and disaster recovery plan in place
- [ ] Bug bounty program established

## Monitoring and Maintenance

### Contract Monitoring

Set up monitoring for:
- Large trades (potential price manipulation)
- Unusual liquidity changes
- Failed transactions
- Gas price spikes
- Contract balance changes

### Recommended Tools

- **The Graph**: Index blockchain data
- **Tenderly**: Contract monitoring and alerts
- **OpenZeppelin Defender**: Automated operations and security
- **Dune Analytics**: Create dashboards for DEX metrics

### Regular Maintenance Tasks

**Daily**:
- Check transaction success rate
- Monitor liquidity levels
- Review error logs

**Weekly**:
- Analyze trading volumes
- Review gas optimization opportunities
- Update token lists if needed

**Monthly**:
- Security audit reports
- Performance optimization review
- User feedback analysis

## Upgrading Contracts

### Using Proxy Pattern

If you deployed with upgradeable contracts:

```bash
# Deploy new implementation
npx hardhat run scripts/upgrade.js --network arcTestnet

# Verify upgrade
npx hardhat verify --network arcTestnet <new-implementation-address>
```

### Without Proxy Pattern

If contracts are not upgradeable:

1. Deploy new contract versions
2. Migrate liquidity to new contracts
3. Update frontend to use new addresses
4. Communicate changes to users
5. Deprecate old contracts gracefully

## Rollback Procedure

If critical issues are discovered:

1. **Immediate Actions**:
   - Pause all contracts (if emergency pause is implemented)
   - Notify users via social media / website banner
   - Document the issue

2. **Investigation**:
   - Identify root cause
   - Assess impact (funds at risk, affected users)
   - Determine fix requirements

3. **Resolution**:
   - Deploy fix or rollback
   - Test thoroughly on testnet
   - Communicate timeline to users
   - Resume operations with monitoring

## Performance Optimization

### Frontend Optimization

- Enable Cloudflare or similar CDN
- Implement service workers for offline capability
- Lazy load components
- Optimize image and asset sizes
- Use code splitting

### Smart Contract Gas Optimization

- Batch operations where possible
- Use efficient data structures
- Minimize storage writes
- Consider Layer 2 solutions for high-volume operations

## Support and Resources

### Documentation
- [Architecture Documentation](./ARCHITECTURE.md)
- [Security Best Practices](./SECURITY.md)
- [User Guide](./USER_GUIDE.md)
- [API Reference](./INTEGRATION_EXAMPLES.md)

### Community
- Discord: [Your Discord Link]
- Twitter: [Your Twitter Handle]
- GitHub: [Your GitHub Repo]

### Technical Support
- Email: support@your-domain.com
- GitHub Issues: [Repository Issues URL]

## License

Ensure all dependencies are compatible with your chosen license. Review:
- Smart contract licenses (OpenZeppelin is MIT)
- Frontend library licenses
- Any third-party code integrated

---

**Remember**: Deploying a DEX is a significant responsibility. Prioritize security, user experience, and compliance with local regulations. Consider consulting with legal and security professionals before launching.
