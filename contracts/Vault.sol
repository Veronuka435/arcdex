// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IFlashLoanReceiver {
    function executeOperation(
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata params
    ) external returns (bool);
}

contract Vault is ReentrancyGuard {
    address public immutable WETH;

    mapping(address => mapping(address => uint256)) private _balances;
    mapping(address => uint256) private _reserves;

    mapping(address => bool) public authorizedPools;
    address public governance;

    event Deposited(address indexed token, address indexed from, address indexed to, uint256 amount);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);
    event InternalTransfer(address indexed token, address indexed from, address indexed to, uint256 amount);
    event FlashLoan(address indexed receiver, address indexed token, uint256 amount, uint256 fee);
    event PoolAuthorized(address indexed pool, bool status);

    uint256 public constant FLASH_LOAN_FEE_BPS = 5;

    modifier onlyGovernance() {
        require(msg.sender == governance, "Vault: not governance");
        _;
    }

    constructor(address _weth) {
        WETH = _weth;
        governance = msg.sender;
    }

    function balanceOf(address token, address owner) external view returns (uint256) {
        return _balances[token][owner];
    }

    function reserves(address token) external view returns (uint256) {
        return _reserves[token];
    }

    function deposit(address token, address to, uint256 amount) external payable nonReentrant returns (uint256) {
        require(to != address(0), "Vault: zero address");

        uint256 actualAmount;

        if (token == address(0) || token == WETH) {
            actualAmount = msg.value;
            require(actualAmount > 0, "Vault: zero ETH");
        } else {
            require(amount > 0, "Vault: zero amount");
            uint256 balanceBefore = IERC20(token).balanceOf(address(this));
            IERC20(token).transferFrom(msg.sender, address(this), amount);
            actualAmount = IERC20(token).balanceOf(address(this)) - balanceBefore;
        }

        _balances[token][to] += actualAmount;
        _reserves[token] += actualAmount;

        emit Deposited(token, msg.sender, to, actualAmount);
        return actualAmount;
    }

    function internalTransfer(
        address token,
        address from,
        address to,
        uint256 amount
    ) external nonReentrant {
        require(_balances[token][from] >= amount, "Vault: insufficient balance");
        require(to != address(0), "Vault: zero address");

        _balances[token][from] -= amount;
        _balances[token][to] += amount;

        emit InternalTransfer(token, from, to, amount);
    }

    function withdraw(
        address token,
        address to,
        uint256 amount
    ) external nonReentrant {
        require(_balances[token][msg.sender] >= amount, "Vault: insufficient balance");
        require(to != address(0), "Vault: zero address");

        _balances[token][msg.sender] -= amount;
        _reserves[token] -= amount;

        if (token == address(0) || token == WETH) {
            payable(to).transfer(amount);
        } else {
            IERC20(token).transfer(to, amount);
        }

        emit Withdrawn(token, to, amount);
    }

    function flashLoan(
        address token,
        uint256 amount,
        bytes calldata params
    ) external nonReentrant {
        uint256 reserveBefore = _reserves[token];
        require(amount <= reserveBefore, "Vault: insufficient reserves");

        uint256 fee = (amount * FLASH_LOAN_FEE_BPS) / 10000;

        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(msg.sender, amount);

        require(
            IFlashLoanReceiver(msg.sender).executeOperation(token, amount, fee, params),
            "Vault: flash loan callback failed"
        );

        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        require(balanceAfter >= balanceBefore + fee, "Vault: flash loan not repaid");

        _reserves[token] += fee;

        emit FlashLoan(msg.sender, token, amount, fee);
    }

    function authorizePool(address pool, bool status) external onlyGovernance {
        authorizedPools[pool] = status;
        emit PoolAuthorized(pool, status);
    }

    function setGovernance(address newGovernance) external onlyGovernance {
        require(newGovernance != address(0), "Vault: zero address");
        governance = newGovernance;
    }

    receive() external payable {}
}
