// test/FreelanceEscrow.test.cjs
// 20 Comprehensive Unit Tests for FreelanceEscrow.sol
"use strict";

const { expect }   = require("chai");
const { ethers }   = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const parseEth = (val) => ethers.parseEther(val);

describe("FreelanceEscrow Smart Contract — Comprehensive Test Suite (20 Tests)", function () {
  let contract;
  let arbitrator, client, freelancer, stranger;

  beforeEach(async function () {
    [arbitrator, client, freelancer, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("FreelanceEscrow");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1–4. DEPLOYMENT & CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  it("1. Deployer is assigned as default arbitrator on construction", async function () {
    expect(await contract.defaultArbitrator()).to.equal(arbitrator.address);
  });

  it("2. Client can create a multi-milestone escrow contract and EscrowCreated event is emitted", async function () {
    const titles = ["Milestone 1", "Milestone 2"];
    const amounts = [parseEth("0.5"), parseEth("0.5")];

    await expect(
      contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "DApp Build", titles, amounts)
    ).to.emit(contract, "EscrowCreated")
      .withArgs(1, client.address, freelancer.address, arbitrator.address, "DApp Build", parseEth("1.0"), anyValue);

    const escrow = await contract.getEscrowDetails(1);
    expect(escrow.client).to.equal(client.address);
    expect(escrow.freelancer).to.equal(freelancer.address);
    expect(escrow.totalAmountWei).to.equal(parseEth("1.0"));
    expect(escrow.state).to.equal(0); // CREATED
  });

  it("3. Creating escrow with empty title or invalid address reverts", async function () {
    const titles = ["Milestone 1"];
    const amounts = [parseEth("1.0")];

    await expect(
      contract.connect(client).createEscrow(ethers.ZeroAddress, arbitrator.address, "DApp", titles, amounts)
    ).to.be.revertedWith("FreelanceEscrow: invalid freelancer address");

    await expect(
      contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "", titles, amounts)
    ).to.be.revertedWith("FreelanceEscrow: project title required");
  });

  it("4. Creating escrow where client equals freelancer address reverts", async function () {
    await expect(
      contract.connect(client).createEscrow(client.address, arbitrator.address, "DApp", ["M1"], [parseEth("1.0")])
    ).to.be.revertedWith("FreelanceEscrow: client and freelancer must be distinct addresses");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5–7. FUNDING ESCROW
  // ═══════════════════════════════════════════════════════════════════════════

  it("5. Client can fund escrow with exact ETH value and state updates to FUNDED", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "DApp", ["M1"], [parseEth("1.0")]);

    await expect(contract.connect(client).fundEscrow(1, { value: parseEth("1.0") }))
      .to.emit(contract, "FundsDeposited")
      .withArgs(1, client.address, parseEth("1.0"), anyValue);

    const escrow = await contract.getEscrowDetails(1);
    expect(escrow.state).to.equal(1); // FUNDED
    expect(await ethers.provider.getBalance(await contract.getAddress())).to.equal(parseEth("1.0"));
  });

  it("6. Funding with incorrect ETH amount reverts", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "DApp", ["M1"], [parseEth("1.0")]);

    await expect(
      contract.connect(client).fundEscrow(1, { value: parseEth("0.5") })
    ).to.be.revertedWith("FreelanceEscrow: deposit value must equal total contract amount");
  });

  it("7. Non-client attempting to fund escrow reverts", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "DApp", ["M1"], [parseEth("1.0")]);

    await expect(
      contract.connect(stranger).fundEscrow(1, { value: parseEth("1.0") })
    ).to.be.revertedWith("FreelanceEscrow: caller is not project client");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8–10. WORKFLOW & MILESTONE SUBMISSION
  // ═══════════════════════════════════════════════════════════════════════════

  it("8. Freelancer can accept funded contract and start work", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "DApp", ["M1"], [parseEth("1.0")]);
    await contract.connect(client).fundEscrow(1, { value: parseEth("1.0") });

    await expect(contract.connect(freelancer).startWork(1))
      .to.emit(contract, "WorkStarted")
      .withArgs(1, freelancer.address, anyValue);

    const escrow = await contract.getEscrowDetails(1);
    expect(escrow.state).to.equal(2); // IN_PROGRESS
  });

  it("9. Non-freelancer attempting to start work reverts", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "DApp", ["M1"], [parseEth("1.0")]);
    await contract.connect(client).fundEscrow(1, { value: parseEth("1.0") });

    await expect(
      contract.connect(stranger).startWork(1)
    ).to.be.revertedWith("FreelanceEscrow: caller is not assigned freelancer");
  });

  it("10. Freelancer can submit milestone deliverable IPFS CID", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "DApp", ["M1"], [parseEth("1.0")]);
    await contract.connect(client).fundEscrow(1, { value: parseEth("1.0") });
    await contract.connect(freelancer).startWork(1);

    await expect(contract.connect(freelancer).submitMilestoneWork(1, 0, "ipfs://QmCID123"))
      .to.emit(contract, "WorkSubmitted")
      .withArgs(1, 1, freelancer.address, "ipfs://QmCID123", anyValue);

    const milestones = await contract.getEscrowMilestones(1);
    expect(milestones[0].state).to.equal(3); // SUBMITTED
    expect(milestones[0].deliverableURI).to.equal("ipfs://QmCID123");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11–13. PAYMENT RELEASE & DOUBLE PAYMENT PREVENTION
  // ═══════════════════════════════════════════════════════════════════════════

  it("11. Client can approve submitted milestone and ETH is transferred to freelancer", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "DApp", ["M1"], [parseEth("1.0")]);
    await contract.connect(client).fundEscrow(1, { value: parseEth("1.0") });
    await contract.connect(freelancer).startWork(1);
    await contract.connect(freelancer).submitMilestoneWork(1, 0, "ipfs://QmCID123");

    const prevBalance = await ethers.provider.getBalance(freelancer.address);

    await expect(contract.connect(client).approveMilestoneAndRelease(1, 0))
      .to.emit(contract, "PaymentReleased")
      .withArgs(1, 1, freelancer.address, parseEth("1.0"), anyValue);

    const newBalance = await ethers.provider.getBalance(freelancer.address);
    expect(newBalance - prevBalance).to.equal(parseEth("1.0"));

    const escrow = await contract.getEscrowDetails(1);
    expect(escrow.state).to.equal(4); // COMPLETED
  });

  it("12. Non-client approving milestone reverts", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "DApp", ["M1"], [parseEth("1.0")]);
    await contract.connect(client).fundEscrow(1, { value: parseEth("1.0") });
    await contract.connect(freelancer).startWork(1);
    await contract.connect(freelancer).submitMilestoneWork(1, 0, "ipfs://QmCID123");

    await expect(
      contract.connect(stranger).approveMilestoneAndRelease(1, 0)
    ).to.be.revertedWith("FreelanceEscrow: caller is not project client");
  });

  it("13. Approving an already released milestone reverts (double payment prevention)", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "DApp", ["M1"], [parseEth("1.0")]);
    await contract.connect(client).fundEscrow(1, { value: parseEth("1.0") });
    await contract.connect(freelancer).startWork(1);
    await contract.connect(freelancer).submitMilestoneWork(1, 0, "ipfs://QmCID123");
    await contract.connect(client).approveMilestoneAndRelease(1, 0);

    await expect(
      contract.connect(client).approveMilestoneAndRelease(1, 0)
    ).to.be.revertedWith("FreelanceEscrow: invalid escrow state for payment release");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 14–15. CANCELLATION & REFUNDS
  // ═══════════════════════════════════════════════════════════════════════════

  it("14. Client can cancel project before work starts and receives 100% ETH refund", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "DApp", ["M1"], [parseEth("1.0")]);
    await contract.connect(client).fundEscrow(1, { value: parseEth("1.0") });

    const prevBalance = await ethers.provider.getBalance(client.address);

    const tx = await contract.connect(client).cancelAndRefund(1);
    const receipt = await tx.wait();
    const gasSpent = receipt.gasUsed * receipt.gasPrice;

    const newBalance = await ethers.provider.getBalance(client.address);
    expect(newBalance + gasSpent - prevBalance).to.equal(parseEth("1.0"));

    const escrow = await contract.getEscrowDetails(1);
    expect(escrow.state).to.equal(6); // REFUNDED
  });

  it("15. Client cannot cancel project after work has started", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "DApp", ["M1"], [parseEth("1.0")]);
    await contract.connect(client).fundEscrow(1, { value: parseEth("1.0") });
    await contract.connect(freelancer).startWork(1);

    await expect(
      contract.connect(client).cancelAndRefund(1)
    ).to.be.revertedWith("FreelanceEscrow: cannot cancel project after work has started");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 16–18. DISPUTE RESOLUTION & ARBITRATION
  // ═══════════════════════════════════════════════════════════════════════════

  it("16. Client or Freelancer can raise a dispute freezing funds", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "DApp", ["M1"], [parseEth("1.0")]);
    await contract.connect(client).fundEscrow(1, { value: parseEth("1.0") });
    await contract.connect(freelancer).startWork(1);

    await expect(contract.connect(client).raiseDispute(1, "Milestone delayed", "ipfs://QmEvidence"))
      .to.emit(contract, "DisputeRaised")
      .withArgs(1, 1, client.address, "Milestone delayed", anyValue);

    const escrow = await contract.getEscrowDetails(1);
    expect(escrow.state).to.equal(5); // DISPUTED
  });

  it("17. Designated Arbitrator resolves dispute with 70% Client / 30% Freelancer split", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "DApp", ["M1"], [parseEth("1.0")]);
    await contract.connect(client).fundEscrow(1, { value: parseEth("1.0") });
    await contract.connect(freelancer).startWork(1);
    await contract.connect(client).raiseDispute(1, "Incomplete work", "ipfs://QmEvidence");

    const clientPrev = await ethers.provider.getBalance(client.address);
    const freePrev   = await ethers.provider.getBalance(freelancer.address);

    await expect(contract.connect(arbitrator).resolveDispute(1, 70, 30))
      .to.emit(contract, "DisputeResolved")
      .withArgs(1, 1, arbitrator.address, parseEth("0.7"), parseEth("0.3"), anyValue);

    const clientNew = await ethers.provider.getBalance(client.address);
    const freeNew   = await ethers.provider.getBalance(freelancer.address);

    expect(clientNew - clientPrev).to.equal(parseEth("0.7"));
    expect(freeNew - freePrev).to.equal(parseEth("0.3"));

    const escrow = await contract.getEscrowDetails(1);
    expect(escrow.state).to.equal(7); // RESOLVED
  });

  it("18. Resolving dispute with invalid percentage sum (!= 100) reverts", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "DApp", ["M1"], [parseEth("1.0")]);
    await contract.connect(client).fundEscrow(1, { value: parseEth("1.0") });
    await contract.connect(freelancer).startWork(1);
    await contract.connect(client).raiseDispute(1, "Incomplete work", "ipfs://QmEvidence");

    await expect(
      contract.connect(arbitrator).resolveDispute(1, 50, 40)
    ).to.be.revertedWith("FreelanceEscrow: percentage split must sum to 100");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 19–20. CONTRACT BALANCE & PLATFORM METRICS
  // ═══════════════════════════════════════════════════════════════════════════

  it("19. Contract ETH balance matches total active locked funds across escrows", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "Project 1", ["M1"], [parseEth("1.0")]);
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "Project 2", ["M1"], [parseEth("2.0")]);

    await contract.connect(client).fundEscrow(1, { value: parseEth("1.0") });
    await contract.connect(client).fundEscrow(2, { value: parseEth("2.0") });

    expect(await ethers.provider.getBalance(await contract.getAddress())).to.equal(parseEth("3.0"));
  });

  it("20. Platform aggregate metrics accurately track total escrows, ETH volume, and dispute counts", async function () {
    await contract.connect(client).createEscrow(freelancer.address, arbitrator.address, "Project 1", ["M1"], [parseEth("1.0")]);
    await contract.connect(client).fundEscrow(1, { value: parseEth("1.0") });
    await contract.connect(freelancer).startWork(1);
    await contract.connect(client).raiseDispute(1, "Dispute 1", "ipfs://QmEvidence");
    await contract.connect(arbitrator).resolveDispute(1, 100, 0);

    const metrics = await contract.getPlatformMetrics();
    expect(metrics.escrowsCount).to.equal(1);
    expect(metrics.ethVolumeWei).to.equal(parseEth("1.0"));
    expect(metrics.disputesRaised).to.equal(1);
    expect(metrics.disputesResolved).to.equal(1);
    expect(metrics.totalContractEthBalance).to.equal(0);
  });
});
