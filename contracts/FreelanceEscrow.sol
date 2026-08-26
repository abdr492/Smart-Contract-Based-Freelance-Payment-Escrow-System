// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FreelanceEscrow
 * @author Freelance Payment Escrow Platform (EtherTrust)
 * @notice Trust-minimized, milestone-driven escrow smart contract for freelance job payments,
 *         supporting multi-sig milestone approvals, client refunds, and binding arbitrator dispute resolution.
 *
 * @dev SECURITY & INVARIANTS:
 *      1. All ETH funds deposited by clients are locked directly in the smart contract balance.
 *      2. Reentrancy Protection: All ETH transfers strictly implement the Checks-Effects-Interactions (CEI) pattern.
 *      3. Funds can only be released upon explicit milestone approval, mutual cancellation refund, or arbitrator ruling.
 */
contract FreelanceEscrow {

    // =========================================================================
    // ENUMS
    // =========================================================================

    /// @notice Overall lifecycle state of an escrow contract
    enum EscrowState {
        CREATED,      // Contract created by client, awaiting deposit
        FUNDED,       // Client deposited ETH, awaiting freelancer confirmation
        IN_PROGRESS,  // Freelancer accepted and active work ongoing
        SUBMITTED,    // Deliverables submitted for approval
        COMPLETED,    // All milestones approved and funds fully released
        DISPUTED,     // Escalated to arbitrator for formal dispute resolution
        REFUNDED,     // Cancelled and unreleased funds refunded to client
        RESOLVED      // Dispute settled by arbitrator ruling
    }

    /// @notice Lifecycle state of individual milestones
    enum MilestoneState {
        PENDING,      // Created, waiting for escrow funding
        FUNDED,       // Escrow funded, milestone active
        IN_PROGRESS,  // Freelancer working on milestone
        SUBMITTED,    // Deliverable submitted, waiting for client approval
        APPROVED,     // Client approved deliverable
        DISPUTED,     // Milestone contested in dispute
        RELEASED      // Funds released to freelancer
    }

    // =========================================================================
    // STRUCTS
    // =========================================================================

    /// @notice Individual milestone within an escrow project
    struct Milestone {
        uint256        milestoneId;
        uint256        escrowId;
        string         description;
        uint256        amountWei;
        MilestoneState state;
        string         deliverableURI; // IPFS CID or deliverable link
        uint256        submittedAt;
        uint256        approvedAt;
    }

    /// @notice Escrow project entity
    struct EscrowContract {
        uint256     escrowId;
        address     client;
        address     freelancer;
        address     arbitrator;
        string      title;
        uint256     totalAmountWei;
        uint256     releasedAmountWei;
        EscrowState state;
        uint256     createdAt;
        uint256     fundedAt;
        uint256     completedAt;
    }

    /// @notice Dispute resolution record
    struct Dispute {
        uint256 disputeId;
        uint256 escrowId;
        address raisedBy;
        string  reason;
        string  evidenceURI;
        uint256 clientSharePct;     // 0 - 100 percentage assigned to client
        uint256 freelancerSharePct; // 0 - 100 percentage assigned to freelancer
        uint256 resolvedAt;
        bool    isResolved;
    }

    // =========================================================================
    // STATE VARIABLES
    // =========================================================================

    address public immutable defaultArbitrator;
    uint256 private _nextEscrowId;
    uint256 private _nextDisputeId;

    /// @notice Mapping of Escrow ID => EscrowContract struct
    mapping(uint256 => EscrowContract) public escrows;

    /// @notice Mapping of Escrow ID => array of Milestones
    mapping(uint256 => Milestone[]) private _escrowMilestones;

    /// @notice Mapping of Escrow ID => Dispute record
    mapping(uint256 => Dispute) public disputes;

    /// @notice Array of Escrow IDs created by a client address
    mapping(address => uint256[]) private _clientEscrowIds;

    /// @notice Array of Escrow IDs assigned to a freelancer address
    mapping(address => uint256[]) private _freelancerEscrowIds;

    /// @notice Reentrancy lock state variable
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    /// @notice Platform aggregate metrics
    uint256 public totalEscrowsCreated;
    uint256 public totalEthVolumeWei;
    uint256 public totalDisputesRaised;
    uint256 public totalDisputesResolved;

    // =========================================================================
    // EVENTS
    // =========================================================================

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed client,
        address indexed freelancer,
        address arbitrator,
        string title,
        uint256 totalAmountWei,
        uint256 timestamp
    );
    event FundsDeposited(uint256 indexed escrowId, address indexed client, uint256 amountWei, uint256 timestamp);
    event WorkStarted(uint256 indexed escrowId, address indexed freelancer, uint256 timestamp);
    event WorkSubmitted(
        uint256 indexed escrowId,
        uint256 indexed milestoneId,
        address indexed freelancer,
        string deliverableURI,
        uint256 timestamp
    );
    event PaymentReleased(
        uint256 indexed escrowId,
        uint256 indexed milestoneId,
        address indexed freelancer,
        uint256 amountWei,
        uint256 timestamp
    );
    event RefundIssued(uint256 indexed escrowId, address indexed client, uint256 amountWei, uint256 timestamp);
    event DisputeRaised(uint256 indexed escrowId, uint256 indexed disputeId, address indexed raisedBy, string reason, uint256 timestamp);
    event DisputeResolved(
        uint256 indexed escrowId,
        uint256 indexed disputeId,
        address indexed arbitrator,
        uint256 clientRefundWei,
        uint256 freelancerPayoutWei,
        uint256 timestamp
    );

    // =========================================================================
    // MODIFIERS
    // =========================================================================

    modifier nonReentrant() {
        require(_status != _ENTERED, "FreelanceEscrow: reentrancy guard locked");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    modifier onlyClient(uint256 _escrowId) {
        require(msg.sender == escrows[_escrowId].client, "FreelanceEscrow: caller is not project client");
        _;
    }

    modifier onlyFreelancer(uint256 _escrowId) {
        require(msg.sender == escrows[_escrowId].freelancer, "FreelanceEscrow: caller is not assigned freelancer");
        _;
    }

    modifier onlyArbitrator(uint256 _escrowId) {
        require(
            msg.sender == escrows[_escrowId].arbitrator || msg.sender == defaultArbitrator,
            "FreelanceEscrow: caller is not designated arbitrator"
        );
        _;
    }

    modifier inState(uint256 _escrowId, EscrowState _requiredState) {
        require(escrows[_escrowId].state == _requiredState, "FreelanceEscrow: invalid escrow state for operation");
        _;
    }

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    constructor() {
        defaultArbitrator = msg.sender;
        _nextEscrowId = 1;
        _nextDisputeId = 1;
        _status = _NOT_ENTERED;
    }

    // =========================================================================
    // ESCROW CREATION & FUNDING
    // =========================================================================

    /**
     * @notice Client creates a new multi-milestone freelance payment escrow contract
     */
    function createEscrow(
        address _freelancer,
        address _arbitrator,
        string calldata _title,
        string[] calldata _milestoneDescriptions,
        uint256[] calldata _milestoneAmounts
    ) external returns (uint256 escrowId) {
        require(_freelancer != address(0), "FreelanceEscrow: invalid freelancer address");
        require(_freelancer != msg.sender, "FreelanceEscrow: client and freelancer must be distinct addresses");
        require(bytes(_title).length > 0, "FreelanceEscrow: project title required");
        require(
            _milestoneDescriptions.length > 0 && _milestoneDescriptions.length == _milestoneAmounts.length,
            "FreelanceEscrow: milestone count mismatch"
        );

        address designatedArbiter = _arbitrator != address(0) ? _arbitrator : defaultArbitrator;
        escrowId = _nextEscrowId++;

        uint256 totalBudget = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "FreelanceEscrow: milestone amount must be positive");
            totalBudget += _milestoneAmounts[i];

            _escrowMilestones[escrowId].push(Milestone({
                milestoneId:    i + 1,
                escrowId:       escrowId,
                description:    _milestoneDescriptions[i],
                amountWei:      _milestoneAmounts[i],
                state:          MilestoneState.PENDING,
                deliverableURI: "",
                submittedAt:    0,
                approvedAt:     0
            }));
        }

        escrows[escrowId] = EscrowContract({
            escrowId:          escrowId,
            client:            msg.sender,
            freelancer:        _freelancer,
            arbitrator:        designatedArbiter,
            title:             _title,
            totalAmountWei:    totalBudget,
            releasedAmountWei: 0,
            state:             EscrowState.CREATED,
            createdAt:         block.timestamp,
            fundedAt:          0,
            completedAt:       0
        });

        _clientEscrowIds[msg.sender].push(escrowId);
        _freelancerEscrowIds[_freelancer].push(escrowId);
        totalEscrowsCreated++;

        emit EscrowCreated(
            escrowId,
            msg.sender,
            _freelancer,
            designatedArbiter,
            _title,
            totalBudget,
            block.timestamp
        );
    }

    /**
     * @notice Client deposits required ETH to fund the escrow contract
     */
    function fundEscrow(uint256 _escrowId)
        external
        payable
        onlyClient(_escrowId)
        inState(_escrowId, EscrowState.CREATED)
    {
        EscrowContract storage escrow = escrows[_escrowId];
        require(msg.value == escrow.totalAmountWei, "FreelanceEscrow: deposit value must equal total contract amount");

        escrow.state = EscrowState.FUNDED;
        escrow.fundedAt = block.timestamp;

        // Update all milestones to FUNDED state
        Milestone[] storage milestones = _escrowMilestones[_escrowId];
        for (uint256 i = 0; i < milestones.length; i++) {
            milestones[i].state = MilestoneState.FUNDED;
        }

        totalEthVolumeWei += msg.value;

        emit FundsDeposited(_escrowId, msg.sender, msg.value, block.timestamp);
    }

    // =========================================================================
    // WORKFLOW & MILESTONE SETTLEMENT
    // =========================================================================

    /**
     * @notice Freelancer accepts the contract and marks work as started
     */
    function startWork(uint256 _escrowId)
        external
        onlyFreelancer(_escrowId)
        inState(_escrowId, EscrowState.FUNDED)
    {
        escrows[_escrowId].state = EscrowState.IN_PROGRESS;

        Milestone[] storage milestones = _escrowMilestones[_escrowId];
        if (milestones.length > 0) {
            milestones[0].state = MilestoneState.IN_PROGRESS;
        }

        emit WorkStarted(_escrowId, msg.sender, block.timestamp);
    }

    /**
     * @notice Freelancer submits deliverable IPFS CID / link for a specific milestone
     */
    function submitMilestoneWork(
        uint256 _escrowId,
        uint256 _milestoneIndex,
        string calldata _deliverableURI
    )
        external
        onlyFreelancer(_escrowId)
    {
        EscrowContract storage escrow = escrows[_escrowId];
        require(
            escrow.state == EscrowState.IN_PROGRESS || escrow.state == EscrowState.SUBMITTED,
            "FreelanceEscrow: work must be in progress to submit"
        );
        require(bytes(_deliverableURI).length > 0, "FreelanceEscrow: deliverable URI required");

        Milestone[] storage milestones = _escrowMilestones[_escrowId];
        require(_milestoneIndex < milestones.length, "FreelanceEscrow: invalid milestone index");

        Milestone storage milestone = milestones[_milestoneIndex];
        require(
            milestone.state == MilestoneState.FUNDED || milestone.state == MilestoneState.IN_PROGRESS,
            "FreelanceEscrow: milestone already submitted or released"
        );

        milestone.deliverableURI = _deliverableURI;
        milestone.submittedAt    = block.timestamp;
        milestone.state          = MilestoneState.SUBMITTED;

        escrow.state = EscrowState.SUBMITTED;

        emit WorkSubmitted(_escrowId, _milestoneIndex + 1, msg.sender, _deliverableURI, block.timestamp);
    }

    /**
     * @notice Client approves submitted milestone work and releases ETH payment to freelancer
     */
    function approveMilestoneAndRelease(uint256 _escrowId, uint256 _milestoneIndex)
        external
        onlyClient(_escrowId)
        nonReentrant
    {
        EscrowContract storage escrow = escrows[_escrowId];
        require(
            escrow.state == EscrowState.IN_PROGRESS || escrow.state == EscrowState.SUBMITTED,
            "FreelanceEscrow: invalid escrow state for payment release"
        );

        Milestone[] storage milestones = _escrowMilestones[_escrowId];
        require(_milestoneIndex < milestones.length, "FreelanceEscrow: invalid milestone index");

        Milestone storage milestone = milestones[_milestoneIndex];
        require(milestone.state == MilestoneState.SUBMITTED, "FreelanceEscrow: milestone is not in submitted state");

        uint256 payoutAmount = milestone.amountWei;
        require(payoutAmount > 0, "FreelanceEscrow: payout amount must be greater than zero");

        // Checks-Effects-Interactions (CEI) Pattern
        milestone.state      = MilestoneState.RELEASED;
        milestone.approvedAt = block.timestamp;

        escrow.releasedAmountWei += payoutAmount;

        // Check if all milestones are released
        bool allCompleted = true;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].state != MilestoneState.RELEASED) {
                allCompleted = false;
                break;
            }
        }

        if (allCompleted) {
            escrow.state       = EscrowState.COMPLETED;
            escrow.completedAt = block.timestamp;
        } else {
            escrow.state = EscrowState.IN_PROGRESS;
        }

        // Interaction: ETH Transfer to Freelancer
        address payable freelancerPayable = payable(escrow.freelancer);
        (bool success, ) = freelancerPayable.call{value: payoutAmount}("");
        require(success, "FreelanceEscrow: ETH payment transfer to freelancer failed");

        emit PaymentReleased(_escrowId, _milestoneIndex + 1, escrow.freelancer, payoutAmount, block.timestamp);
    }

    // =========================================================================
    // CANCELLATION & REFUND LOGIC
    // =========================================================================

    /**
     * @notice Client cancels the project before work starts and receives a 100% ETH refund
     */
    function cancelAndRefund(uint256 _escrowId)
        external
        onlyClient(_escrowId)
        nonReentrant
    {
        EscrowContract storage escrow = escrows[_escrowId];
        require(
            escrow.state == EscrowState.CREATED || escrow.state == EscrowState.FUNDED,
            "FreelanceEscrow: cannot cancel project after work has started"
        );

        uint256 refundAmount = address(this).balance < (escrow.totalAmountWei - escrow.releasedAmountWei)
            ? address(this).balance
            : (escrow.totalAmountWei - escrow.releasedAmountWei);

        escrow.state = EscrowState.REFUNDED;

        if (refundAmount > 0) {
            address payable clientPayable = payable(escrow.client);
            (bool success, ) = clientPayable.call{value: refundAmount}("");
            require(success, "FreelanceEscrow: ETH refund transfer to client failed");
        }

        emit RefundIssued(_escrowId, msg.sender, refundAmount, block.timestamp);
    }

    // =========================================================================
    // DISPUTE RESOLUTION & ARBITRATION
    // =========================================================================

    /**
     * @notice Client or Freelancer raises a formal dispute, freezing escrow funds for arbitration
     */
    function raiseDispute(
        uint256 _escrowId,
        string calldata _reason,
        string calldata _evidenceURI
    ) external returns (uint256 disputeId) {
        EscrowContract storage escrow = escrows[_escrowId];
        require(
            msg.sender == escrow.client || msg.sender == escrow.freelancer,
            "FreelanceEscrow: only client or freelancer can raise dispute"
        );
        require(
            escrow.state == EscrowState.FUNDED || escrow.state == EscrowState.IN_PROGRESS || escrow.state == EscrowState.SUBMITTED,
            "FreelanceEscrow: cannot dispute contract in current state"
        );
        require(bytes(_reason).length > 0, "FreelanceEscrow: dispute reason required");

        disputeId = _nextDisputeId++;
        escrow.state = EscrowState.DISPUTED;

        disputes[_escrowId] = Dispute({
            disputeId:          disputeId,
            escrowId:           _escrowId,
            raisedBy:           msg.sender,
            reason:             _reason,
            evidenceURI:        _evidenceURI,
            clientSharePct:     0,
            freelancerSharePct: 0,
            resolvedAt:         0,
            isResolved:         false
        });

        totalDisputesRaised++;

        emit DisputeRaised(_escrowId, disputeId, msg.sender, _reason, block.timestamp);
    }

    /**
     * @notice Designated Arbitrator resolves dispute by distributing remaining escrow ETH balance
     * @param _clientSharePct Percentage of remaining funds awarded to client (0 - 100)
     * @param _freelancerSharePct Percentage of remaining funds awarded to freelancer (0 - 100)
     */
    function resolveDispute(
        uint256 _escrowId,
        uint256 _clientSharePct,
        uint256 _freelancerSharePct
    )
        external
        onlyArbitrator(_escrowId)
        inState(_escrowId, EscrowState.DISPUTED)
        nonReentrant
    {
        require(_clientSharePct + _freelancerSharePct == 100, "FreelanceEscrow: percentage split must sum to 100");

        EscrowContract storage escrow = escrows[_escrowId];
        Dispute storage dispute = disputes[_escrowId];
        require(!dispute.isResolved, "FreelanceEscrow: dispute already resolved");

        uint256 remainingBalance = escrow.totalAmountWei - escrow.releasedAmountWei;
        uint256 clientRefundWei    = (remainingBalance * _clientSharePct) / 100;
        uint256 freelancerPayoutWei = (remainingBalance * _freelancerSharePct) / 100;

        // CEI Pattern: Update State First
        dispute.clientSharePct     = _clientSharePct;
        dispute.freelancerSharePct = _freelancerSharePct;
        dispute.resolvedAt         = block.timestamp;
        dispute.isResolved         = true;

        escrow.releasedAmountWei += freelancerPayoutWei;
        escrow.state              = EscrowState.RESOLVED;
        escrow.completedAt        = block.timestamp;

        totalDisputesResolved++;

        // Interactions: ETH Payouts
        if (clientRefundWei > 0) {
            (bool clientOk, ) = payable(escrow.client).call{value: clientRefundWei}("");
            require(clientOk, "FreelanceEscrow: client refund payout failed");
        }

        if (freelancerPayoutWei > 0) {
            (bool freelancerOk, ) = payable(escrow.freelancer).call{value: freelancerPayoutWei}("");
            require(freelancerOk, "FreelanceEscrow: freelancer payout failed");
        }

        emit DisputeResolved(
            _escrowId,
            dispute.disputeId,
            msg.sender,
            clientRefundWei,
            freelancerPayoutWei,
            block.timestamp
        );
    }

    // =========================================================================
    // VIEW GETTERS
    // =========================================================================

    /// @notice Get escrow contract details
    function getEscrowDetails(uint256 _escrowId) external view returns (EscrowContract memory) {
        return escrows[_escrowId];
    }

    /// @notice Get all milestones for an escrow project
    function getEscrowMilestones(uint256 _escrowId) external view returns (Milestone[] memory) {
        return _escrowMilestones[_escrowId];
    }

    /// @notice Get list of escrow contract IDs created by a client
    function getClientEscrowIds(address _client) external view returns (uint256[] memory) {
        return _clientEscrowIds[_client];
    }

    /// @notice Get list of escrow contract IDs assigned to a freelancer
    function getFreelancerEscrowIds(address _freelancer) external view returns (uint256[] memory) {
        return _freelancerEscrowIds[_freelancer];
    }

    /// @notice Get platform aggregate metrics
    function getPlatformMetrics()
        external
        view
        returns (
            uint256 escrowsCount,
            uint256 ethVolumeWei,
            uint256 disputesRaised,
            uint256 disputesResolved,
            uint256 totalContractEthBalance
        )
    {
        escrowsCount            = totalEscrowsCreated;
        ethVolumeWei            = totalEthVolumeWei;
        disputesRaised          = totalDisputesRaised;
        disputesResolved        = totalDisputesResolved;
        totalContractEthBalance = address(this).balance;
    }
}
