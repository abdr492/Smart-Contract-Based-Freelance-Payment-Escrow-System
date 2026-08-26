# Placement Interview Preparation — Smart Contract-Based Freelance Payment Escrow System

## Q1: What is a trust-minimized smart contract escrow and how does it replace traditional freelance platforms?

**Answer**: Traditional freelance platforms (Upwork, Fiverr) rely on centralized databases and escrow accounts where a middleman controls project funds and charges high platform fees (up to 20%). A smart contract escrow locks client funds directly in an immutable Ethereum contract (`FreelanceEscrow.sol`). Funds are released automatically upon milestone deliverable approval or refunded upon mutual cancellation. This eliminates intermediary fees, prevents unauthorized platform fund seizures, and ensures transparent, auditable settlement rules.

---

## Q2: How does your smart contract protect against Reentrancy attacks during ETH transfers?

**Answer**: We protect against reentrancy attacks through two redundant defense layers:
1. **Checks-Effects-Interactions (CEI) Pattern**: Preconditions are checked first (`require`), contract state is updated second (`milestone.state = RELEASED`, `escrow.releasedAmountWei += payoutAmount`), and external ETH transfers (`call{value: payoutAmount}`) are executed last.
2. **Reentrancy Guard (`nonReentrant`)**: A state variable mutex (`_status`) locks execution so that any recursive callback attempt from a malicious recipient contract immediately reverts with `"FreelanceEscrow: reentrancy guard locked"`.

---

## Q3: Explain the multi-milestone payout mechanism in `FreelanceEscrow.sol`.

**Answer**: Instead of locking a lump-sum payment released all at once, an escrow contains an array of `Milestone` structs (`description`, `amountWei`, `state`, `deliverableURI`). When a freelancer completes a milestone, they submit its IPFS CID (`submitMilestoneWork`). The client reviews the deliverable and calls `approveMilestoneAndRelease(escrowId, milestoneIndex)`. The contract releases only that milestone's ETH amount to the freelancer while keeping remaining milestone funds locked.

---

## Q4: How does Pre-Work Cancellation Refund work?

**Answer**: If a project has not yet started (`escrow.state == CREATED` or `FUNDED`), the client can invoke `cancelAndRefund(escrowId)`. The smart contract verifies that work has not commenced, updates state to `REFUNDED`, and transfers 100% of the locked ETH back to the client's wallet. Once work moves to `IN_PROGRESS`, direct cancellation is disabled, protecting freelancers from sudden unilateral fund withdrawals.

---

## Q5: How are disputes handled when a client and freelancer disagree on a milestone?

**Answer**: Either party can call `raiseDispute(escrowId, reason, evidenceURI)`. This freezes the remaining escrow balance and transitions state to `DISPUTED`. The designated arbitrator (or decentralized tribunal like Kleros) reviews evidence and executes `resolveDispute(escrowId, clientSharePct, freelancerSharePct)`. The contract validates that `clientSharePct + freelancerSharePct == 100` and automatically transfers the corresponding ETH amounts to both parties in a single atomic transaction.

---

## Q6: How does your Angular frontend connect to the Hardhat local EVM?

**Answer**: `Web3WalletService` uses ethers.js v6 `BrowserProvider`:
1. `new BrowserProvider(window.ethereum)` connects to MetaMask.
2. `wallet_switchEthereumChain` switches the wallet to Hardhat local EVM (`chainId: 31337`).
3. `getContractInstance()` creates a typed `Contract` instance using `FreelanceEscrowABI.json` and `deployedAddress.json` exported by `scripts/deploy.cjs`.

---

## Q7: How does Google Gemini 3.7 Flash AI assist in dispute resolution?

**Answer**: Gemini 3.7 Flash AI is integrated into the Angular SSR Express server (`src/server.ts`) via `@google/genai`. When a dispute is raised, the `AI Dispute Mediator Copilot` endpoint (`/api/ai/dispute-advisor`) evaluates the milestone specification, client complaint text, freelancer submission notes, and attached IPFS evidence files. It generates an objective risk score and recommends a fair settlement percentage split to assist the human arbitrator.

---

## Q8: What role does D3.js play in your frontend DApp?

**Answer**: D3.js v7 is used in `trust-score-trend.ts` to render an interactive, animated SVG historical reputation chart. It plots chronological trust score changes, contract completion events, and cumulative ETH volumes with dynamic SVG curves, area color gradients, glow filters, time-range filters, and hover tooltips.

---

## Q9: How is client-side PDF audit report generation implemented?

**Answer**: `AnalyticsExportService` uses `jsPDF` v4 to generate formal audit certificates directly in the browser. It extracts on-chain contract parameters, multi-sig signers, milestone completion timestamps, and transaction hashes, formatting them into an official PDF document with tables and cryptographic metadata.

---

## Q10: What are the main limitations of this architecture for production deployment?

**Answer**:
1. **Single Arbitrator Model**: In the base contract, arbitration is assigned to a single wallet address. Production systems should integrate multi-sig arbitrator councils or decentralized oracle tribunals (e.g. Kleros).
2. **Off-Chain IPFS Dependency**: Deliverables rely on IPFS CIDs being pinned by IPFS nodes (Pinata/Infura).
3. **Static ETH Valuation**: Milestone amounts are denominated in ETH wei, exposing parties to crypto market volatility. Production platforms can integrate Chainlink price feeds or ERC-20 stablecoins (USDC/DAI).
