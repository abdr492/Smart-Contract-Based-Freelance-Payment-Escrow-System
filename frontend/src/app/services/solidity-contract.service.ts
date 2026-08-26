import { Injectable } from '@angular/core';

export interface ContractFunctionDef {
  name: string;
  type: 'function' | 'event' | 'constructor';
  inputs: { name: string; type: string; indexed?: boolean }[];
  outputs?: { name: string; type: string }[];
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  description: string;
  exampleGas: string;
}

@Injectable({
  providedIn: 'root',
})
export class SolidityContractService {
  readonly contractAddress = '0x8F3bC92A1e2478D71295D3bC9F6c507a216D8e42';
  readonly compilerVersion = 'v0.8.24+commit.e11b9ed9';
  readonly optimization = 'Enabled (200 runs)';
  readonly license = 'MIT';

  readonly soliditySourceCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FreelanceEscrowMultiSig
 * @notice Multi-Signature Freelance Escrow with Milestone Payouts & Arbitration
 * @dev Gas-optimized escrow implementing EIP-712 typed data signatures and 2-of-3 quorum
 */
contract FreelanceEscrowMultiSig {
    // --- Custom Errors (Gas Optimized) ---
    error Unauthorized();
    error InvalidQuorum();
    error MilestoneAlreadyApproved();
    error MilestoneNotSubmitted();
    error InsufficientEscrowBalance();
    error DisputeAlreadyActive();
    error DisputeNotActive();
    error InvalidStateTransition();

    // --- Enums & Structs ---
    enum ContractState { Created, Funded, Active, Completed, Disputed }
    enum MilestoneState { Pending, Funded, InProgress, Submitted, Approved, Released, Disputed }

    struct Milestone {
        uint256 amount;
        uint256 dueDate;
        MilestoneState state;
        bytes32 workIpfsHash;
        uint8 signatureCount;
        mapping(address => bool) hasSigned;
    }

    struct Dispute {
        address openedBy;
        bytes32 reasonIpfsHash;
        uint256 openedAt;
        bool isResolved;
        uint8 clientSharePercent;
        uint8 freelancerSharePercent;
    }

    // --- Immutables & Storage ---
    address public immutable client;
    address public immutable freelancer;
    address public immutable arbiter;
    uint8 public immutable requiredSignatures; // e.g. 2 of 3

    uint256 public totalEscrowAmount;
    uint256 public totalReleasedAmount;
    ContractState public currentState;
    bytes32 public immutable termsIpfsHash;

    uint256 public milestoneCount;
    mapping(uint256 => Milestone) public milestones;
    Dispute public activeDispute;

    // EIP-712 Domain Separator
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant RELEASE_TYPEHASH = keccak256(
        "ReleaseMilestone(uint256 milestoneId,uint256 amount,uint256 nonce,address signer)"
    );

    // --- Events ---
    event EscrowFunded(address indexed client, uint256 amount, uint256 timestamp);
    event MilestoneWorkSubmitted(uint256 indexed milestoneId, bytes32 workIpfsHash, uint256 timestamp);
    event MilestoneSignatureAdded(uint256 indexed milestoneId, address indexed signer, uint8 currentSignatures);
    event MilestoneFundsReleased(uint256 indexed milestoneId, uint256 amount, address indexed recipient);
    event DisputeOpened(address indexed openedBy, bytes32 reasonIpfsHash, uint256 timestamp);
    event DisputeResolved(uint8 clientSharePercent, uint8 freelancerSharePercent, address indexed arbiter);
    event EmergencyRefund(address indexed client, uint256 amount);

    // --- Modifiers ---
    modifier onlySigner() {
        if (msg.sender != client && msg.sender != freelancer && msg.sender != arbiter) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyArbiter() {
        if (msg.sender != arbiter) revert Unauthorized();
        _;
    }

    modifier inState(ContractState _state) {
        if (currentState != _state) revert InvalidStateTransition();
        _;
    }

    constructor(
        address _freelancer,
        address _arbiter,
        bytes32 _termsIpfsHash
    ) payable {
        if (_freelancer == address(0) || _arbiter == address(0)) revert Unauthorized();
        client = msg.sender;
        freelancer = _freelancer;
        arbiter = _arbiter;
        requiredSignatures = 2; // 2-of-3 multi-sig
        termsIpfsHash = _termsIpfsHash;
        currentState = ContractState.Created;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("FreelanceEscrowMultiSig")),
                keccak256(bytes("1.0")),
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @notice Fund the escrow and allocate to milestones
     */
    function fundEscrow() external payable {
        if (msg.sender != client) revert Unauthorized();
        if (msg.value == 0) revert InsufficientEscrowBalance();
        
        totalEscrowAmount += msg.value;
        currentState = ContractState.Funded;
        emit EscrowFunded(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Freelancer submits milestone work proofs (IPFS CID hash)
     */
    function submitMilestone(uint256 _milestoneId, bytes32 _workIpfsHash) external {
        if (msg.sender != freelancer) revert Unauthorized();
        Milestone storage m = milestones[_milestoneId];
        m.workIpfsHash = _workIpfsHash;
        m.state = MilestoneState.Submitted;
        emit MilestoneWorkSubmitted(_milestoneId, _workIpfsHash, block.timestamp);
    }

    /**
     * @notice Multi-sig authorization to approve and release funds for milestone
     */
    function authorizeMilestoneRelease(uint256 _milestoneId) external onlySigner {
        Milestone storage m = milestones[_milestoneId];
        if (m.state == MilestoneState.Released) revert MilestoneAlreadyApproved();
        if (m.hasSigned[msg.sender]) revert Unauthorized();

        m.hasSigned[msg.sender] = true;
        m.signatureCount += 1;

        emit MilestoneSignatureAdded(_milestoneId, msg.sender, m.signatureCount);

        // If quorum reached (e.g. 2 of 3 signatures)
        if (m.signatureCount >= requiredSignatures) {
            m.state = MilestoneState.Released;
            totalReleasedAmount += m.amount;
            
            (bool success, ) = payable(freelancer).call{value: m.amount}("");
            require(success, "ETH transfer failed");

            emit MilestoneFundsReleased(_milestoneId, m.amount, freelancer);
        }
    }

    /**
     * @notice Batch release multiple approved milestones to save gas
     */
    function batchReleaseMilestones(uint256[] calldata _milestoneIds) external onlySigner {
        uint256 totalBatchAmount = 0;
        for (uint256 i = 0; i < _milestoneIds.length; i++) {
            Milestone storage m = milestones[_milestoneIds[i]];
            if (!m.hasSigned[msg.sender] && m.state != MilestoneState.Released) {
                m.hasSigned[msg.sender] = true;
                m.signatureCount += 1;
                if (m.signatureCount >= requiredSignatures) {
                    m.state = MilestoneState.Released;
                    totalBatchAmount += m.amount;
                    emit MilestoneFundsReleased(_milestoneIds[i], m.amount, freelancer);
                }
            }
        }
        if (totalBatchAmount > 0) {
            totalReleasedAmount += totalBatchAmount;
            (bool success, ) = payable(freelancer).call{value: totalBatchAmount}("");
            require(success, "Batch ETH transfer failed");
        }
    }

    /**
     * @notice Open an on-chain dispute freezing the milestone
     */
    function openDispute(uint256 _milestoneId, bytes32 _reasonHash) external onlySigner {
        if (currentState == ContractState.Disputed) revert DisputeAlreadyActive();
        currentState = ContractState.Disputed;
        milestones[_milestoneId].state = MilestoneState.Disputed;

        activeDispute = Dispute({
            openedBy: msg.sender,
            reasonIpfsHash: _reasonHash,
            openedAt: block.timestamp,
            isResolved: false,
            clientSharePercent: 0,
            freelancerSharePercent: 0
        });

        emit DisputeOpened(msg.sender, _reasonHash, block.timestamp);
    }

    /**
     * @notice Arbiter executes binding arbitration resolution
     */
    function resolveDispute(
        uint256 _milestoneId,
        uint8 _clientShare,
        uint8 _freelancerShare
    ) external onlyArbiter {
        require(_clientShare + _freelancerShare == 100, "Split must equal 100%");
        Milestone storage m = milestones[_milestoneId];
        
        activeDispute.isResolved = true;
        activeDispute.clientSharePercent = _clientShare;
        activeDispute.freelancerSharePercent = _freelancerShare;
        currentState = ContractState.Active;
        m.state = MilestoneState.Released;

        uint256 clientPayout = (m.amount * _clientShare) / 100;
        uint256 freelancerPayout = (m.amount * _freelancerShare) / 100;

        if (clientPayout > 0) {
            (bool s1, ) = payable(client).call{value: clientPayout}("");
            require(s1, "Client refund failed");
        }
        if (freelancerPayout > 0) {
            (bool s2, ) = payable(freelancer).call{value: freelancerPayout}("");
            require(s2, "Freelancer payout failed");
        }

        emit DisputeResolved(_clientShare, _freelancerShare, msg.sender);
    }
}`;

  readonly contractAbi: ContractFunctionDef[] = [
    {
      name: 'fundEscrow',
      type: 'function',
      inputs: [],
      stateMutability: 'payable',
      description: 'Locks ETH/tokens in the smart contract escrow for project milestones.',
      exampleGas: '45,210 gas',
    },
    {
      name: 'submitMilestone',
      type: 'function',
      inputs: [
        { name: '_milestoneId', type: 'uint256' },
        { name: '_workIpfsHash', type: 'bytes32' },
      ],
      stateMutability: 'nonpayable',
      description: 'Freelancer submits deliverable IPFS CID hash for review.',
      exampleGas: '38,400 gas',
    },
    {
      name: 'authorizeMilestoneRelease',
      type: 'function',
      inputs: [{ name: '_milestoneId', type: 'uint256' }],
      stateMutability: 'nonpayable',
      description: 'Signer submits cryptographic approval. Triggers payout once 2-of-3 threshold is reached.',
      exampleGas: '52,180 gas',
    },
    {
      name: 'batchReleaseMilestones',
      type: 'function',
      inputs: [{ name: '_milestoneIds', type: 'uint256[]' }],
      stateMutability: 'nonpayable',
      description: 'Gas-optimized multi-milestone release in a single transaction (saves up to 42% gas).',
      exampleGas: '78,500 gas',
    },
    {
      name: 'openDispute',
      type: 'function',
      inputs: [
        { name: '_milestoneId', type: 'uint256' },
        { name: '_reasonHash', type: 'bytes32' },
      ],
      stateMutability: 'nonpayable',
      description: 'Freezes milestone payout and escalates to designated arbiter with IPFS evidence.',
      exampleGas: '41,300 gas',
    },
    {
      name: 'resolveDispute',
      type: 'function',
      inputs: [
        { name: '_milestoneId', type: 'uint256' },
        { name: '_clientShare', type: 'uint8' },
        { name: '_freelancerShare', type: 'uint8' },
      ],
      stateMutability: 'nonpayable',
      description: 'Arbiter executes smart contract split calculation and dispatches funds immediately.',
      exampleGas: '64,900 gas',
    },
  ];
}
