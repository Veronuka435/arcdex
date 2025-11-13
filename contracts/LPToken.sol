// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LPToken
 * @notice Токен ліквідності (LP Token), який представляє частку провайдера ліквідності у пулі
 * @dev ERC-20 токен, який випускається при додаванні ліквідності та спалюється при виведенні
 *
 * Архітектура:
 * - Кожна торгова пара (наприклад, USDC/ETH) має свій власний LP токен
 * - LP токени можуть бути mint'ені тільки DEX контрактом (owner)
 * - Кількість LP токенів пропорційна до внеску провайдера ліквідності
 * - LP токени можна передавати між адресами (трансфери)
 *
 * Особливості для Arc Network:
 * - Оптимізовано для низьких газових витрат через стабількоін-газ
 * - Підтримує швидку фінальність Arc (під-секундну)
 */
contract LPToken is ERC20, Ownable {
    address public tokenA;
    address public tokenB;

    event LPTokensMinted(address indexed to, uint256 amount);
    event LPTokensBurned(address indexed from, uint256 amount);

    /**
     * @notice Створює новий LP токен для торгової пари
     * @param _tokenA Адреса першого токена у парі
     * @param _tokenB Адреса другого токена у парі
     * @param _name Назва LP токена (наприклад, "USDC-ETH LP")
     * @param _symbol Символ LP токена (наприклад, "LP-USDC-ETH")
     * @param _owner Адреса власника (зазвичай DEX контракт)
     */
    constructor(
        address _tokenA,
        address _tokenB,
        string memory _name,
        string memory _symbol,
        address _owner
    ) ERC20(_name, _symbol) Ownable(_owner) {
        require(_tokenA != address(0), "LPToken: tokenA is zero address");
        require(_tokenB != address(0), "LPToken: tokenB is zero address");
        require(_tokenA != _tokenB, "LPToken: identical tokens");

        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    /**
     * @notice Випускає нові LP токени провайдеру ліквідності
     * @dev Може бути викликано тільки власником (DEX контрактом)
     * @param to Адреса отримувача LP токенів
     * @param amount Кількість LP токенів для випуску
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "LPToken: mint to zero address");
        require(amount > 0, "LPToken: mint amount is zero");

        _mint(to, amount);
        emit LPTokensMinted(to, amount);
    }

    /**
     * @notice Спалює LP токени при виведенні ліквідності
     * @dev Може бути викликано тільки власником (DEX контрактом)
     * @param from Адреса власника LP токенів
     * @param amount Кількість LP токенів для спалення
     */
    function burn(address from, uint256 amount) external onlyOwner {
        require(from != address(0), "LPToken: burn from zero address");
        require(amount > 0, "LPToken: burn amount is zero");
        require(balanceOf(from) >= amount, "LPToken: insufficient balance");

        _burn(from, amount);
        emit LPTokensBurned(from, amount);
    }

    /**
     * @notice Повертає інформацію про торгову пару
     * @return Адреси обох токенів у парі
     */
    function getPair() external view returns (address, address) {
        return (tokenA, tokenB);
    }
}
