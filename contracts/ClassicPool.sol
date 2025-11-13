// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IVault {
    function balanceOf(address token, address owner) external view returns (uint256);
    function internalTransfer(address token, address from, address to, uint256 amount) external;
    function withdraw(address token, address to, uint256 amount) external;
}

contract ClassicPool is ERC20, ReentrancyGuard {
    IVault public immutable vault;
    address public immutable token0;
    address public immutable token1;

    uint256 public reserve0;
    uint256 public reserve1;

    uint24 public swapFee;
    uint24 public protocolFee;

    address public factory;
    address public feeRecipient;

    uint256 private constant MINIMUM_LIQUIDITY = 1000;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint256 reserve0, uint256 reserve1);

    constructor(
        address _vault,
        address _token0,
        address _token1,
        uint24 _swapFee,
        uint24 _protocolFee
    ) ERC20("Arc LP Token", "ARC-LP") {
        require(_token0 != _token1, "Pool: identical tokens");
        require(_token0 != address(0) && _token1 != address(0), "Pool: zero address");

        vault = IVault(_vault);
        token0 = _token0;
        token1 = _token1;
        swapFee = _swapFee;
        protocolFee = _protocolFee;
        factory = msg.sender;
        feeRecipient = msg.sender;
    }

    function getReserves() external view returns (uint256 _reserve0, uint256 _reserve1) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
    }

    function getAmountOut(address tokenIn, uint256 amountIn) public view returns (uint256 amountOut) {
        require(tokenIn == token0 || tokenIn == token1, "Pool: invalid token");
        require(amountIn > 0, "Pool: insufficient input");

        bool isToken0 = (tokenIn == token0);
        (uint256 reserveIn, uint256 reserveOut) = isToken0 ? (reserve0, reserve1) : (reserve1, reserve0);

        require(reserveIn > 0 && reserveOut > 0, "Pool: insufficient liquidity");

        uint256 amountInWithFee = amountIn * (10000 - swapFee);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 10000) + amountInWithFee;

        amountOut = numerator / denominator;
    }

    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        (uint256 _reserve0, uint256 _reserve1) = (reserve0, reserve1);

        uint256 balance0 = vault.balanceOf(token0, address(this));
        uint256 balance1 = vault.balanceOf(token1, address(this));

        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        uint256 _totalSupply = totalSupply();

        if (_totalSupply == 0) {
            liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(1), MINIMUM_LIQUIDITY);
        } else {
            liquidity = min((amount0 * _totalSupply) / _reserve0, (amount1 * _totalSupply) / _reserve1);
        }

        require(liquidity > 0, "Pool: insufficient liquidity minted");

        _mint(to, liquidity);
        _update(balance0, balance1);

        emit Mint(msg.sender, amount0, amount1, to);
    }

    function burn(address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        uint256 liquidity = balanceOf(address(this));
        uint256 _totalSupply = totalSupply();

        amount0 = (liquidity * reserve0) / _totalSupply;
        amount1 = (liquidity * reserve1) / _totalSupply;

        require(amount0 > 0 && amount1 > 0, "Pool: insufficient liquidity burned");

        _burn(address(this), liquidity);

        vault.withdraw(token0, to, amount0);
        vault.withdraw(token1, to, amount1);

        uint256 balance0 = vault.balanceOf(token0, address(this));
        uint256 balance1 = vault.balanceOf(token1, address(this));

        _update(balance0, balance1);

        emit Burn(msg.sender, amount0, amount1, to);
    }

    function swap(
        address tokenIn,
        address to,
        uint8 withdrawMode
    ) external nonReentrant returns (uint256 amountOut) {
        require(tokenIn == token0 || tokenIn == token1, "Pool: invalid token");
        require(to != address(0), "Pool: invalid recipient");

        bool isToken0 = (tokenIn == token0);
        address tokenOut = isToken0 ? token1 : token0;

        uint256 amountIn = vault.balanceOf(tokenIn, msg.sender);
        require(amountIn > 0, "Pool: zero input amount");

        vault.internalTransfer(tokenIn, msg.sender, address(this), amountIn);

        amountOut = getAmountOut(tokenIn, amountIn);
        require(amountOut > 0, "Pool: insufficient output amount");

        if (withdrawMode == 0) {
            vault.internalTransfer(tokenOut, address(this), to, amountOut);
        } else {
            vault.withdraw(tokenOut, to, amountOut);
        }

        uint256 balance0 = vault.balanceOf(token0, address(this));
        uint256 balance1 = vault.balanceOf(token1, address(this));

        _update(balance0, balance1);

        emit Swap(
            msg.sender,
            isToken0 ? amountIn : 0,
            isToken0 ? 0 : amountIn,
            isToken0 ? 0 : amountOut,
            isToken0 ? amountOut : 0,
            to
        );
    }

    function _update(uint256 balance0, uint256 balance1) private {
        reserve0 = balance0;
        reserve1 = balance1;
        emit Sync(reserve0, reserve1);
    }

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

    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }

    function setFeeRecipient(address _feeRecipient) external {
        require(msg.sender == factory, "Pool: forbidden");
        feeRecipient = _feeRecipient;
    }
}
