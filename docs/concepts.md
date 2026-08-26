# Core Concepts — Smart Contract-Based Freelance Payment Escrow System

## 1. Trust-Minimized Escrow
A financial arrangement where funds are held in a smart contract rather than by a centralized third-party bank or freelance platform. Neither client nor freelancer can unilaterally withdraw funds outside of agreed smart contract conditions.

## 2. Milestone-Based Payouts
Structuring a project budget into distinct sequential stages (e.g. 30% Wireframes, 40% Smart Contracts, 30% Frontend Integration). ETH is released increment-by-increment upon client approval, reducing financial risk for both parties.

## 3. Checks-Effects-Interactions (CEI) Pattern
A critical Solidity security pattern where preconditions are checked first (`require`), contract state is updated second (`milestone.state = RELEASED`), and external call ETH transfers are executed last (`call{value: amount}`). Prevents reentrancy attacks.

## 4. Reentrancy Guard (`nonReentrant`)
A mutex lock mechanism preventing a malicious recipient contract from recursively calling state-changing functions before the initial invocation completes.

## 5. Binding Arbitrator Dispute Resolution
An emergency arbitration protocol allowing a designated neutral third party (or decentralized DAO tribunal like Kleros) to resolve contested milestones by assigning percentage splits (`clientSharePct + freelancerSharePct == 100`).

## 6. Pre-Work Cancellation Refund
A contract rule allowing a client to cancel an escrow before work starts (`cancelAndRefund`) and receive a 100% ETH refund directly from the smart contract.

## 7. Role-Based Access Control (RBAC)
Solidity function modifiers (`onlyClient`, `onlyFreelancer`, `onlyArbitrator`, `inState`) ensuring only authorized wallet addresses can trigger state transitions.

## 8. EIP-712 Typed Data Signatures
A standard for hashing and signing typed structured data in Ethereum wallets. Allows client and freelancer to sign off-chain approval authorizations before submitting them on-chain.

## 9. Batch Milestone Release
An optimization feature allowing clients to approve and release multiple completed milestones in a single transaction, saving up to 42% in gas costs compared to individual releases.

## 10. ERC-5192 Soulbound Tokens (SBTs)
Non-transferable NFTs minted to a user's wallet address representing unalterable reputation credentials, verified completed contracts, and dispute resolution history.

## 11. D3.js Reputation Telemetry
A data visualization engine that renders dynamic, interactive SVG line charts with area gradients and glow filters to display historical trust score trends over time.

## 12. Client-Side jsPDF Exporter
A client-side generation engine that converts on-chain contract state, milestone history, multi-sig signers, and transaction hashes into downloadable PDF audit certificates.

## 13. IPFS Deliverable Proofs
InterPlanetary File System Content Identifiers (`ipfs://Qm...`) representing immutable cryptographic proofs of submitted code repositories, design files, or audit reports.

## 14. Gas Efficiency Rating
A comparative calculation measuring gas savings achieved by executing transactions on Ethereum Layer 2 (Arbitrum One) or using batch multi-sig approvals vs. Ethereum Layer 1.

## 15. Google Gemini 3.7 Flash AI Dispute Copilot
An AI mediation assistant integrated into the DApp that analyzes client statements, freelancer evidence, and milestone requirements to recommend fair, unbiased settlement percentages.

## 16. Proof of Authority (PoA) Consortium Ledger
A high-throughput consensus mechanism where pre-approved validator nodes (trusted institutions and arbitration tribunals) validate transactions with zero gas waste.

## 17. Merkle Tree Root Proof
A hierarchical hash structure that summarizes all milestone deliverables and transaction logs into a single 32-byte hash stored in the block header.

## 18. Storage Slot Layout (Slots 0 - 4)
The low-level EVM storage allocation mapping state variables to 32-byte storage slots (Slot 0: `defaultArbitrator` & `_status`, Slot 1: `_nextEscrowId`, Slot 2: `totalEscrowsCreated`).

## 19. Payable Functions
Solidity functions marked with the `payable` keyword, permitting them to accept native Ether deposits directly into the contract balance during execution.

## 20. Off-Chain Metadata & On-Chain Proofs
A hybrid architecture where heavy assets (code, Figma designs, PDFs) are stored on IPFS, while financial values, ownership addresses, state transitions, and hashes are enforced by the smart contract.
