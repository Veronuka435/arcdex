# Швидке налаштування гаманця для Arc DEX

## Крок 1: Встановіть MetaMask

1. Перейдіть на https://metamask.io/download/
2. Оберіть ваш браузер (Chrome, Firefox, Brave, Edge)
3. Натисніть "Install MetaMask"
4. Створіть новий гаманець або імпортуйте існуючий

## Крок 2: Підключіться до Arc DEX

1. Відкрийте https://your-arc-dex-url.com
2. Натисніть "Підключити гаманець"
3. У MetaMask натисніть "Connect"
4. Виберіть акаунт для підключення

## Крок 3: Додайте мережу Arc Testnet

Автоматично (рекомендовано):
- При першому підключенні DEX запропонує додати Arc мережу
- Натисніть "Approve" у MetaMask

Вручну:
1. Відкрийте MetaMask
2. Натисніть на вибір мережі → "Add Network"
3. "Add a network manually"
4. Заповніть:
   ```
   Network Name: Arc Testnet
   RPC URL: https://rpc-testnet.arc.network
   Chain ID: 4655
   Currency Symbol: USDC
   Block Explorer: https://explorer-testnet.arc.network
   ```
5. Save

## Крок 4: Отримайте тестові USDC

1. Перейдіть на https://faucet-testnet.arc.network
2. Введіть вашу адресу (з MetaMask)
3. Натисніть "Request USDC"
4. Зачекайте 1-2 хвилини
5. Перевірте баланс у MetaMask

## Готово!

Тепер ви можете:
- Обмінювати токени (Swap)
- Додавати ліквідність
- Заробляти комісії як LP

## Проблеми?

Якщо гаманець не підключається:
1. Перезавантажте сторінку (Ctrl+R)
2. Переконайтеся, що MetaMask розблоковано
3. Перевірте, що обрано мережу "Arc Testnet"
4. Детальніше: [docs/WALLET_CONNECTION.md](./docs/WALLET_CONNECTION.md)

## Безпека

- Ніколи не діліться своїм seed phrase (12-24 слова)
- Перевіряйте адресу контракту перед approve
- Починайте з малих сум для тестування
- Arc Testnet токени не мають реальної цінності

---

**Важливо:** Це тестова мережа. Перед використанням mainnet версії з реальними коштами, переконайтеся, що розумієте всі ризики!
