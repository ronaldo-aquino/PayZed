// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PayZedFees is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    mapping(address => uint256) public accumulatedFees;
    mapping(address => uint256) public totalWithdrawn;
    mapping(address => bool) public allowedSources;

    event FeeCollected(
        address indexed sourceContract,
        address indexed tokenAddress,
        uint256 feeAmount
    );

    event FeesWithdrawn(
        address indexed tokenAddress,
        uint256 amount,
        address indexed recipient
    );

    event SourceContractUpdated(address indexed sourceContract, bool allowed);

    modifier onlyAllowedSource() {
        require(
            allowedSources[msg.sender],
            "Only allowed source contracts can collect fees"
        );
        _;
    }

    constructor() Ownable(msg.sender) {}

    function collectFee(
        address tokenAddress,
        uint256 feeAmount
    ) external nonReentrant onlyAllowedSource {
        require(tokenAddress != address(0), "Invalid token address");
        require(feeAmount > 0, "Fee amount must be greater than 0");

        IERC20 token = IERC20(tokenAddress);
        uint256 currentBalance = token.balanceOf(address(this));
        require(currentBalance >= accumulatedFees[tokenAddress] + feeAmount, "Insufficient balance");

        accumulatedFees[tokenAddress] += feeAmount;

        emit FeeCollected(msg.sender, tokenAddress, feeAmount);
    }

    function withdrawFees(
        address tokenAddress,
        address recipient
    ) external nonReentrant onlyOwner {
        require(recipient != address(0), "Invalid recipient address");
        require(tokenAddress != address(0), "Invalid token address");

        uint256 fees = accumulatedFees[tokenAddress];
        require(fees > 0, "No fees to withdraw");

        accumulatedFees[tokenAddress] = 0;
        totalWithdrawn[tokenAddress] += fees;

        IERC20 token = IERC20(tokenAddress);
        token.safeTransfer(recipient, fees);

        emit FeesWithdrawn(tokenAddress, fees, recipient);
    }

    function getAccumulatedFees(
        address tokenAddress
    ) external view returns (uint256) {
        return accumulatedFees[tokenAddress];
    }

    function getTotalWithdrawn(
        address tokenAddress
    ) external view returns (uint256) {
        return totalWithdrawn[tokenAddress];
    }

    function setAllowedSource(
        address sourceContract,
        bool allowed
    ) external onlyOwner {
        require(sourceContract != address(0), "Invalid source contract address");
        allowedSources[sourceContract] = allowed;
        emit SourceContractUpdated(sourceContract, allowed);
    }
}


