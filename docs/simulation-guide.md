# Remix IDE Virtual Simulation Guide — Smart Contract-Based Freelance Payment Escrow System

This guide walks through step-by-step how to simulate and test `FreelanceEscrow.sol` in **Remix IDE** using **Remix VM** without spending real ETH.

---

## 🛠️ Step-by-Step Simulation Workflow

### Step 1: Open Remix IDE
Navigate to [https://remix.ethereum.org](https://remix.ethereum.org) in your browser.

### Step 2: Create Contract File
In the Remix File Explorer, under `contracts/`, create a new file named `FreelanceEscrow.sol`.

### Step 3: Paste Smart Contract Code
Copy the full content of `contracts/FreelanceEscrow.sol` from this repository and paste it into Remix.

### Step 4: Compile Contract
1. Click the **Solidity Compiler** tab (left sidebar icon).
2. Select Compiler Version `0.8.20`.
3. Enable **Enable Optimization** (200 runs).
4. Click **Compile FreelanceEscrow.sol** (green checkmark will appear).

### Step 5: Configure Deployment Environment
1. Click the **Deploy & Run Transactions** tab.
2. Under **Environment**, select `Remix VM (Cancun)` or `Remix VM (Shanghai)`.
3. Observe available accounts (each loaded with 100 test ETH).
   - **Account 1** (`0x5B3...`): Arbitrator / Deployer
   - **Account 2** (`0xAb8...`): Client (Sarah Chen)
   - **Account 3** (`0x4B2...`): Freelancer (Alex Rivera)

### Step 6: Deploy Contract
1. Ensure **Account 1** is selected.
2. Click **Deploy**.
3. Under **Deployed Contracts**, expand `FREELANCEESCROW AT 0x...`.

### Step 7: Create Escrow Contract
1. Switch to **Account 2** (Client).
2. Expand the `createEscrow` function in Remix UI.
3. Fill in parameters:
   - `_freelancer`: `0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db` (Account 3)
   - `_arbitrator`: `0x5B38Da6a701c568545dCfcB03FcB875f56beddC4` (Account 1)
   - `_title`: `"Web3 DApp Development"`
   - `_milestoneDescriptions`: `["UI Design", "Smart Contract Integration"]`
   - `_milestoneAmounts`: `[500000000000000000, 500000000000000000]` (0.5 ETH each in wei)
4. Click **transact**. Transaction will succeed emitting `EscrowCreated`.

### Step 8: Fund Escrow
1. In the **VALUE** box at top of Remix, enter `1` and select `Ether`.
2. Expand `fundEscrow` function, enter `_escrowId`: `1`.
3. Click **transact**.
4. Contract state changes to `FUNDED` (1.0 ETH locked in contract balance).

### Step 9: Start Work & Submit Deliverable
1. Switch account to **Account 3** (Freelancer).
2. Call `startWork(1)`. Contract state changes to `IN_PROGRESS`.
3. Call `submitMilestoneWork(1, 0, "ipfs://QmX7y9Z2aB4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6")`.

### Step 10: Client Approves Milestone & Releases Payment
1. Switch back to **Account 2** (Client).
2. Call `approveMilestoneAndRelease(1, 0)`.
3. Observe Account 3 balance increases by **0.5 ETH**!

### Step 11: Raise & Resolve Dispute
1. Call `raiseDispute(1, "Milestone 2 incomplete", "ipfs://QmEvidence")`.
2. Switch to **Account 1** (Arbitrator).
3. Call `resolveDispute(1, 70, 30)` (70% Client refund / 30% Freelancer payout).
4. Verify Account 2 receives 0.35 ETH refund and Account 3 receives 0.15 ETH payout!
