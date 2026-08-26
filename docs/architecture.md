# System Architecture — Freelance Payment Escrow System

## Component Overview

| Layer | Component | Technology | Purpose |
|---|---|---|---|
| Smart Contract | `FreelanceEscrow.sol` | Solidity 0.8.20 | Multi-sig milestone locking, CEI payment releases, refunds, dispute resolution |
| Frontend | Angular 21 SSR DApp | Angular, TypeScript, Tailwind | Full DApp UI with signal-based reactive state and multi-persona switcher |
| State Management | Angular Signals | `signal()`, `computed()`, `effect()` | Fine-grained reactive UI state store (`EscrowStateService`) |
| Web3 Bridge | `Web3WalletService` | ethers.js v6 | MetaMask connection & local Hardhat EVM contract calls |
| AI Engine | Google Gemini 3.7 Flash | `@google/genai` | Contract risk auditor, dispute mediator copilot, deliverable evaluator |
| Data Viz | D3.js v7 | D3 SVG Engine | Interactive historical trust score trend charts with area gradients |
| Export Engine | jsPDF v4 | jsPDF | Client-side PDF audit report generator |
| Backend | Angular SSR + Express v5 | Node.js | SSR rendering + Gemini AI REST endpoints |

---

## Smart Contract State Machine & Workflow

```
                         ┌──────────────────────────────────┐
                         │       FreelanceEscrow.sol        │
                         └──────────────────────────────────┘

     [Client] ──createEscrow()──► State: CREATED (Milestones Defined)
                                         │
     [Client] ──fundEscrow{value}()──► State: FUNDED (ETH Locked in Contract)
                                         │
     [Freelancer] ──startWork()──► State: IN_PROGRESS
                                         │
     [Freelancer] ──submitMilestoneWork(index, IPFS_CID)──► State: SUBMITTED
                                         │
                                ┌────────┴────────┐
                                │                 │
                            Approved           Disputed
                                │                 │
     [Client] ──approveMilestoneAndRelease()   [Party] ──raiseDispute()
               (CEI ETH Payout to Freelancer)   (State: DISPUTED, Funds Frozen)
                                │                 │
                          State: COMPLETED     [Arbitrator] ──resolveDispute(split)
                                                (State: RESOLVED, ETH Distributed)
```

---

## API Endpoints (Angular SSR Express Server)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Consortium node health, latency, uptime |
| `POST` | `/api/escrows` | Create new multi-milestone escrow contract |
| `POST` | `/api/escrows/:id/fund` | Deposit ETH into escrow smart contract balance |
| `POST` | `/api/escrows/:id/submit-milestone` | Submit deliverable IPFS CID for milestone |
| `POST` | `/api/escrows/:id/release-milestone` | Approve milestone and release ETH to freelancer |
| `POST` | `/api/escrows/:id/dispute` | Raise dispute freezing escrow balance |
| `POST` | `/api/ai/audit-contract` | Gemini AI scope clarity and risk assessment |
| `POST` | `/api/ai/dispute-advisor` | Gemini AI dispute evidence analysis and split recommendation |
| `POST` | `/api/ai/eval-deliverable` | Gemini AI deliverable quality evaluation |
