// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TokenWhitelist
 * @notice Управління білим списком токенів, дозволених для торгівлі на DEX
 * @dev Захист від шахрайських токенів та забезпечення регуляторної відповідності
 *
 * Архітектура:
 * - Тільки власник (або governance) може додавати/видаляти токени
 * - Підтримує метадані токенів (назва, символ) для UI
 * - Можливість масового додавання токенів для ефективності
 *
 * Особливості для Arc Network:
 * - Важливо для інституційних клієнтів Arc (регуляторна відповідність)
 * - Підтримка стабількоінів (USDC, USDT) як базових активів
 * - Можливість інтеграції з KYC/AML системами у майбутньому
 */
contract TokenWhitelist is Ownable {
    struct TokenInfo {
        bool isWhitelisted;
        string name;
        string symbol;
        uint8 decimals;
        uint256 addedAt;
    }

    mapping(address => TokenInfo) public tokens;
    address[] public tokenList;

    event TokenWhitelisted(
        address indexed token,
        string name,
        string symbol,
        uint8 decimals
    );
    event TokenRemoved(address indexed token);
    event TokenUpdated(address indexed token, string name, string symbol);

    constructor(address _owner) Ownable(_owner) {}

    /**
     * @notice Додає токен до білого списку
     * @param token Адреса токена
     * @param name Назва токена
     * @param symbol Символ токена
     * @param decimals Кількість десяткових знаків
     */
    function addToken(
        address token,
        string memory name,
        string memory symbol,
        uint8 decimals
    ) external onlyOwner {
        require(token != address(0), "TokenWhitelist: zero address");
        require(!tokens[token].isWhitelisted, "TokenWhitelist: already whitelisted");
        require(bytes(name).length > 0, "TokenWhitelist: empty name");
        require(bytes(symbol).length > 0, "TokenWhitelist: empty symbol");

        tokens[token] = TokenInfo({
            isWhitelisted: true,
            name: name,
            symbol: symbol,
            decimals: decimals,
            addedAt: block.timestamp
        });

        tokenList.push(token);

        emit TokenWhitelisted(token, name, symbol, decimals);
    }

    /**
     * @notice Додає декілька токенів до білого списку одночасно
     * @param _tokens Масив адрес токенів
     * @param names Масив назв токенів
     * @param symbols Масив символів токенів
     * @param decimalsArray Масив decimals токенів
     */
    function addTokensBatch(
        address[] calldata _tokens,
        string[] calldata names,
        string[] calldata symbols,
        uint8[] calldata decimalsArray
    ) external onlyOwner {
        require(
            _tokens.length == names.length &&
            _tokens.length == symbols.length &&
            _tokens.length == decimalsArray.length,
            "TokenWhitelist: array length mismatch"
        );

        for (uint256 i = 0; i < _tokens.length; i++) {
            address token = _tokens[i];

            if (token == address(0) || tokens[token].isWhitelisted) {
                continue;
            }

            tokens[token] = TokenInfo({
                isWhitelisted: true,
                name: names[i],
                symbol: symbols[i],
                decimals: decimalsArray[i],
                addedAt: block.timestamp
            });

            tokenList.push(token);

            emit TokenWhitelisted(token, names[i], symbols[i], decimalsArray[i]);
        }
    }

    /**
     * @notice Видаляє токен з білого списку
     * @param token Адреса токена
     */
    function removeToken(address token) external onlyOwner {
        require(tokens[token].isWhitelisted, "TokenWhitelist: not whitelisted");

        tokens[token].isWhitelisted = false;

        for (uint256 i = 0; i < tokenList.length; i++) {
            if (tokenList[i] == token) {
                tokenList[i] = tokenList[tokenList.length - 1];
                tokenList.pop();
                break;
            }
        }

        emit TokenRemoved(token);
    }

    /**
     * @notice Оновлює метадані токена
     * @param token Адреса токена
     * @param name Нова назва
     * @param symbol Новий символ
     */
    function updateTokenInfo(
        address token,
        string memory name,
        string memory symbol
    ) external onlyOwner {
        require(tokens[token].isWhitelisted, "TokenWhitelist: not whitelisted");
        require(bytes(name).length > 0, "TokenWhitelist: empty name");
        require(bytes(symbol).length > 0, "TokenWhitelist: empty symbol");

        tokens[token].name = name;
        tokens[token].symbol = symbol;

        emit TokenUpdated(token, name, symbol);
    }

    /**
     * @notice Перевіряє, чи токен у білому списку
     * @param token Адреса токена
     * @return true якщо токен дозволений
     */
    function isWhitelisted(address token) external view returns (bool) {
        return tokens[token].isWhitelisted;
    }

    /**
     * @notice Повертає інформацію про токен
     * @param token Адреса токена
     * @return TokenInfo структура з даними токена
     */
    function getTokenInfo(address token) external view returns (TokenInfo memory) {
        return tokens[token];
    }

    /**
     * @notice Повертає список всіх дозволених токенів
     * @return Масив адрес токенів
     */
    function getAllTokens() external view returns (address[] memory) {
        return tokenList;
    }

    /**
     * @notice Повертає кількість токенів у білому списку
     * @return Кількість токенів
     */
    function getTokenCount() external view returns (uint256) {
        return tokenList.length;
    }
}
