# Troubleshooting Guide - Вирішення проблем

Поширені проблеми та їх рішення для Arc DEX.

## Білий екран / Сторінка не завантажується

### Проблема 1: Кеш браузера

**Симптоми:**
- Білий екран
- Сторінка не реагує
- Помилки в консолі про застарілі модулі

**Рішення:**
```bash
# Варіант 1: Hard refresh
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R

# Варіант 2: Очистити кеш браузера
1. Відкрити DevTools (F12)
2. Правою кнопкою на іконку refresh
3. "Empty Cache and Hard Reload"

# Варіант 3: Приватне вікно
Відкрити в режимі інкогніто (Ctrl+Shift+N)
```

### Проблема 2: Dev server не запущений

**Симптоми:**
- ERR_CONNECTION_REFUSED
- Не можу підключитися до localhost:5173

**Рішення:**
```bash
# Перевірити чи запущений dev server
# Він має запускатися автоматично

# Якщо треба запустити вручну (тільки для development):
npm run dev
```

### Проблема 3: Помилки JavaScript

**Як перевірити:**
```bash
1. Відкрити консоль браузера (F12 → Console)
2. Шукати червоні помилки
3. Скопіювати повідомлення про помилку
```

**Типові помилки:**

**"Uncaught ReferenceError: X is not defined"**
```bash
Причина: Відсутній імпорт компонента/функції
Рішення: Додати відповідний import у файл
```

**"Cannot read property of undefined"**
```bash
Причина: Спроба доступу до неініціалізованої змінної
Рішення: Додати перевірку || опціональний chaining (?.)
```

**"Module not found"**
```bash
Причина: Файл не знайдено або неправильний шлях
Рішення:
1. Перевірити шлях до файлу
2. npm install (перевстановити залежності)
```

## Помилки компіляції

### Build fails

**Помилка:** "Rollup failed to resolve import"
```bash
Причина: Відсутня залежність у package.json

Рішення:
npm install
npm run build
```

**Помилка:** TypeScript помилки
```bash
Перевірити типи:
npm run typecheck

Виправити помилки у коді
```

## Помилки Web3 / Гаманця

### "Web3 гаманець не знайдено"

**Рішення:**
1. Встановити MetaMask: https://metamask.io/download/
2. Перезавантажити сторінку
3. Переконатися що розширення активне

Детальніше: [WALLET_CONNECTION.md](./WALLET_CONNECTION.md)

### "User rejected connection"

**Рішення:**
1. Натиснути "Підключити гаманець" знову
2. У MetaMask натиснути "Connect" / "Підключити"

### "Chain mismatch"

**Рішення:**
1. У MetaMask вибрати "Arc Testnet"
2. Або підключитися через додаток (автоматично переключить)

## Помилки контрактів

### "Pool does not exist"

**Причина:** Пул не створено для цієї пари токенів

**Рішення:**
```bash
# Створити пул (тільки owner)
node scripts/createPool.js <tokenA> <tokenB>

# Або через UI як admin
```

### "insufficient funds for gas"

**Причина:** Недостатньо USDC для оплати газу

**Рішення:**
1. Отримати USDC з faucet: https://faucet-testnet.arc.network
2. Зачекати 1-2 хвилини
3. Спробувати знову

### "Slippage exceeded"

**Причина:** Ціна змінилася більше ніж дозволено

**Рішення:**
1. Збільшити slippage tolerance (Settings → 2-3%)
2. Або зменшити розмір trade
3. Спробувати знову

## Проблеми з розгортанням

### Deploy fails

**Помилка:** "insufficient funds"
```bash
Причина: Недостатньо USDC на адресі deployer

Рішення:
1. Перевірити баланс
2. Отримати USDC з faucet
3. Спробувати deploy знову
```

**Помилка:** "nonce too low"
```bash
Причина: Desync nonce

Рішення:
1. У MetaMask: Settings → Advanced → Reset Account
2. Спробувати deploy знову
```

## Проблеми з тестами

### Tests fail

**Помилка:** "Cannot find module"
```bash
Рішення:
npm install
npm test
```

**Помилка:** Timeout
```bash
Причина: Тести виконуються занадто довго

Рішення:
# Збільшити timeout у hardhat.config.js
mocha: {
  timeout: 60000 // 60 секунд
}
```

## Проблеми з performance

### Сайт повільний

**Рішення:**
```bash
1. Перевірити Network tab у DevTools
2. Шукати повільні запити
3. Перевірити чи працює швидкість інтернету
4. Arc має під-секундну фінальність - якщо повільно, проблема в іншому
```

### Транзакції "pending"

**Причина:** Низький gas price або проблеми з мережею

**Рішення:**
```bash
1. Зачекати 1-2 хвилини (Arc швидка!)
2. Перевірити статус у Arc Explorer
3. Якщо застрягла > 5 хвилин - є проблема
4. Перевірити Arc Network status
```

## Debugging інструменти

### Browser DevTools

```bash
# Відкрити DevTools
F12 або Ctrl+Shift+I (Windows/Linux)
Cmd+Option+I (Mac)

# Корисні вкладки:
- Console: JavaScript помилки та логи
- Network: HTTP запити
- Application: LocalStorage, Cookies
- Sources: Breakpoints для debugging
```

### Hardhat Console

```bash
# Запустити Hardhat console
npx hardhat console --network arcTestnet

# Отримати інформацію
const dex = await ethers.getContractAt("DEXCore", "0x...");
const pool = await dex.getPool(tokenA, tokenB);
console.log(pool);
```

### Ethers.js в консолі

```javascript
// У консолі браузера
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const address = await signer.getAddress();
console.log('Address:', address);

const balance = await provider.getBalance(address);
console.log('Balance:', ethers.formatEther(balance));
```

## Логування для debug

### Додати логи у код

```typescript
// src/lib/dex.ts
console.log('[DEXService] Connecting wallet...');
console.log('[DEXService] Provider:', this.provider);
console.log('[DEXService] Signer:', this.signer);
```

### Environment variables

```bash
# .env.local (для development)
VITE_DEBUG=true

# У коді
if (import.meta.env.VITE_DEBUG) {
  console.log('Debug info:', data);
}
```

## Отримати допомогу

Якщо проблема не вирішена:

### 1. Зібрати інформацію

```bash
- Браузер та версія
- Версія MetaMask
- Повідомлення про помилку (screenshot)
- Кроки для відтворення
- Консольні помилки (F12 → Console)
```

### 2. Перевірити документацію

- [README.md](../README.md) - загальна інформація
- [WALLET_CONNECTION.md](./WALLET_CONNECTION.md) - проблеми з гаманцем
- [QUICK_START.md](./QUICK_START.md) - швидкий старт

### 3. Створити issue

```markdown
**Опис проблеми:**
[Опишіть що не працює]

**Кроки для відтворення:**
1. ...
2. ...
3. ...

**Очікувана поведінка:**
[Що має відбуватися]

**Реальна поведінка:**
[Що відбувається]

**Скріншоти:**
[Додати скріншоти помилок]

**Середовище:**
- Браузер: Chrome 120
- MetaMask: 11.5.0
- OS: Windows 11
```

## Корисні посилання

- Arc Network Status: https://status.arc.network (примір)
- Arc Explorer: https://explorer-testnet.arc.network
- Arc Faucet: https://faucet-testnet.arc.network
- MetaMask Support: https://support.metamask.io/

---

**Примітка:** Цей документ оновлюється. Якщо знайшли нову проблему - додайте до issue!
