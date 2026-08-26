// scripts/deploy.cjs
// Deployment & seeding script for FreelanceEscrow.sol on local Hardhat EVM
"use strict";

const path = require("path");
const fs   = require("fs");

async function main() {
  const [arbitrator, client1, client2, freelancer1, freelancer2] = await hre.ethers.getSigners();

  console.log("\n================================================================");
  console.log("  DEPLOYING SMART CONTRACT-BASED FREELANCE PAYMENT ESCROW SYSTEM");
  console.log("================================================================\n");

  // ── 1. Deploy Contract ──────────────────────────────────────────────────────
  console.log("1. Deploying FreelanceEscrow with Arbitrator Account:", arbitrator.address);
  const Factory = await hre.ethers.getContractFactory("FreelanceEscrow");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  console.log("   ✔ FreelanceEscrow deployed at:", contractAddress);

  // ── 2. Create Escrow #1 (Web3 DApp Frontend) ────────────────────────────────
  console.log("\n2. Creating Escrow #1: Web3 DApp Frontend (Client 1 → Freelancer 1)...");
  const parseEth = (val) => hre.ethers.parseEther(val);

  const title1 = "Full-Stack Web3 DApp Frontend & Smart Contract Integration";
  const desc1  = ["UI Components & Signal Architecture", "MetaMask Web3 Ethers v6 Integration", "D3 Telemetry & Test Suite"];
  const amt1   = [parseEth("0.5"), parseEth("0.5"), parseEth("0.5")];

  await contract.connect(client1).createEscrow(freelancer1.address, arbitrator.address, title1, desc1, amt1);
  console.log("   ✔ Escrow #1 created. Total Budget: 1.5 ETH");

  // Fund Escrow #1
  const totalEth1 = parseEth("1.5");
  await contract.connect(client1).fundEscrow(1, { value: totalEth1 });
  console.log("   ✔ Escrow #1 funded with 1.5 ETH locked in contract balance.");

  // Freelancer 1 starts work & submits milestone 1
  await contract.connect(freelancer1).startWork(1);
  await contract.connect(freelancer1).submitMilestoneWork(1, 0, "ipfs://QmX7y9Z2aB4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6");
  console.log("   ✔ Freelancer 1 started work & submitted Milestone #1 deliverable.");

  // Client 1 approves milestone 1 -> 0.5 ETH transferred to Freelancer 1
  await contract.connect(client1).approveMilestoneAndRelease(1, 0);
  console.log("   ✔ Client 1 approved Milestone #1 -> 0.5 ETH released to Freelancer 1!");

  // ── 3. Create Escrow #2 (DeFi Smart Contract Audit) ─────────────────────────
  console.log("\n3. Creating Escrow #2: DeFi Audit (Client 2 → Freelancer 2)...");
  const title2 = "DeFi Lending Protocol Smart Contract Security Audit";
  const desc2  = ["Static Analysis & Reentrancy Audit", "Formal Verification & Final Report"];
  const amt2   = [parseEth("1.0"), parseEth("1.0")];

  await contract.connect(client2).createEscrow(freelancer2.address, arbitrator.address, title2, desc2, amt2);
  await contract.connect(client2).fundEscrow(2, { value: parseEth("2.0") });
  await contract.connect(freelancer2).startWork(2);
  await contract.connect(freelancer2).submitMilestoneWork(2, 0, "ipfs://QmZ9a2bC6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7");
  await contract.connect(client2).approveMilestoneAndRelease(2, 0);
  console.log("   ✔ Escrow #2 created, funded (2.0 ETH), and Milestone #1 released (1.0 ETH).");

  // Client 2 raises dispute on Milestone #2
  await contract.connect(client2).raiseDispute(
    2,
    "Incomplete formal verification proofs and missing reentrancy test cases in final report",
    "ipfs://QmA1b2cC3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2"
  );
  console.log("   ✔ Client 2 raised formal dispute on Escrow #2 — funds frozen for arbitration!");

  // ── 4. Create Escrow #3 (UI/UX Design System) ──────────────────────────────
  console.log("\n4. Creating Escrow #3: Mobile Design System (Client 1 → Freelancer 1)...");
  const title3 = "Mobile Crypto Wallet UI/UX Design System";
  const desc3  = ["Wireframe Prototypes", "Figma Design Tokens"];
  const amt3   = [parseEth("0.4"), parseEth("0.4")];

  await contract.connect(client1).createEscrow(freelancer1.address, arbitrator.address, title3, desc3, amt3);
  await contract.connect(client1).fundEscrow(3, { value: parseEth("0.8") });
  await contract.connect(freelancer1).startWork(3);
  await contract.connect(freelancer1).submitMilestoneWork(3, 0, "ipfs://QmB2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3");
  await contract.connect(client1).approveMilestoneAndRelease(3, 0);
  await contract.connect(freelancer1).submitMilestoneWork(3, 1, "ipfs://QmC3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4");
  await contract.connect(client1).approveMilestoneAndRelease(3, 1);
  console.log("   ✔ Escrow #3 fully approved and completed! All 0.8 ETH released to Freelancer 1.");

  // ── 5. Platform Aggregate Metrics ──────────────────────────────────────────
  console.log("\n5. Platform Aggregate Metrics:");
  const metrics = await contract.getPlatformMetrics();
  console.log("   📊 Total Escrows Created :", metrics.escrowsCount.toString());
  console.log("   📊 Total ETH Volume      :", hre.ethers.formatEther(metrics.ethVolumeWei), "ETH");
  console.log("   📊 Disputes Raised       :", metrics.disputesRaised.toString());
  console.log("   📊 Contract ETH Balance  :", hre.ethers.formatEther(metrics.totalContractEthBalance), "ETH");

  // ── 6. Export ABI & Address to Frontend ────────────────────────────────────
  console.log("\n6. Exporting ABI and Deployment Config to Frontend App...");

  const artifactPath = path.resolve(
    __dirname,
    "../artifacts/contracts/FreelanceEscrow.sol/FreelanceEscrow.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

  const contractsDir = path.resolve(__dirname, "../frontend/src/app/contracts");
  if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir, { recursive: true });

  fs.writeFileSync(
    path.join(contractsDir, "FreelanceEscrowABI.json"),
    JSON.stringify(artifact.abi, null, 2)
  );
  fs.writeFileSync(
    path.join(contractsDir, "deployedAddress.json"),
    JSON.stringify({ address: contractAddress, chainId: 31337 }, null, 2)
  );

  console.log("   ✔ Exported FreelanceEscrowABI.json to frontend/src/app/contracts/");
  console.log("   ✔ Exported deployedAddress.json to frontend/src/app/contracts/");

  console.log("\n================================================================");
  console.log("  DEPLOYMENT & SEEDING COMPLETED SUCCESSFULLY!");
  console.log("================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
