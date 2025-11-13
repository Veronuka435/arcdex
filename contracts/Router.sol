// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IVault {
    function deposit(address token, address to, uint256 amount) external payable returns (uint256);
    function withdraw(address token, address to, uint256 amount) external;
    function balanceOf(address token, address owner) external view returns (uint256);
    function internalTransfer(address token, address from, address to, uint256 amount) external;
}

interface IClassicPool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function swap(address tokenIn, address to, uint8 withdrawMode) external returns (uint256);
    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256);
    function mint(address to) external returns (uint256);
}

interface IPoolFactory {
    function getPool(address tokenA, address tokenB) external view returns (address);
}

contract Router is ReentrancyGuard {
    IVault public immutable vault;
    IPoolFactory public immutable factory;
    address public immutable WETH;

    event SwapExecuted(
        address indexed user,
        address indexed pool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address to
    );

    event LiquidityAdded(
        address indexed user,
        address indexed pool,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidity
    );

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "Router: expired");
        _;
    }

    constructor(address _vault, address _factory, address _weth) {
        require(_vault != address(0), "Router: zero vault");
        require(_factory != address(0), "Router: zero factory");
        require(_weth != address(0), "Router: zero weth");

        vault = IVault(_vault);
        factory = IPoolFactory(_factory);
        WETH = _weth;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) nonReentrant returns (uint256[] memory amounts) {
        require(path.length >= 2, "Router: invalid path");
        require(to != address(0), "Router: zero address");

        amounts = new uint256[](path.length);
        amounts[0] = amountIn;

        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IERC20(path[0]).approve(address(vault), amountIn);

        vault.deposit(path[0], msg.sender, amountIn);

        for (uint256 i = 0; i < path.length - 1; i++) {
            address pool = factory.getPool(path[i], path[i + 1]);
            require(pool != address(0), "Router: pool not found");

            uint256 amountOut = IClassicPool(pool).swap(
                path[i],
                i == path.length - 2 ? to : msg.sender,
                i == path.length - 2 ? uint8(1) : uint8(0)
            );

            amounts[i + 1] = amountOut;
        }

        require(amounts[amounts.length - 1] >= amountOutMin, "Router: insufficient output");

        emit SwapExecuted(
            msg.sender,
            factory.getPool(path[0], path[1]),
            path[0],
            path[path.length - 1],
            amountIn,
            amounts[amounts.length - 1],
            to
        );

        return amounts;
    }

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) nonReentrant returns (uint256[] memory amounts) {
        require(path.length >= 2, "Router: invalid path");
        require(path[0] == WETH, "Router: invalid path");
        require(to != address(0), "Router: zero address");

        amounts = new uint256[](path.length);
        amounts[0] = msg.value;

        vault.deposit{value: msg.value}(WETH, msg.sender, 0);

        for (uint256 i = 0; i < path.length - 1; i++) {
            address pool = factory.getPool(path[i], path[i + 1]);
            require(pool != address(0), "Router: pool not found");

            uint256 amountOut = IClassicPool(pool).swap(
                path[i],
                i == path.length - 2 ? to : msg.sender,
                i == path.length - 2 ? uint8(1) : uint8(0)
            );

            amounts[i + 1] = amountOut;
        }

        require(amounts[amounts.length - 1] >= amountOutMin, "Router: insufficient output");

        emit SwapExecuted(
            msg.sender,
            factory.getPool(path[0], path[1]),
            path[0],
            path[path.length - 1],
            msg.value,
            amounts[amounts.length - 1],
            to
        );

        return amounts;
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        ensure(deadline)
        nonReentrant
        returns (uint256 amountA, uint256 amountB, uint256 liquidity)
    {
        address pool = factory.getPool(tokenA, tokenB);
        require(pool != address(0), "Router: pool not found");

        (amountA, amountB) = _calculateOptimalAmounts(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );

        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

        IERC20(tokenA).approve(address(vault), amountA);
        IERC20(tokenB).approve(address(vault), amountB);

        vault.deposit(tokenA, pool, amountA);
        vault.deposit(tokenB, pool, amountB);

        liquidity = IClassicPool(pool).mint(to);

        emit LiquidityAdded(msg.sender, pool, amountA, amountB, liquidity);
    }

    function _calculateOptimalAmounts(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) private view returns (uint256 amountA, uint256 amountB) {
        amountA = amountADesired;
        amountB = amountBDesired;

        require(amountA >= amountAMin, "Router: insufficient A amount");
        require(amountB >= amountBMin, "Router: insufficient B amount");
    }

    function getAmountOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts) {
        require(path.length >= 2, "Router: invalid path");

        amounts = new uint256[](path.length);
        amounts[0] = amountIn;

        for (uint256 i = 0; i < path.length - 1; i++) {
            address pool = factory.getPool(path[i], path[i + 1]);
            require(pool != address(0), "Router: pool not found");

            amounts[i + 1] = IClassicPool(pool).getAmountOut(path[i], amounts[i]);
        }

        return amounts;
    }

    receive() external payable {
        require(msg.sender == WETH, "Router: not WETH");
    }
}
