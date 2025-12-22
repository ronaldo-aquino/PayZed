// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PayZedFees.sol";

contract PayZed is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    struct Invoice {
        address creator;
        address receiver;
        uint256 amount;
        address tokenAddress;
        InvoiceStatus status;
        uint256 createdAt;
        uint256 paidAt;
        uint256 expiresAt;
        uint256 feePaid;
        string paymentLink;
        string description;
    }

    enum InvoiceStatus {
        Pending,
        Paid,
        Expired,
        Cancelled
    }

    uint256 public constant FEE_RATE = 5;
    uint256 public constant FEE_DENOMINATOR = 10000;

    PayZedFees public feesContract;
    mapping(bytes32 => Invoice) public invoices;
    mapping(address => bytes32[]) public creatorInvoices;
    mapping(address => bool) public allowedTokens;

    event InvoiceCreated(
        bytes32 indexed invoiceId,
        address indexed creator,
        address indexed receiver,
        uint256 amount,
        address tokenAddress,
        uint256 expiresAt,
        string paymentLink,
        string description
    );

    event InvoicePaid(
        bytes32 indexed invoiceId,
        address indexed payer,
        address indexed receiver,
        uint256 amount,
        address tokenAddress
    );

    event InvoiceStatusUpdated(
        bytes32 indexed invoiceId,
        InvoiceStatus indexed newStatus
    );

    event FeeCollected(
        bytes32 indexed invoiceId,
        address indexed tokenAddress,
        uint256 feeAmount
    );

    event TokenWhitelistUpdated(address indexed tokenAddress, bool allowed);
    event FeesContractUpdated(address indexed feesContract);

    modifier onlyCreator(bytes32 invoiceId) {
        require(
            invoices[invoiceId].creator == msg.sender,
            "Only creator can perform this action"
        );
        _;
    }

    modifier validInvoice(bytes32 invoiceId) {
        require(
            invoices[invoiceId].creator != address(0),
            "Invoice does not exist"
        );
        _;
    }

    modifier validToken(address tokenAddress) {
        require(allowedTokens[tokenAddress], "Token not allowed");
        _;
    }

    constructor(address _feesContract) Ownable(msg.sender) {
        require(_feesContract != address(0), "Invalid fees contract address");
        feesContract = PayZedFees(_feesContract);
    }

    function createInvoice(
        bytes32 invoiceId,
        address receiver,
        uint256 amount,
        address tokenAddress,
        uint256 expiresAt,
        string memory paymentLink,
        string memory description
    ) external nonReentrant whenNotPaused validToken(tokenAddress) {
        require(receiver != address(0), "Invalid receiver address");
        require(amount > 0, "Amount must be greater than 0");
        require(
            invoices[invoiceId].creator == address(0),
            "Invoice ID already exists"
        );
        require(
            expiresAt == 0 || expiresAt > block.timestamp,
            "Invalid expiry time"
        );
        require(
            invoiceId != bytes32(0),
            "Invoice ID must be a cryptographic hash"
        );

        uint256 fee = (amount * FEE_RATE) / FEE_DENOMINATOR;

        if (fee > 0) {
            IERC20 token = IERC20(tokenAddress);
            uint256 allowance = token.allowance(msg.sender, address(this));
            require(allowance >= fee, "Insufficient token allowance for fee");

            uint256 balance = token.balanceOf(msg.sender);
            require(balance >= fee, "Insufficient token balance for fee");

            token.safeTransferFrom(msg.sender, address(this), fee);
            token.safeTransfer(address(feesContract), fee);
            feesContract.collectFee(tokenAddress, fee);

            emit FeeCollected(invoiceId, tokenAddress, fee);
        }

        invoices[invoiceId] = Invoice({
            creator: msg.sender,
            receiver: receiver,
            amount: amount,
            tokenAddress: tokenAddress,
            status: InvoiceStatus.Pending,
            createdAt: block.timestamp,
            paidAt: 0,
            expiresAt: expiresAt,
            feePaid: fee,
            paymentLink: paymentLink,
            description: description
        });

        creatorInvoices[msg.sender].push(invoiceId);

        emit InvoiceCreated(
            invoiceId,
            msg.sender,
            receiver,
            amount,
            tokenAddress,
            expiresAt,
            paymentLink,
            description
        );
    }

    function payInvoice(bytes32 invoiceId)
        external
        nonReentrant
        whenNotPaused
        validInvoice(invoiceId)
    {
        Invoice storage invoice = invoices[invoiceId];

        require(
            invoice.status == InvoiceStatus.Pending,
            "Invoice is not pending"
        );
        require(
            invoice.receiver != address(0),
            "Invalid receiver address"
        );

        if (invoice.expiresAt > 0 && block.timestamp > invoice.expiresAt) {
            invoice.status = InvoiceStatus.Expired;
            emit InvoiceStatusUpdated(invoiceId, InvoiceStatus.Expired);
            revert("Invoice has expired");
        }

        IERC20 token = IERC20(invoice.tokenAddress);
        uint256 allowance = token.allowance(msg.sender, address(this));
        require(allowance >= invoice.amount, "Insufficient allowance");
        token.safeTransferFrom(msg.sender, invoice.receiver, invoice.amount);

        invoice.status = InvoiceStatus.Paid;
        invoice.paidAt = block.timestamp;

        emit InvoicePaid(
            invoiceId,
            msg.sender,
            invoice.receiver,
            invoice.amount,
            invoice.tokenAddress
        );
        emit InvoiceStatusUpdated(invoiceId, InvoiceStatus.Paid);
    }

    function getInvoice(bytes32 invoiceId)
        external
        view
        validInvoice(invoiceId)
        returns (Invoice memory)
    {
        return invoices[invoiceId];
    }

    function getCreatorInvoices(address creator)
        external
        view
        returns (bytes32[] memory)
    {
        return creatorInvoices[creator];
    }

    function cancelInvoice(bytes32 invoiceId)
        external
        validInvoice(invoiceId)
        onlyCreator(invoiceId)
    {
        Invoice storage invoice = invoices[invoiceId];
        require(
            invoice.status == InvoiceStatus.Pending,
            "Can only cancel pending invoices"
        );

        invoice.status = InvoiceStatus.Cancelled;
        emit InvoiceStatusUpdated(invoiceId, InvoiceStatus.Cancelled);
    }

    function expireInvoice(bytes32 invoiceId)
        external
        validInvoice(invoiceId)
    {
        Invoice storage invoice = invoices[invoiceId];
        require(
            invoice.status == InvoiceStatus.Pending,
            "Can only expire pending invoices"
        );
        require(
            invoice.expiresAt > 0 && block.timestamp > invoice.expiresAt,
            "Invoice has not expired yet"
        );

        invoice.status = InvoiceStatus.Expired;
        emit InvoiceStatusUpdated(invoiceId, InvoiceStatus.Expired);
    }

    function setFeesContract(address _feesContract) external onlyOwner {
        require(_feesContract != address(0), "Invalid fees contract address");
        feesContract = PayZedFees(_feesContract);
        emit FeesContractUpdated(_feesContract);
    }

    function getAccumulatedFees(address tokenAddress)
        external
        view
        returns (uint256)
    {
        return feesContract.getAccumulatedFees(tokenAddress);
    }

    function setAllowedToken(address tokenAddress, bool allowed)
        external
        onlyOwner
    {
        allowedTokens[tokenAddress] = allowed;
        emit TokenWhitelistUpdated(tokenAddress, allowed);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}


