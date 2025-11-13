// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./LPToken.sol";
import "./TokenWhitelist.sol";

/**
 * @title DEXCore
 * @notice Основний контракт децентралізованої біржі (DEX) на базі AMM (Uniswap V2 модель)
 * @dev Реалізує функціонал додавання/видалення ліквідності та обміну токенів
 *
 * АРХІТЕКТУРА:
 *
 * 1. AMM модель (x * y = k):
 *    - Кожна торгова пара має резерви двох токенів
 *    - Ціна визначається автоматично через співвідношення резервів
 *    - Провайдери ліквідності отримують LP токени пропорційно їх внеску
 *
 * 2. Комісії:
 *    - Комісія за обмін (swapFee): типово 0.3% (30 базисних пунктів)
 *    - Комісія йде на збільшення резервів (прибуток для провайдерів ліквідності)
 *    - Адмін може змінювати комісію (максимум 1%)
 *
 * 3. Безпека:
 *    - ReentrancyGuard: захист від атак повторного входу
 *    - Pausable: можливість призупинити контракт у разі проблем
 *    - Whitelist: тільки перевірені токени можуть торгуватися
 *    - Slippage protection: мінімальна сума виведення для захисту користувачів
 *
 * ОСОБЛИВОСТІ ДЛЯ ARC NETWORK:
 *
 * 1. Стабількоін-газ (USDC):
 *    - Arc використовує USDC для оплати газу замість нативного токена
 *    - Це спрощує UX для користувачів (не потрібен нативний токен)
 *    - Газові витрати передбачувані у доларах США
 *
 * 2. Швидка фінальність (під-секундна):
 *    - Транзакції підтверджуються майже миттєво
 *    - Користувачі не чекають хвилинами як на Ethereum mainnet
 *    - Ідеально для високочастотної торгівлі
 *
 * 3. Інституційний фокус:
 *    - Arc орієнтована на банки, фінтех компанії, платіжні системи
 *    - DEX підтримує великі обсяги та високу ліквідність
 *    - Можливість інтеграції з регуляторними вимогами через whitelist
 *
 * 4. Опціональна приватність:
 *    - Arc підтримує configurable privacy
 *    - У майбутньому можна додати приватні пули для інституційних клієнтів
 *    - Наразі контракт публічний, але архітектура готова до розширення
 *
 * МАТЕМАТИКА AMM:
 *
 * Константа добутку: reserveA * reserveB = k
 * Ціна токена A у токенах B: priceA = reserveB / reserveA
 *
 * При swap (обмін A → B):
 * 1. Користувач вносить amountAIn токенів A
 * 2. З урахуванням комісії: amountAInWithFee = amountAIn * (10000 - swapFee) / 10000
 * 3. Вихідна сума B: amountBOut = (reserveB * amountAInWithFee) / (reserveA + amountAInWithFee)
 * 4. Нові резерви: reserveA' = reserveA + amountAIn, reserveB' = reserveB - amountBOut
 * 5. Перевірка: reserveA' * reserveB' >= k (підтримання константи з урахуванням комісії)
 */
contract DEXCore is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    struct Pool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        address lpToken;
        uint256 totalLiquidity;
        bool exists;
    }

    TokenWhitelist public whitelist;

    uint256 public swapFee = 30;
    uint256 public constant MAX_SWAP_FEE = 100;
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    mapping(bytes32 => Pool) public pools;
    bytes32[] public poolIds;

    event PoolCreated(
        bytes32 indexed poolId,
        address indexed tokenA,
        address indexed tokenB,
        address lpToken
    );

    event LiquidityAdded(
        bytes32 indexed poolId,
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    event LiquidityRemoved(
        bytes32 indexed poolId,
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    event Swap(
        bytes32 indexed poolId,
        address indexed trader,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    event SwapFeeUpdated(uint256 oldFee, uint256 newFee);

    /**
     * @notice Ініціалізує DEX контракт
     * @param _whitelist Адреса контракту білого списку токенів
     * @param _owner Адреса власника контракту
     */
    constructor(address _whitelist, address _owner) Ownable(_owner) {
        require(_whitelist != address(0), "DEXCore: whitelist is zero address");
        whitelist = TokenWhitelist(_whitelist);
    }

    /**
     * @notice Створює новий пул ліквідності для торгової пари
     * @param tokenA Адреса першого токена
     * @param tokenB Адреса другого токена
     * @return poolId Ідентифікатор створеного пулу
     */
    function createPool(
        address tokenA,
        address tokenB
    ) external onlyOwner returns (bytes32) {
        require(tokenA != address(0), "DEXCore: tokenA is zero address");
        require(tokenB != address(0), "DEXCore: tokenB is zero address");
        require(tokenA != tokenB, "DEXCore: identical tokens");
        require(whitelist.isWhitelisted(tokenA), "DEXCore: tokenA not whitelisted");
        require(whitelist.isWhitelisted(tokenB), "DEXCore: tokenB not whitelisted");

        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);

        bytes32 poolId = keccak256(abi.encodePacked(token0, token1));
        require(!pools[poolId].exists, "DEXCore: pool already exists");

        TokenWhitelist.TokenInfo memory infoA = whitelist.getTokenInfo(token0);
        TokenWhitelist.TokenInfo memory infoB = whitelist.getTokenInfo(token1);

        string memory lpName = string(
            abi.encodePacked(infoA.symbol, "-", infoB.symbol, " LP")
        );
        string memory lpSymbol = string(
            abi.encodePacked("LP-", infoA.symbol, "-", infoB.symbol)
        );

        LPToken lpToken = new LPToken(token0, token1, lpName, lpSymbol, address(this));

        pools[poolId] = Pool({
            tokenA: token0,
            tokenB: token1,
            reserveA: 0,
            reserveB: 0,
            lpToken: address(lpToken),
            totalLiquidity: 0,
            exists: true
        });

        poolIds.push(poolId);

        emit PoolCreated(poolId, token0, token1, address(lpToken));

        return poolId;
    }

    /**
     * @notice Додає ліквідність до пулу
     * @param tokenA Адреса першого токена
     * @param tokenB Адреса другого токена
     * @param amountA Кількість токена A
     * @param amountB Кількість токена B
     * @param minLiquidity Мінімальна кількість LP токенів для отримання (slippage protection)
     * @return liquidity Кількість отриманих LP токенів
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 minLiquidity
    ) external nonReentrant whenNotPaused returns (uint256 liquidity) {
        require(amountA > 0, "DEXCore: amountA is zero");
        require(amountB > 0, "DEXCore: amountB is zero");

        bytes32 poolId = getPoolId(tokenA, tokenB);
        Pool storage pool = pools[poolId];
        require(pool.exists, "DEXCore: pool does not exist");

        (uint256 amount0, uint256 amount1) = tokenA < tokenB
            ? (amountA, amountB)
            : (amountB, amountA);

        IERC20(pool.tokenA).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(pool.tokenB).safeTransferFrom(msg.sender, address(this), amount1);

        if (pool.totalLiquidity == 0) {
            liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            require(liquidity > 0, "DEXCore: insufficient liquidity minted");

            LPToken(pool.lpToken).mint(address(1), MINIMUM_LIQUIDITY);
        } else {
            uint256 liquidityA = (amount0 * pool.totalLiquidity) / pool.reserveA;
            uint256 liquidityB = (amount1 * pool.totalLiquidity) / pool.reserveB;
            liquidity = liquidityA < liquidityB ? liquidityA : liquidityB;
        }

        require(liquidity >= minLiquidity, "DEXCore: insufficient liquidity");

        pool.reserveA += amount0;
        pool.reserveB += amount1;
        pool.totalLiquidity += liquidity;

        LPToken(pool.lpToken).mint(msg.sender, liquidity);

        emit LiquidityAdded(poolId, msg.sender, amount0, amount1, liquidity);
    }

    /**
     * @notice Видаляє ліквідність з пулу
     * @param tokenA Адреса першого токена
     * @param tokenB Адреса другого токена
     * @param liquidity Кількість LP токенів для спалення
     * @param minAmountA Мінімальна кількість токена A для отримання
     * @param minAmountB Мінімальна кількість токена B для отримання
     * @return amountA Кількість отриманого токена A
     * @return amountB Кількість отриманого токена B
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 minAmountA,
        uint256 minAmountB
    ) external nonReentrant whenNotPaused returns (uint256 amountA, uint256 amountB) {
        require(liquidity > 0, "DEXCore: liquidity is zero");

        bytes32 poolId = getPoolId(tokenA, tokenB);
        Pool storage pool = pools[poolId];
        require(pool.exists, "DEXCore: pool does not exist");

        uint256 amount0 = (liquidity * pool.reserveA) / pool.totalLiquidity;
        uint256 amount1 = (liquidity * pool.reserveB) / pool.totalLiquidity;

        require(amount0 > 0 && amount1 > 0, "DEXCore: insufficient liquidity burned");

        (amountA, amountB) = tokenA < tokenB
            ? (amount0, amount1)
            : (amount1, amount0);

        require(amountA >= minAmountA, "DEXCore: insufficient amountA");
        require(amountB >= minAmountB, "DEXCore: insufficient amountB");

        pool.reserveA -= amount0;
        pool.reserveB -= amount1;
        pool.totalLiquidity -= liquidity;

        LPToken(pool.lpToken).burn(msg.sender, liquidity);

        IERC20(pool.tokenA).safeTransfer(msg.sender, amount0);
        IERC20(pool.tokenB).safeTransfer(msg.sender, amount1);

        emit LiquidityRemoved(poolId, msg.sender, amount0, amount1, liquidity);
    }

    /**
     * @notice Обмінює один токен на інший
     * @param tokenIn Адреса токена для обміну
     * @param tokenOut Адреса токена для отримання
     * @param amountIn Кількість токенів для обміну
     * @param minAmountOut Мінімальна кількість токенів для отримання (slippage protection)
     * @return amountOut Кількість отриманих токенів
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        require(amountIn > 0, "DEXCore: amountIn is zero");
        require(tokenIn != tokenOut, "DEXCore: identical tokens");

        bytes32 poolId = getPoolId(tokenIn, tokenOut);
        Pool storage pool = pools[poolId];
        require(pool.exists, "DEXCore: pool does not exist");

        bool isTokenA = tokenIn < tokenOut;
        uint256 reserveIn = isTokenA ? pool.reserveA : pool.reserveB;
        uint256 reserveOut = isTokenA ? pool.reserveB : pool.reserveA;

        require(reserveIn > 0 && reserveOut > 0, "DEXCore: insufficient liquidity");

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - swapFee);
        amountOut = (reserveOut * amountInWithFee) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);

        require(amountOut > 0, "DEXCore: insufficient output amount");
        require(amountOut >= minAmountOut, "DEXCore: slippage exceeded");
        require(amountOut < reserveOut, "DEXCore: insufficient liquidity");

        if (isTokenA) {
            pool.reserveA += amountIn;
            pool.reserveB -= amountOut;
        } else {
            pool.reserveB += amountIn;
            pool.reserveA -= amountOut;
        }

        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        emit Swap(poolId, msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    /**
     * @notice Розраховує вихідну суму для обміну (для UI)
     * @param tokenIn Адреса токена для обміну
     * @param tokenOut Адреса токена для отримання
     * @param amountIn Кількість токенів для обміну
     * @return amountOut Очікувана кількість токенів для отримання
     */
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        require(amountIn > 0, "DEXCore: amountIn is zero");

        bytes32 poolId = getPoolId(tokenIn, tokenOut);
        Pool memory pool = pools[poolId];
        require(pool.exists, "DEXCore: pool does not exist");

        bool isTokenA = tokenIn < tokenOut;
        uint256 reserveIn = isTokenA ? pool.reserveA : pool.reserveB;
        uint256 reserveOut = isTokenA ? pool.reserveB : pool.reserveA;

        require(reserveIn > 0 && reserveOut > 0, "DEXCore: insufficient liquidity");

        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - swapFee);
        amountOut = (reserveOut * amountInWithFee) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
    }

    /**
     * @notice Оновлює комісію за обмін
     * @param newFee Нова комісія (у базисних пунктах, 30 = 0.3%)
     */
    function setSwapFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_SWAP_FEE, "DEXCore: fee too high");
        uint256 oldFee = swapFee;
        swapFee = newFee;
        emit SwapFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Призупиняє всі операції DEX
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Відновлює роботу DEX
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Отримує ID пулу для торгової пари
     * @param tokenA Адреса першого токена
     * @param tokenB Адреса другого токена
     * @return poolId Ідентифікатор пулу
     */
    function getPoolId(address tokenA, address tokenB) public pure returns (bytes32) {
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        return keccak256(abi.encodePacked(token0, token1));
    }

    /**
     * @notice Отримує інформацію про пул
     * @param tokenA Адреса першого токена
     * @param tokenB Адреса другого токена
     * @return pool Структура з даними пулу
     */
    function getPool(address tokenA, address tokenB) external view returns (Pool memory) {
        bytes32 poolId = getPoolId(tokenA, tokenB);
        return pools[poolId];
    }

    /**
     * @notice Отримує список всіх пулів
     * @return Масив ID пулів
     */
    function getAllPoolIds() external view returns (bytes32[] memory) {
        return poolIds;
    }

    /**
     * @notice Отримує кількість пулів
     * @return Кількість пулів
     */
    function getPoolCount() external view returns (uint256) {
        return poolIds.length;
    }

    /**
     * @notice Обчислює квадратний корінь (для розрахунку початкової ліквідності)
     * @param y Число
     * @return z Квадратний корінь
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
