# Підключення гаманця - Troubleshooting Guide

Детальний гайд по вирішенню проблем з підключенням Web3 гаманців до Arc DEX.

## Перевірка наявності гаманця

### 1. Переконайтеся, що гаманець встановлено

**MetaMask (рекомендовано):**
- Завантажте з https://metamask.io/download/
- Доступний для Chrome, Firefox, Brave, Edge
- Також є мобільний додаток

**Альтернативні гаманці:**
- Coinbase Wallet: https://www.coinbase.com/wallet
- Trust Wallet: https://trustwallet.com/
- Rainbow: https://rainbow.me/
- Brave Wallet (вбудований у Brave браузер)

### 2. Перевірка у консолі браузера

Відкрийте консоль розробника (F12) та введіть:

```javascript
console.log(window.ethereum);
```

**Очікуваний результат:**
```javascript
{
  isMetaMask: true,
  request: function,
  // ... інші властивості
}
```

**Якщо `undefined`:**
- Гаманець не встановлено або вимкнено
- Перезавантажте сторінку після встановлення
- Переконайтеся, що розширення активне

## Типові проблеми та рішення

### Проблема 1: "Web3 гаманець не знайдено"

**Причини:**
- MetaMask не встановлено
- Розширення вимкнено
- Використовується інкогніто режим (без дозволу для розширень)

**Рішення:**
```bash
1. Встановити MetaMask з офіційного сайту
2. Переконатися, що розширення активне (іконка в браузері)
3. Перезавантажити сторінку (Ctrl+R або Cmd+R)
4. Якщо в інкогніто - дозволити розширення для приватних вікон
```

### Проблема 2: "Користувач відхилив підключення"

**Причини:**
- Натиснули "Cancel" у MetaMask popup
- Закрили вікно MetaMask без дії

**Рішення:**
```bash
1. Натисніть "Підключити гаманець" знову
2. У MetaMask popup натисніть "Connect" / "Підключити"
3. Виберіть акаунт, який хочете підключити
```

### Проблема 3: "Не вдалося додати мережу Arc"

**Причини:**
- MetaMask блокує додавання мереж
- Проблеми з RPC endpoint

**Рішення:**

**Варіант A - Автоматично (через додаток):**
```bash
1. Натисніть "Підключити гаманець"
2. Дозвольте додавання мережі Arc у MetaMask
```

**Варіант B - Вручну:**
```bash
1. Відкрийте MetaMask
2. Натисніть на вибір мережі (зверху)
3. "Add Network" → "Add a network manually"
4. Заповніть:
   - Network Name: Arc Testnet
   - RPC URL: https://rpc-testnet.arc.network
   - Chain ID: 4655 (або 0x122F в hex)
   - Currency Symbol: USDC
   - Block Explorer: https://explorer-testnet.arc.network
5. Збережіть
```

### Проблема 4: "Користувач відхилив зміну мережі"

**Причини:**
- Не підтвердили перемикання мережі у MetaMask
- Використовується інша мережа

**Рішення:**
```bash
1. У MetaMask виберіть мережу "Arc Testnet" вручну
2. Або підключіться знову через додаток
3. Підтвердіть зміну мережі у popup
```

### Проблема 5: "Account недоступний"

**Причини:**
- Акаунт заблоковано у MetaMask
- Не надано дозвіл на доступ

**Рішення:**
```bash
1. Відкрийте MetaMask
2. Переконайтеся, що акаунт розблокований
3. Settings → Connected Sites → Видаліть Arc DEX
4. Підключіться заново
```

## Розширена діагностика

### Перевірка версії MetaMask

```javascript
// У консолі браузера
console.log(window.ethereum.isMetaMask);
console.log(window.ethereum._metamask?.version);
```

**Мінімальна версія:** MetaMask 10.0.0+

### Перевірка підключеної мережі

```javascript
// У консолі браузера
window.ethereum.request({ method: 'eth_chainId' })
  .then(chainId => console.log('Current chain:', chainId));

// Очікується: 0x122f (Arc Testnet)
```

### Перевірка підключених акаунтів

```javascript
// У консолі браузера
window.ethereum.request({ method: 'eth_accounts' })
  .then(accounts => console.log('Connected accounts:', accounts));
```

## Підключення альтернативних гаманців

### Coinbase Wallet

```javascript
// Автоматично працює через window.ethereum
// Аналогічно MetaMask
```

### WalletConnect (для мобільних гаманців)

**Примітка:** Поточна версія DEX не підтримує WalletConnect out-of-the-box.

Для додавання WalletConnect:
```bash
npm install @web3modal/ethers ethers
```

### Trust Wallet (мобільний)

```bash
1. Відкрийте Trust Wallet додаток
2. DApps → Введіть URL вашого DEX
3. Підключіть автоматично
```

## Налаштування для розробників

### Локальне тестування

```bash
# .env
VITE_DEX_ADDRESS=0x...  # Адреса після deploy
VITE_USDC_ADDRESS=0x...
VITE_WETH_ADDRESS=0x...
VITE_DAI_ADDRESS=0x...
```

### Тестування без реального гаманця

```javascript
// Для testing використовуйте hardhat node
npx hardhat node

// У іншому терміналі
npx hardhat run scripts/deploy.js --network localhost

// У MetaMask додайте локальну мережу:
// - RPC: http://localhost:8545
// - Chain ID: 31337
```

## Помилки у виробництві

### Error: "insufficient funds for gas"

**Причина:** Недостатньо USDC для оплати газу на Arc Network.

**Рішення:**
```bash
1. Перейдіть на https://faucet-testnet.arc.network
2. Введіть вашу адресу
3. Отримайте тестові USDC
4. Зачекайте 1-2 хвилини
5. Перевірте баланс у MetaMask
```

### Error: "chain mismatch"

**Причина:** Підключені до неправильної мережі.

**Рішення:**
```bash
1. У MetaMask виберіть "Arc Testnet"
2. Або натисніть кнопку підключення - автоматично переключить
```

### Error: "transaction rejected"

**Причина:** Відхилили транзакцію у MetaMask.

**Рішення:**
```bash
1. Спробуйте знову
2. Перевірте достатність балансу
3. Підтвердіть транзакцію у popup
```

## Best Practices

### 1. Завжди перевіряйте мережу

```typescript
const chainId = await provider.send('eth_chainId', []);
if (chainId !== '0x122f') {
  alert('Будь ласка, переключіться на Arc Testnet');
}
```

### 2. Обробляйте відключення

```typescript
window.ethereum?.on('accountsChanged', (accounts) => {
  if (accounts.length === 0) {
    console.log('Гаманець відключено');
  } else {
    console.log('Акаунт змінено:', accounts[0]);
  }
});

window.ethereum?.on('chainChanged', (chainId) => {
  console.log('Мережа змінена:', chainId);
  window.location.reload(); // Рекомендується
});
```

### 3. Graceful degradation

```typescript
if (!window.ethereum) {
  // Показати повідомлення про встановлення гаманця
  return <InstallWalletMessage />;
}
```

## Підтримка

Якщо проблема не вирішена:

1. **Перевірте консоль браузера** (F12) на помилки
2. **Скопіюйте повідомлення про помилку**
3. **Створіть issue** у репозиторії з:
   - Версією браузера
   - Версією MetaMask
   - Скріншотом помилки
   - Кроками для відтворення

## Корисні посилання

- MetaMask Support: https://support.metamask.io/
- Arc Network Docs: https://docs.arc.network
- Arc Testnet Faucet: https://faucet-testnet.arc.network
- Arc Explorer: https://explorer-testnet.arc.network

---

**Примітка:** Цей гайд оновлюється. Якщо знайшли нову проблему - повідомте!
