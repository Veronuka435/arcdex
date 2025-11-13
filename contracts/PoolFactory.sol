// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ClassicPool.sol";

contract PoolFactory {
    address public immutable vault;
    address public feeRecipient;
    address public governance;

    uint24 public defaultSwapFee = 30;
    uint24 public defaultProtocolFee = 5;

    mapping(address => mapping(address => address)) public getPool;
    address[] public allPools;

    event PoolCreated(
        address indexed token0,
        address indexed token1,
        address pool,
        uint256 poolCount
    );
    event FeeUpdated(uint24 swapFee, uint24 protocolFee);

    modifier onlyGovernance() {
        require(msg.sender == governance, "Factory: not governance");
        _;
    }

    constructor(address _vault) {
        require(_vault != address(0), "Factory: zero vault address");
        vault = _vault;
        governance = msg.sender;
        feeRecipient = msg.sender;
    }

    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }

    function createPool(
        address tokenA,
        address tokenB
    ) external returns (address pool) {
        require(tokenA != tokenB, "Factory: identical tokens");
        require(tokenA != address(0) && tokenB != address(0), "Factory: zero address");

        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        require(getPool[token0][token1] == address(0), "Factory: pool exists");

        ClassicPool newPool = new ClassicPool(
            vault,
            token0,
            token1,
            defaultSwapFee,
            defaultProtocolFee
        );

        pool = address(newPool);

        getPool[token0][token1] = pool;
        getPool[token1][token0] = pool;
        allPools.push(pool);

        emit PoolCreated(token0, token1, pool, allPools.length);
    }

    function createPoolWithFees(
        address tokenA,
        address tokenB,
        uint24 swapFee,
        uint24 protocolFee
    ) external onlyGovernance returns (address pool) {
        require(tokenA != tokenB, "Factory: identical tokens");
        require(tokenA != address(0) && tokenB != address(0), "Factory: zero address");
        require(swapFee <= 1000, "Factory: fee too high");
        require(protocolFee <= 1000, "Factory: protocol fee too high");

        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        require(getPool[token0][token1] == address(0), "Factory: pool exists");

        ClassicPool newPool = new ClassicPool(
            vault,
            token0,
            token1,
            swapFee,
            protocolFee
        );

        pool = address(newPool);

        getPool[token0][token1] = pool;
        getPool[token1][token0] = pool;
        allPools.push(pool);

        emit PoolCreated(token0, token1, pool, allPools.length);
    }

    function setDefaultFees(uint24 _swapFee, uint24 _protocolFee) external onlyGovernance {
        require(_swapFee <= 1000, "Factory: swap fee too high");
        require(_protocolFee <= 1000, "Factory: protocol fee too high");

        defaultSwapFee = _swapFee;
        defaultProtocolFee = _protocolFee;

        emit FeeUpdated(_swapFee, _protocolFee);
    }

    function setFeeRecipient(address _feeRecipient) external onlyGovernance {
        require(_feeRecipient != address(0), "Factory: zero address");
        feeRecipient = _feeRecipient;
    }

    function setGovernance(address _governance) external onlyGovernance {
        require(_governance != address(0), "Factory: zero address");
        governance = _governance;
    }
}
