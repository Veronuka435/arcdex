# Arc DEX - Quick Start Guide

Швидкий старт для розробників, які хочуть розгорнути DEX на Arc Network.

## Перед початком

Вам потрібні:
- Node.js >= 18
- npm >= 9
- MetaMask або інший Web3 гаманець
- Базове розуміння Solidity та React

## 5-хвилинний старт

### 1. Клонування та встановлення (1 хв)

```bash
git clone <your-repo>
cd arc-dex
npm install
```

### 2. Налаштування .env (1 хв)

```bash
cp .env.example .env
# Відредагуйте .env файл
```

Мінімальна конфігурація:
```env
PRIVATE_KEY=your_private_key_without_0x
ARC_TESTNET_RPC=https://rpc-testnet.arc.network
```

### 3. Отримати тестові токени (1 хв)

Перейдіть на https://faucet-testnet.arc.network та отримайте USDC для оплати газу.

### 4. Компіляція та тестування (1 хв)

```bash
npm run compile
npm test
```

### 5. Розгортання на Arc Testnet (1 хв)

```bash
npm run deploy:arc-testnet
```

Після розгортання ви отримаєте адреси контрактів у файлі `deployments/arcTestnet-*.json`.

## Що далі?

### Створіть перший пул

```bash
node scripts/createPool.js <USDC_ADDRESS> <WETH_ADDRESS>
```

### Запустіть frontend

```bash
# Оновіть VITE_DEX_ADDRESS у .env
VITE_DEX_ADDRESS=<ваша_адреса_dex>

# Dev server запускається автоматично
```

### Перевірте у браузері

1. Відкрийте http://localhost:5173
2. Підключіть MetaMask
3. Переключіться на Arc Testnet
4. Виконайте перший swap!

## Архітектура за 2 хвилини

### Смарт-контракти

```
DEXCore - головний контракт
├── Створює пули ліквідності
├── Виконує swap (AMM x * y = k)
├── Управляє ліквідністю
└── Mint/burn LP токенів

LPToken - ERC-20 токени для LP
└── Представляють частку у пулі

TokenWhitelist - білий список
└── Тільки дозволені токени
```

### Frontend

```
DEXService (SDK)
├── Підключення до Arc
├── Взаємодія з контрактами
└── Автоматичний approve

SwapWidget
└── UI для обміну токенів

LiquidityWidget
└── UI для ліквідності
```

## Основні команди

```bash
# Розробка
npm run compile          # Компіляція контрактів
npm test                 # Запуск тестів
npm run test:coverage    # Покриття коду

# Розгортання
npm run deploy:arc-testnet   # Тестова мережа
npm run verify:arc-testnet   # Верифікація

# Frontend
npm run dev              # Dev server (автоматично)
npm run build            # Production build
npm run preview          # Preview build

# Утиліти
npm run lint             # Linting
npm run typecheck        # Type checking
```

## Arc Network особливості

### 1. Стабількоін-газ
```javascript
// Газ оплачується в USDC, не в ETH!
const tx = await dex.swap(...);
// Вартість: ~$0.50 USDC (приклад)
```

### 2. Під-секундна фінальність
```javascript
const tx = await dex.swap(...);
await tx.wait(); // < 1 секунда!
console.log('Done!');
```

### 3. MetaMask конфігурація
```javascript
await ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0x122F',
    chainName: 'Arc Testnet',
    nativeCurrency: {
      name: 'USDC',
      symbol: 'USDC',
      decimals: 6
    },
    rpcUrls: ['https://rpc-testnet.arc.network']
  }]
});
```

## Troubleshooting

### Помилка: "insufficient funds for gas"
**Рішення:** Отримайте USDC з faucet: https://faucet-testnet.arc.network

### Помилка: "pool does not exist"
**Рішення:** Створіть пул:
```bash
node scripts/createPool.js <tokenA> <tokenB>
```

### Помилка: "slippage exceeded"
**Рішення:** Збільште slippage tolerance або зменште розмір trade.

### Помилка: "tokenA not whitelisted"
**Рішення:** Додайте токен до whitelist (тільки owner):
```javascript
await whitelist.addToken(tokenAddress, "Name", "SYMBOL", 18);
```

## Приклади коду

### Простий Swap

```javascript
const dex = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, signer);

await token.approve(DEX_ADDRESS, amountIn);
await dex.swap(tokenIn, tokenOut, amountIn, minAmountOut);
```

### Додати ліквідність

```javascript
await tokenA.approve(DEX_ADDRESS, amountA);
await tokenB.approve(DEX_ADDRESS, amountB);
await dex.addLiquidity(tokenA, tokenB, amountA, amountB, minLiquidity);
```

### Отримати ціну

```javascript
const quote = await dex.getAmountOut(tokenIn, tokenOut, amountIn);
console.log('Price:', ethers.formatUnits(quote, 18));
```

## Наступні кроки

1. **Прочитайте документацію:**
   - [docs/README.md](./README.md) - повна документація
   - [docs/ARCHITECTURE.md](./ARCHITECTURE.md) - технічна архітектура
   - [docs/SECURITY.md](./SECURITY.md) - безпека та аудит

2. **Вивчіть приклади:**
   - [docs/INTEGRATION_EXAMPLES.md](./INTEGRATION_EXAMPLES.md) - практичні приклади

3. **Протестуйте на testnet:**
   - Створіть кілька пулів
   - Виконайте swap операції
   - Додайте та видаліть ліквідність

4. **Перед mainnet:**
   - [ ] Професійний аудит безпеки
   - [ ] Extended testing (2+ тижні)
   - [ ] Multi-sig ownership
   - [ ] Bug bounty програма

## Корисні посилання

- 🌐 [Arc Network](https://arc.network)
- 📚 [Arc Docs](https://docs.arc.network)
- 🔍 [Arc Testnet Explorer](https://explorer-testnet.arc.network)
- 💧 [Arc Faucet](https://faucet-testnet.arc.network)
- 💬 [Arc Discord](https://discord.gg/arc)

## Підтримка

Питання? Проблеми?
- Перегляньте документацію у папці `docs/`
- Створіть issue у репозиторії
- Приєднайтеся до Arc спільноти

---

**Готово!** Ви можете розпочати розробку DEX на Arc Network! 🚀
