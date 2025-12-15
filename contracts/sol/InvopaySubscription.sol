// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract InvopaySubscription is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    struct Subscription {
        address creator;
        address receiver;
        address payer;
        uint256 amount;
        address tokenAddress;
        uint256 period;
        uint256 nextPaymentDue;
        uint256 pausedAt;
        SubscriptionStatus status;
        uint256 createdAt;
        uint256 totalPayments;
        string description;
    }

    enum SubscriptionStatus {
        Pending,
        Active,
        CancelledByCreator,
        CancelledByPayer,
        Paused
    }

    uint256 public constant CREATION_FEE_RATE = 5;
    uint256 public constant RENEWAL_FEE_RATE = 5;
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MINIMUM_PERIOD = 1 days;
    uint256 public constant MAX_AMOUNT = 1000000000 * 1e6;

    mapping(bytes32 => Subscription) public subscriptions;
    mapping(address => bytes32[]) public creatorSubscriptions;
    mapping(address => bytes32[]) public payerSubscriptions;
    mapping(address => uint256) public accumulatedFees;
    mapping(address => bool) public allowedTokens;
    mapping(address => uint256) public creatorNonces;

    event SubscriptionCreated(
        bytes32 indexed subscriptionId,
        address indexed creator,
        address indexed receiver,
        address payer,
        uint256 amount,
        address tokenAddress,
        uint256 period,
        uint256 nextPaymentDue,
        string description
    );

    event SubscriptionPaid(
        bytes32 indexed subscriptionId,
        address indexed payer,
        address indexed receiver,
        uint256 amount,
        address tokenAddress,
        uint256 nextPaymentDue,
        uint256 totalPayments
    );

    event SubscriptionCancelledByCreator(
        bytes32 indexed subscriptionId,
        address indexed creator,
        address indexed payer
    );

    event SubscriptionCancelledByPayer(
        bytes32 indexed subscriptionId,
        address indexed payer,
        address indexed creator
    );

    event SubscriptionPaused(
        bytes32 indexed subscriptionId,
        address indexed creator,
        uint256 pausedAt
    );

    event SubscriptionResumed(
        bytes32 indexed subscriptionId,
        address indexed creator,
        uint256 newNextPaymentDue
    );

    event FeeCollected(
        bytes32 indexed subscriptionId,
        address indexed tokenAddress,
        uint256 feeAmount,
        bool isCreationFee
    );

    modifier validToken(address tokenAddress) {
        require(allowedTokens[tokenAddress], "Token not allowed");
        _;
    }

    modifier validSubscription(bytes32 subscriptionId) {
        require(
            subscriptions[subscriptionId].creator != address(0),
            "Subscription does not exist"
        );
        _;
    }

    modifier onlyCreator(bytes32 subscriptionId) {
        require(
            subscriptions[subscriptionId].creator == msg.sender,
            "Only creator can perform this action"
        );
        _;
    }

    modifier onlyPayer(bytes32 subscriptionId) {
        Subscription storage sub = subscriptions[subscriptionId];
        require(
            sub.payer == msg.sender && sub.payer != address(0),
            "Only payer can perform this action"
        );
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setAllowedToken(address tokenAddress, bool allowed) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        allowedTokens[tokenAddress] = allowed;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function createSubscription(
        address receiver,
        address payer,
        uint256 amount,
        address tokenAddress,
        uint256 period,
        string memory description
    ) external nonReentrant whenNotPaused validToken(tokenAddress) returns (bytes32) {
        require(receiver != address(0), "Invalid receiver address");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= MAX_AMOUNT, "Amount exceeds maximum");
        require(period >= MINIMUM_PERIOD, "Period below minimum");

        bytes32 subscriptionId = keccak256(
            abi.encodePacked(
                msg.sender,
                payer,
                receiver,
                amount,
                tokenAddress,
                period,
                creatorNonces[msg.sender],
                block.timestamp
            )
        );

        require(
            subscriptions[subscriptionId].creator == address(0),
            "Subscription ID collision"
        );

        creatorNonces[msg.sender] += 1;

        uint256 creationFee = (amount * CREATION_FEE_RATE) / FEE_DENOMINATOR;

        if (creationFee > 0) {
            IERC20 token = IERC20(tokenAddress);
            uint256 allowance = token.allowance(msg.sender, address(this));
            require(allowance >= creationFee, "Insufficient token allowance for creation fee");

            uint256 balance = token.balanceOf(msg.sender);
            require(balance >= creationFee, "Insufficient token balance for creation fee");

            token.safeTransferFrom(msg.sender, address(this), creationFee);
            accumulatedFees[tokenAddress] += creationFee;

            emit FeeCollected(subscriptionId, tokenAddress, creationFee, true);
        }

        uint256 nextPaymentDue = block.timestamp + period;

        subscriptions[subscriptionId] = Subscription({
            creator: msg.sender,
            receiver: receiver,
            payer: payer,
            amount: amount,
            tokenAddress: tokenAddress,
            period: period,
            nextPaymentDue: nextPaymentDue,
            pausedAt: 0,
            status: SubscriptionStatus.Pending,
            createdAt: block.timestamp,
            totalPayments: 0,
            description: description
        });

        creatorSubscriptions[msg.sender].push(subscriptionId);
        if (payer != address(0)) {
            payerSubscriptions[payer].push(subscriptionId);
        }

        emit SubscriptionCreated(
            subscriptionId,
            msg.sender,
            receiver,
            payer,
            amount,
            tokenAddress,
            period,
            nextPaymentDue,
            description
        );

        return subscriptionId;
    }

    function paySubscription(bytes32 subscriptionId)
        external
        nonReentrant
        whenNotPaused
        validSubscription(subscriptionId)
    {
        Subscription storage subscription = subscriptions[subscriptionId];

        require(
            subscription.status == SubscriptionStatus.Pending ||
            subscription.status == SubscriptionStatus.Active,
            "Subscription is not active or pending"
        );
        require(
            subscription.receiver != address(0),
            "Invalid receiver address"
        );
        
        // For pending subscriptions, allow payment immediately (first payment)
        // For active subscriptions, check if payment is due
        if (subscription.status == SubscriptionStatus.Active) {
            require(
                block.timestamp >= subscription.nextPaymentDue,
                "Payment not due yet"
            );
        }

        bool isFirstPayment = subscription.payer == address(0);
        
        if (isFirstPayment) {
            subscription.payer = msg.sender;
            payerSubscriptions[msg.sender].push(subscriptionId);
            // Activate subscription on first payment
            subscription.status = SubscriptionStatus.Active;
            // Recalculate next payment from now (when it becomes active)
            subscription.nextPaymentDue = block.timestamp + subscription.period;
        } else {
            require(
                subscription.payer == msg.sender,
                "Only designated payer can pay"
            );
            // For subsequent payments, calculate from current time
            subscription.nextPaymentDue = block.timestamp + subscription.period;
        }

        uint256 renewalFee = (subscription.amount * RENEWAL_FEE_RATE) / FEE_DENOMINATOR;
        uint256 totalAmount = subscription.amount + renewalFee;

        IERC20 token = IERC20(subscription.tokenAddress);
        uint256 allowance = token.allowance(msg.sender, address(this));
        require(allowance >= totalAmount, "Insufficient token allowance");

        uint256 balance = token.balanceOf(msg.sender);
        require(balance >= totalAmount, "Insufficient token balance");

        token.safeTransferFrom(msg.sender, subscription.receiver, subscription.amount);

        if (renewalFee > 0) {
            token.safeTransferFrom(msg.sender, address(this), renewalFee);
            accumulatedFees[subscription.tokenAddress] += renewalFee;

            emit FeeCollected(subscriptionId, subscription.tokenAddress, renewalFee, false);
        }

        subscription.totalPayments += 1;

        emit SubscriptionPaid(
            subscriptionId,
            msg.sender,
            subscription.receiver,
            subscription.amount,
            subscription.tokenAddress,
            subscription.nextPaymentDue,
            subscription.totalPayments
        );
    }

    function cancelByCreator(bytes32 subscriptionId)
        external
        nonReentrant
        validSubscription(subscriptionId)
        onlyCreator(subscriptionId)
    {
        Subscription storage subscription = subscriptions[subscriptionId];

        require(
            subscription.status == SubscriptionStatus.Pending ||
            subscription.status == SubscriptionStatus.Active ||
            subscription.status == SubscriptionStatus.Paused,
            "Subscription cannot be cancelled"
        );

        subscription.status = SubscriptionStatus.CancelledByCreator;

        emit SubscriptionCancelledByCreator(
            subscriptionId,
            msg.sender,
            subscription.payer
        );
    }

    function cancelByPayer(bytes32 subscriptionId)
        external
        nonReentrant
        validSubscription(subscriptionId)
    {
        Subscription storage subscription = subscriptions[subscriptionId];

        // Payer can only cancel after first payment (when subscription is Active or Paused)
        require(
            subscription.status == SubscriptionStatus.Active ||
            subscription.status == SubscriptionStatus.Paused,
            "Subscription cannot be cancelled by payer"
        );
        require(
            subscription.payer == msg.sender && subscription.payer != address(0),
            "Only payer can cancel"
        );

        subscription.status = SubscriptionStatus.CancelledByPayer;

        emit SubscriptionCancelledByPayer(
            subscriptionId,
            msg.sender,
            subscription.creator
        );
    }

    function pauseSubscription(bytes32 subscriptionId)
        external
        nonReentrant
        validSubscription(subscriptionId)
        onlyCreator(subscriptionId)
    {
        Subscription storage subscription = subscriptions[subscriptionId];

        require(
            subscription.status == SubscriptionStatus.Active,
            "Subscription must be active to pause"
        );

        subscription.status = SubscriptionStatus.Paused;
        subscription.pausedAt = block.timestamp;

        emit SubscriptionPaused(subscriptionId, msg.sender, block.timestamp);
    }

    function resumeSubscription(bytes32 subscriptionId)
        external
        nonReentrant
        validSubscription(subscriptionId)
        onlyCreator(subscriptionId)
    {
        Subscription storage subscription = subscriptions[subscriptionId];

        require(
            subscription.status == SubscriptionStatus.Paused,
            "Subscription must be paused to resume"
        );

        uint256 timePaused = block.timestamp - subscription.pausedAt;
        subscription.nextPaymentDue = subscription.nextPaymentDue + timePaused;

        subscription.status = SubscriptionStatus.Active;
        subscription.pausedAt = 0;

        emit SubscriptionResumed(subscriptionId, msg.sender, subscription.nextPaymentDue);
    }

    function getSubscription(bytes32 subscriptionId)
        external
        view
        validSubscription(subscriptionId)
        returns (Subscription memory)
    {
        return subscriptions[subscriptionId];
    }

    function getCreatorSubscriptions(address creator)
        external
        view
        returns (bytes32[] memory)
    {
        return creatorSubscriptions[creator];
    }

    function getPayerSubscriptions(address payer)
        external
        view
        returns (bytes32[] memory)
    {
        return payerSubscriptions[payer];
    }

    function withdrawFees(address tokenAddress, address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient address");
        require(allowedTokens[tokenAddress], "Token not allowed");

        uint256 amount = accumulatedFees[tokenAddress];
        require(amount > 0, "No fees to withdraw");

        accumulatedFees[tokenAddress] = 0;

        IERC20(tokenAddress).safeTransfer(recipient, amount);
    }
}
