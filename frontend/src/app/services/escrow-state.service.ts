import { Injectable, signal, computed, inject } from '@angular/core';
import {
  EscrowContract,
  Milestone,
  DisputeCase,
  ReputationProfile,
  ChatMessage,
  ScheduledEvent,
  AuditTransaction,
  SystemNotification,
  DashboardWidgetConfig,
  UserRole,
  MultiSigSignature,
  ProofFile,
} from '../models/escrow.models';
import { Web3SimulationService } from './web3-simulation.service';

const STORAGE_KEY = 'smart_contract_escrow_data_v1';

@Injectable({
  providedIn: 'root',
})
export class EscrowStateService {
  private web3Service = inject(Web3SimulationService);

  // Active Role and UI Controls
  readonly activeRole = signal<UserRole>('client');
  readonly isDarkMode = signal<boolean>(true);
  readonly activeTab = signal<'dashboard' | 'contracts' | 'solidity' | 'disputes' | 'reputation' | 'messages' | 'analytics'>('dashboard');
  readonly selectedContractId = signal<string>('escrow-001');
  readonly searchQuery = signal<string>('');
  readonly filterStatus = signal<string>('all');
  readonly isNotificationPanelOpen = signal<boolean>(false);
  readonly isWidgetDrawerOpen = signal<boolean>(false);
  readonly isCreateContractModalOpen = signal<boolean>(false);
  readonly isMultiSigSignModalOpen = signal<boolean>(false);
  readonly isSubmitWorkModalOpen = signal<boolean>(false);
  readonly isDisputeModalOpen = signal<boolean>(false);
  readonly isSchedulerModalOpen = signal<boolean>(false);

  // Target objects for modals
  readonly signingTargetMilestone = signal<{ contract: EscrowContract; milestone: Milestone } | null>(null);
  readonly submitTargetMilestone = signal<{ contract: EscrowContract; milestone: Milestone } | null>(null);
  readonly disputeTargetContract = signal<{ contract: EscrowContract; milestone?: Milestone } | null>(null);

  // Primary Entities State Signals
  readonly contracts = signal<EscrowContract[]>(this.getInitialContracts());
  readonly disputes = signal<DisputeCase[]>(this.getInitialDisputes());
  readonly reputationProfiles = signal<ReputationProfile[]>(this.getInitialReputations());
  readonly messages = signal<ChatMessage[]>(this.getInitialMessages());
  readonly scheduledEvents = signal<ScheduledEvent[]>(this.getInitialEvents());
  readonly auditLogs = signal<AuditTransaction[]>(this.getInitialAuditLogs());
  readonly notifications = signal<SystemNotification[]>(this.getInitialNotifications());
  readonly widgets = signal<DashboardWidgetConfig[]>(this.getInitialWidgets());

  // Computed Derived States
  readonly selectedContract = computed(() => {
    return this.contracts().find((c) => c.id === this.selectedContractId()) || this.contracts()[0];
  });

  readonly filteredContracts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.filterStatus();

    return this.contracts().filter((c) => {
      const matchesQuery =
        !query ||
        c.title.toLowerCase().includes(query) ||
        c.contractAddress.toLowerCase().includes(query) ||
        c.freelancerName.toLowerCase().includes(query) ||
        c.clientName.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query);

      const matchesStatus =
        status === 'all' ||
        c.status === status ||
        (status === 'active' && (c.status === 'funded' || c.status === 'in_progress'));

      return matchesQuery && matchesStatus;
    });
  });

  readonly totalLockedEscrowEth = computed(() => {
    return this.contracts().reduce((sum, c) => sum + c.lockedAmountEth, 0);
  });

  readonly totalReleasedEth = computed(() => {
    return this.contracts().reduce((sum, c) => sum + c.releasedAmountEth, 0);
  });

  readonly activeContractsCount = computed(() => {
    return this.contracts().filter((c) => c.status === 'funded' || c.status === 'in_progress').length;
  });

  readonly pendingMultiSigCount = computed(() => {
    let count = 0;
    const currentAddr = this.web3Service.currentAccount().address.toLowerCase();

    for (const contract of this.contracts()) {
      for (const milestone of contract.milestones) {
        if (milestone.status === 'submitted' || milestone.status === 'in_progress') {
          const hasUserSigned = milestone.signatures.some(
            (s) => s.signerAddress.toLowerCase() === currentAddr && s.signed
          );
          if (!hasUserSigned) {
            count++;
          }
        }
      }
    }
    return count;
  });

  readonly activeDisputesCount = computed(() => {
    return this.disputes().filter((d) => d.status === 'open' || d.status === 'under_review').length;
  });

  readonly unreadNotificationsCount = computed(() => {
    return this.notifications().filter((n) => !n.read).length;
  });

  readonly allUpcomingMilestones = computed(() => {
    const list: { contract: EscrowContract; milestone: Milestone }[] = [];
    for (const contract of this.contracts()) {
      for (const milestone of contract.milestones) {
        if (milestone.status !== 'released') {
          list.push({ contract, milestone });
        }
      }
    }
    return list.sort((a, b) => new Date(a.milestone.dueDate).getTime() - new Date(b.milestone.dueDate).getTime());
  });

  constructor() {
    this.loadFromStorage();
  }

  // --- Theme & Role Actions ---
  toggleDarkMode() {
    this.isDarkMode.update((dark) => !dark);
    if (typeof document !== 'undefined') {
      if (this.isDarkMode()) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  setActiveRole(role: UserRole) {
    this.activeRole.set(role);
    this.web3Service.switchAccount(role);
  }

  setActiveTab(tab: 'dashboard' | 'contracts' | 'solidity' | 'disputes' | 'reputation' | 'messages' | 'analytics') {
    this.activeTab.set(tab);
  }

  setSelectedContract(contractId: string) {
    this.selectedContractId.set(contractId);
  }

  // --- Contract & Milestone Lifecycle Operations ---
  createContract(data: {
    title: string;
    description: string;
    category: 'Smart Contract / DeFi' | 'Full-Stack Development' | 'Security Audit' | 'UI/UX Design' | 'AI & Data Science';
    freelancerAddress: string;
    freelancerName: string;
    arbiterAddress: string;
    arbiterName: string;
    milestones: { title: string; description: string; amountEth: number; dueDate: string }[];
  }) {
    const client = this.web3Service.availableAccounts.find((a) => a.role === 'client')!;
    const totalAmountEth = data.milestones.reduce((acc, m) => acc + m.amountEth, 0);
    const ethPrice = this.web3Service.ethPriceUsd();
    const contractAddress = this.web3Service.generateTxHash().slice(0, 42);
    const creationTxHash = this.web3Service.generateTxHash();
    const newId = `escrow-${Date.now().toString().slice(-4)}`;

    const initialSignatures: MultiSigSignature[] = [
      {
        signerAddress: client.address,
        signerName: client.name,
        role: 'client',
        signed: true,
        timestamp: new Date().toISOString(),
        txHash: creationTxHash,
      },
      {
        signerAddress: data.freelancerAddress,
        signerName: data.freelancerName,
        role: 'freelancer',
        signed: false,
      },
      {
        signerAddress: data.arbiterAddress,
        signerName: data.arbiterName,
        role: 'arbiter',
        signed: false,
      },
    ];

    const milestones: Milestone[] = data.milestones.map((m, index) => ({
      id: `m-${newId}-${index + 1}`,
      contractId: newId,
      milestoneIndex: index + 1,
      title: m.title,
      description: m.description,
      amountEth: m.amountEth,
      amountUsd: m.amountEth * ethPrice,
      dueDate: m.dueDate,
      status: 'funded',
      submittedFiles: [],
      requiredSignatures: 2,
      signatures: [
        { signerAddress: client.address, signerName: client.name, role: 'client', signed: false },
        { signerAddress: data.freelancerAddress, signerName: data.freelancerName, role: 'freelancer', signed: false },
        { signerAddress: data.arbiterAddress, signerName: data.arbiterName, role: 'arbiter', signed: false },
      ],
      gasCostGwei: 48,
    }));

    const newContract: EscrowContract = {
      id: newId,
      title: data.title,
      description: data.description,
      category: data.category,
      network: this.web3Service.currentNetwork().name,
      contractAddress,
      creationTxHash,
      createdAt: new Date().toISOString().split('T')[0],
      deadline: data.milestones[data.milestones.length - 1]?.dueDate || '2026-09-30',
      status: 'funded',
      clientAddress: client.address,
      clientName: client.name,
      clientAvatar: client.avatar,
      freelancerAddress: data.freelancerAddress,
      freelancerName: data.freelancerName,
      freelancerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      arbiterAddress: data.arbiterAddress,
      arbiterName: data.arbiterName,
      arbiterAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      totalAmountEth,
      totalAmountUsd: totalAmountEth * ethPrice,
      releasedAmountEth: 0,
      lockedAmountEth: totalAmountEth,
      currency: 'ETH',
      gasEstimatedGwei: 52,
      requiredSignatures: 2,
      totalSigners: 3,
      contractSignatures: initialSignatures,
      milestones,
      contractStateSnapshot: {
        stateCode: 1, // Funded
        escrowBalanceWei: (totalAmountEth * 1e18).toString(),
        arbiterFeePercent: 1.5,
        disputeTimeoutHours: 72,
        autoReleaseDays: 14,
        immutableIpfsTerms: this.web3Service.generateIpfsCid(),
      },
    };

    this.contracts.update((list) => [newContract, ...list]);
    this.selectedContractId.set(newId);

    // Add Audit Log
    this.addAuditLog({
      contractId: newId,
      contractTitle: newContract.title,
      action: 'Contract Deployed & Funded',
      fromAddress: client.address,
      toAddress: contractAddress,
      valueEth: totalAmountEth,
      txHash: creationTxHash,
    });

    // Add Notification
    this.addNotification({
      title: 'New Escrow Contract Deployed',
      message: `Contract "${newContract.title}" was funded with ${totalAmountEth} ETH in multi-sig escrow.`,
      type: 'action_required',
      contractId: newId,
    });

    this.saveToStorage();
  }

  submitMilestoneDeliverable(contractId: string, milestoneId: string, notes: string, files: { name: string; size: string; type: string }[]) {
    const txHash = this.web3Service.generateTxHash();
    const currentAccount = this.web3Service.currentAccount();

    const proofFiles: ProofFile[] = files.map((f, i) => ({
      id: `proof-${Date.now()}-${i}`,
      name: f.name,
      size: f.size,
      type: f.type,
      ipfsHash: this.web3Service.generateIpfsCid(),
      uploadedAt: new Date().toISOString(),
      uploader: currentAccount.name,
      uploaderRole: currentAccount.role,
    }));

    this.contracts.update((contracts) =>
      contracts.map((c) => {
        if (c.id !== contractId) return c;
        const updatedMilestones = c.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          return {
            ...m,
            status: 'submitted' as const,
            submissionNotes: notes,
            submittedFiles: [...m.submittedFiles, ...proofFiles],
          };
        });
        return {
          ...c,
          status: 'in_progress' as const,
          milestones: updatedMilestones,
        };
      })
    );

    const contract = this.contracts().find((c) => c.id === contractId);
    const milestone = contract?.milestones.find((m) => m.id === milestoneId);

    this.addAuditLog({
      contractId,
      contractTitle: contract?.title || 'Contract',
      action: `Milestone #${milestone?.milestoneIndex} Work Submitted to IPFS`,
      fromAddress: currentAccount.address,
      toAddress: contract?.contractAddress || '',
      valueEth: 0,
      txHash,
    });

    this.addNotification({
      title: 'Milestone Deliverable Submitted',
      message: `Work for "${milestone?.title}" has been submitted for Client multi-sig approval.`,
      type: 'milestone_submitted',
      contractId,
      milestoneId,
    });

    // Add chat alert
    this.addChatMessage({
      contractId,
      senderAddress: currentAccount.address,
      senderName: currentAccount.name,
      senderRole: currentAccount.role,
      senderAvatar: currentAccount.avatar,
      text: `🚀 Deliverables submitted for milestone: "${milestone?.title}". Notes: ${notes}`,
      isEncrypted: true,
      attachment: proofFiles[0] ? {
        name: proofFiles[0].name,
        size: proofFiles[0].size,
        ipfsHash: proofFiles[0].ipfsHash,
        type: proofFiles[0].type,
      } : undefined,
      isSystemAlert: true,
      systemActionType: 'submit',
      systemTxHash: txHash,
    });

    this.saveToStorage();
  }

  signMilestoneApproval(contractId: string, milestoneId: string) {
    const currentAccount = this.web3Service.currentAccount();
    const txHash = this.web3Service.generateTxHash();
    const rawSignature = this.web3Service.generateEip712Signature(milestoneId);

    let releasedNow = false;
    let milestoneAmount = 0;

    this.contracts.update((contracts) =>
      contracts.map((c) => {
        if (c.id !== contractId) return c;

        const updatedMilestones = c.milestones.map((m) => {
          if (m.id !== milestoneId) return m;
          milestoneAmount = m.amountEth;

          const updatedSignatures = m.signatures.map((sig) => {
            if (sig.role === currentAccount.role || sig.signerAddress.toLowerCase() === currentAccount.address.toLowerCase()) {
              return {
                ...sig,
                signed: true,
                timestamp: new Date().toISOString(),
                txHash,
                rawSignature,
              };
            }
            return sig;
          });

          const signedCount = updatedSignatures.filter((s) => s.signed).length;
          const isQuorumReached = signedCount >= m.requiredSignatures;

          if (isQuorumReached && m.status !== 'released') {
            releasedNow = true;
            return {
              ...m,
              status: 'released' as const,
              signatures: updatedSignatures,
              releaseTxHash: txHash,
              completedAt: new Date().toISOString().split('T')[0],
            };
          }

          return {
            ...m,
            signatures: updatedSignatures,
            status: signedCount > 0 ? ('approved' as const) : m.status,
          };
        });

        const newReleasedTotal = updatedMilestones
          .filter((m) => m.status === 'released')
          .reduce((sum, m) => sum + m.amountEth, 0);

        const newLockedTotal = Math.max(0, c.totalAmountEth - newReleasedTotal);
        const allCompleted = updatedMilestones.every((m) => m.status === 'released');

        return {
          ...c,
          releasedAmountEth: newReleasedTotal,
          lockedAmountEth: newLockedTotal,
          status: allCompleted ? ('completed' as const) : c.status,
          milestones: updatedMilestones,
        };
      })
    );

    const contract = this.contracts().find((c) => c.id === contractId);
    const milestone = contract?.milestones.find((m) => m.id === milestoneId);

    this.addAuditLog({
      contractId,
      contractTitle: contract?.title || 'Contract',
      action: releasedNow
        ? `Multi-Sig Quorum Met: ${milestoneAmount} ETH Released to Freelancer`
        : `Cryptographic Signature Added by ${currentAccount.role}`,
      fromAddress: currentAccount.address,
      toAddress: contract?.contractAddress || '',
      valueEth: releasedNow ? milestoneAmount : 0,
      txHash,
    });

    if (releasedNow) {
      this.addNotification({
        title: 'Escrow Funds Released On-Chain!',
        message: `${milestoneAmount} ETH for "${milestone?.title}" transferred to freelancer ${contract?.freelancerName}.`,
        type: 'funds_released',
        contractId,
        milestoneId,
      });

      // Update Freelancer reputation trust score
      this.reputationProfiles.update((profiles) =>
        profiles.map((p) => {
          if (p.address.toLowerCase() === contract?.freelancerAddress.toLowerCase()) {
            return {
              ...p,
              totalContractsCompleted: p.totalContractsCompleted + 1,
              totalVolumeTransactedEth: p.totalVolumeTransactedEth + milestoneAmount,
              trustScore: Math.min(100, p.trustScore + 2),
            };
          }
          return p;
        })
      );
    } else {
      this.addNotification({
        title: 'Multi-Sig Signature Added',
        message: `${currentAccount.name} signed milestone approval. 1 more signature needed for release.`,
        type: 'signature_received',
        contractId,
        milestoneId,
      });
    }

    this.saveToStorage();
  }

  batchReleaseApprovedMilestones(contractId: string) {
    const contract = this.contracts().find((c) => c.id === contractId);
    if (!contract) return;

    const approvedMilestones = contract.milestones.filter(
      (m) => m.status === 'submitted' || m.status === 'approved'
    );
    if (approvedMilestones.length === 0) return;

    const txHash = this.web3Service.generateTxHash();
    const currentAccount = this.web3Service.currentAccount();
    const totalBatchEth = approvedMilestones.reduce((acc, m) => acc + m.amountEth, 0);

    this.contracts.update((contracts) =>
      contracts.map((c) => {
        if (c.id !== contractId) return c;
        const updatedMilestones = c.milestones.map((m) => {
          if (approvedMilestones.some((am) => am.id === m.id)) {
            return {
              ...m,
              status: 'released' as const,
              releaseTxHash: txHash,
              completedAt: new Date().toISOString().split('T')[0],
            };
          }
          return m;
        });

        const released = updatedMilestones.filter((m) => m.status === 'released').reduce((sum, m) => sum + m.amountEth, 0);
        return {
          ...c,
          releasedAmountEth: released,
          lockedAmountEth: Math.max(0, c.totalAmountEth - released),
          status: updatedMilestones.every((m) => m.status === 'released') ? ('completed' as const) : c.status,
          milestones: updatedMilestones,
        };
      })
    );

    this.addAuditLog({
      contractId,
      contractTitle: contract.title,
      action: `Gas-Efficient Batch Release (${approvedMilestones.length} Milestones)`,
      fromAddress: currentAccount.address,
      toAddress: contract.freelancerAddress,
      valueEth: totalBatchEth,
      txHash,
    });

    this.addNotification({
      title: 'Batch Milestone Release Confirmed',
      message: `Saved ~42% gas! ${totalBatchEth} ETH released across ${approvedMilestones.length} milestones.`,
      type: 'funds_released',
      contractId,
    });

    this.saveToStorage();
  }

  // --- Dispute Resolution Actions ---
  openDisputeCase(data: {
    contractId: string;
    milestoneId: string;
    category: 'Scope Creep / Incomplete Work' | 'Missed Deadline' | 'Quality & Vulnerabilities' | 'Unresponsive Counterparty' | 'Payment Dispute';
    description: string;
    files: { name: string; size: string; type: string }[];
  }) {
    const contract = this.contracts().find((c) => c.id === data.contractId);
    const milestone = contract?.milestones.find((m) => m.id === data.milestoneId);
    const currentAccount = this.web3Service.currentAccount();
    const txHash = this.web3Service.generateTxHash();

    const proofFiles: ProofFile[] = data.files.map((f, idx) => ({
      id: `disp-proof-${Date.now()}-${idx}`,
      name: f.name,
      size: f.size,
      type: f.type,
      ipfsHash: this.web3Service.generateIpfsCid(),
      uploadedAt: new Date().toISOString(),
      uploader: currentAccount.name,
      uploaderRole: currentAccount.role,
    }));

    const newDispute: DisputeCase = {
      id: `disp-${Date.now().toString().slice(-4)}`,
      contractId: data.contractId,
      milestoneId: data.milestoneId,
      contractTitle: contract?.title || 'Contract',
      milestoneTitle: milestone?.title || 'Milestone',
      amountEth: milestone?.amountEth || 1.5,
      openedBy: currentAccount.role === 'freelancer' ? 'freelancer' : 'client',
      openerAddress: currentAccount.address,
      openerName: currentAccount.name,
      openedAt: new Date().toISOString().split('T')[0],
      reasonCategory: data.category,
      description: data.description,
      evidenceFiles: proofFiles,
      status: 'open',
    };

    this.disputes.update((list) => [newDispute, ...list]);

    // Freeze milestone on contract
    this.contracts.update((contracts) =>
      contracts.map((c) => {
        if (c.id !== data.contractId) return c;
        return {
          ...c,
          status: 'disputed' as const,
          milestones: c.milestones.map((m) =>
            m.id === data.milestoneId ? { ...m, status: 'disputed' as const } : m
          ),
        };
      })
    );

    this.addAuditLog({
      contractId: data.contractId,
      contractTitle: contract?.title || 'Contract',
      action: `Dispute Case Escalated to Arbiter (${data.category})`,
      fromAddress: currentAccount.address,
      toAddress: contract?.arbiterAddress || '',
      valueEth: 0,
      txHash,
    });

    this.addNotification({
      title: 'Dispute Case Opened',
      message: `Dispute filed for milestone "${milestone?.title}". Escalated to decentralized arbiter ${contract?.arbiterName}.`,
      type: 'dispute_alert',
      contractId: data.contractId,
      milestoneId: data.milestoneId,
    });

    this.saveToStorage();
  }

  resolveDisputeByArbiter(disputeId: string, resolution: 'refund_client' | 'release_freelancer' | 'split_50_50' | 'custom_split', clientShare: number, freelancerShare: number, reasoning: string) {
    const dispute = this.disputes().find((d) => d.id === disputeId);
    if (!dispute) return;

    const currentAccount = this.web3Service.currentAccount();
    const txHash = this.web3Service.generateTxHash();
    const arbiterSig = this.web3Service.generateEip712Signature(disputeId);

    const verdict = {
      resolution,
      clientSharePercent: clientShare,
      freelancerSharePercent: freelancerShare,
      reasoning,
      resolvedAt: new Date().toISOString().split('T')[0],
      txHash,
      arbiterSignature: arbiterSig,
    };

    this.disputes.update((disputes) =>
      disputes.map((d) => (d.id === disputeId ? { ...d, status: 'resolved' as const, arbiterVerdict: verdict } : d))
    );

    // Apply payout to contract
    this.contracts.update((contracts) =>
      contracts.map((c) => {
        if (c.id !== dispute.contractId) return c;
        const updatedMilestones = c.milestones.map((m) => {
          if (m.id !== dispute.milestoneId) return m;
          return {
            ...m,
            status: 'released' as const,
            completedAt: new Date().toISOString().split('T')[0],
          };
        });

        const released = updatedMilestones.filter((m) => m.status === 'released').reduce((sum, m) => sum + m.amountEth, 0);
        return {
          ...c,
          status: updatedMilestones.every((m) => m.status === 'released') ? ('completed' as const) : ('in_progress' as const),
          releasedAmountEth: released,
          lockedAmountEth: Math.max(0, c.totalAmountEth - released),
          milestones: updatedMilestones,
        };
      })
    );

    this.addAuditLog({
      contractId: dispute.contractId,
      contractTitle: dispute.contractTitle,
      action: `Arbiter Verdict Executed on Smart Contract (${clientShare}% Client / ${freelancerShare}% Freelancer)`,
      fromAddress: currentAccount.address,
      toAddress: dispute.openerAddress,
      valueEth: dispute.amountEth,
      txHash,
    });

    this.addNotification({
      title: 'Dispute Resolved On-Chain',
      message: `Arbiter verdict issued: ${clientShare}% refund to Client, ${freelancerShare}% release to Freelancer.`,
      type: 'funds_released',
      contractId: dispute.contractId,
    });

    this.saveToStorage();
  }

  // --- Messages & Chat Operations ---
  addChatMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
    const newMessage: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    this.messages.update((list) => [...list, newMessage]);
    this.saveToStorage();
  }

  // --- Scheduler Operations ---
  scheduleEvent(event: Omit<ScheduledEvent, 'id'>) {
    const newEvent: ScheduledEvent = {
      ...event,
      id: `ev-${Date.now()}`,
    };

    this.scheduledEvents.update((list) => [newEvent, ...list]);

    this.addNotification({
      title: 'New Meeting Scheduled',
      message: `"${newEvent.title}" on ${newEvent.date} at ${newEvent.time}.`,
      type: 'action_required',
      contractId: newEvent.contractId,
    });

    this.saveToStorage();
  }

  // --- Notifications & Audit Logging ---
  addNotification(notif: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) {
    const newNotif: SystemNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      timestamp: 'Just now',
      read: false,
    };
    this.notifications.update((list) => [newNotif, ...list]);
  }

  markAllNotificationsRead() {
    this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
    this.saveToStorage();
  }

  addAuditLog(log: Omit<AuditTransaction, 'id' | 'timestamp' | 'gasUsedGwei' | 'gasPriceGwei' | 'blockNumber' | 'status'>) {
    const newLog: AuditTransaction = {
      ...log,
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      gasUsedGwei: 48500,
      gasPriceGwei: this.web3Service.currentNetwork().currentGasGwei,
      blockNumber: 19482014 + Math.floor(Math.random() * 50),
      status: 'confirmed',
    };
    this.auditLogs.update((list) => [newLog, ...list]);
  }

  // --- Widgets Configuration ---
  toggleWidget(widgetId: string) {
    this.widgets.update((list) =>
      list.map((w) => (w.id === widgetId ? { ...w, visible: !w.visible } : w))
    );
    this.saveToStorage();
  }

  reorderWidgets(newOrder: DashboardWidgetConfig[]) {
    this.widgets.set(newOrder);
    this.saveToStorage();
  }

  // --- Local Storage Management ---
  private saveToStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        const state = {
          contracts: this.contracts(),
          disputes: this.disputes(),
          reputationProfiles: this.reputationProfiles(),
          messages: this.messages(),
          scheduledEvents: this.scheduledEvents(),
          auditLogs: this.auditLogs(),
          notifications: this.notifications(),
          widgets: this.widgets(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('Storage sync skipped', e);
      }
    }
  }

  private loadFromStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.contracts) this.contracts.set(parsed.contracts);
          if (parsed.disputes) this.disputes.set(parsed.disputes);
          if (parsed.reputationProfiles) this.reputationProfiles.set(parsed.reputationProfiles);
          if (parsed.messages) this.messages.set(parsed.messages);
          if (parsed.scheduledEvents) this.scheduledEvents.set(parsed.scheduledEvents);
          if (parsed.auditLogs) this.auditLogs.set(parsed.auditLogs);
          if (parsed.notifications) this.notifications.set(parsed.notifications);
          if (parsed.widgets) this.widgets.set(parsed.widgets);
        }
      } catch (e) {
        console.warn('Initial storage load failed, using defaults', e);
      }
    }
  }

  // --- Initial Seed Data Generators ---
  private getInitialContracts(): EscrowContract[] {
    return [
      {
        id: 'escrow-001',
        title: 'DeFi Yield Aggregator Protocol & Staking Vaults',
        description: 'Design and deploy audited Solidity staking vaults, compound reward math, and automated rebalance bots with multi-sig security.',
        category: 'Smart Contract / DeFi',
        network: 'Ethereum Mainnet',
        contractAddress: '0x8F3bC92A1e2478D71295D3bC9F6c507a216D8e42',
        creationTxHash: '0x3a4b918237c02910482019482019385018294719284019284710293847192837',
        createdAt: '2026-08-10',
        deadline: '2026-09-15',
        status: 'in_progress',
        clientAddress: '0x71C8F39294208138012f27568395646197f89E41',
        clientName: 'Sarah Chen (Acme DAO)',
        clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        freelancerAddress: '0x3Ab88019482937e2D4024b42A04812398424F19c',
        freelancerName: 'Alex Rivera (Core Dev)',
        freelancerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        arbiterAddress: '0x98D20398402837492048203849102839482C0E51',
        arbiterName: 'Kleros Guild Arbitrator',
        arbiterAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        totalAmountEth: 6.5,
        totalAmountUsd: 20475,
        releasedAmountEth: 2.0,
        lockedAmountEth: 4.5,
        currency: 'ETH',
        gasEstimatedGwei: 42,
        requiredSignatures: 2,
        totalSigners: 3,
        contractSignatures: [
          { signerAddress: '0x71C8F39294208138012f27568395646197f89E41', signerName: 'Sarah Chen', role: 'client', signed: true, timestamp: '2026-08-10T10:00:00Z', txHash: '0x7a8b...19e' },
          { signerAddress: '0x3Ab88019482937e2D4024b42A04812398424F19c', signerName: 'Alex Rivera', role: 'freelancer', signed: true, timestamp: '2026-08-10T10:15:00Z', txHash: '0x4b9c...28f' },
          { signerAddress: '0x98D20398402837492048203849102839482C0E51', signerName: 'Kleros Guild', role: 'arbiter', signed: false },
        ],
        milestones: [
          {
            id: 'm-001-1',
            contractId: 'escrow-001',
            milestoneIndex: 1,
            title: 'Vault Architecture & Formal Spec',
            description: 'Solidity smart contract interfaces, UML sequence diagrams, and mathematical interest rate models.',
            amountEth: 2.0,
            amountUsd: 6300,
            dueDate: '2026-08-18',
            status: 'released',
            submittedFiles: [
              { id: 'pf-1', name: 'Vault_Specification_v1.pdf', size: '2.4 MB', type: 'application/pdf', ipfsHash: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco', uploadedAt: '2026-08-17', uploader: 'Alex Rivera', uploaderRole: 'freelancer' },
              { id: 'pf-2', name: 'Math_Proofs.ipynb', size: '850 KB', type: 'application/octet-stream', ipfsHash: 'QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx', uploadedAt: '2026-08-17', uploader: 'Alex Rivera', uploaderRole: 'freelancer' },
            ],
            requiredSignatures: 2,
            signatures: [
              { signerAddress: '0x71C8F39294208138012f27568395646197f89E41', signerName: 'Sarah Chen', role: 'client', signed: true, timestamp: '2026-08-18T14:30:00Z', txHash: '0x9c8d...33a' },
              { signerAddress: '0x3Ab88019482937e2D4024b42A04812398424F19c', signerName: 'Alex Rivera', role: 'freelancer', signed: true, timestamp: '2026-08-18T14:32:00Z', txHash: '0x1e2f...77b' },
              { signerAddress: '0x98D20398402837492048203849102839482C0E51', signerName: 'Kleros Guild', role: 'arbiter', signed: false },
            ],
            releaseTxHash: '0x9182736450192837465019283746501928374650192837465019283746501928',
            gasCostGwei: 48,
            completedAt: '2026-08-18',
          },
          {
            id: 'm-001-2',
            contractId: 'escrow-001',
            milestoneIndex: 2,
            title: 'Foundry Test Suite & Multi-Sig Integration',
            description: '100% test coverage with fuzzing tests, reentrancy guards, and multi-sig authorization flow.',
            amountEth: 2.5,
            amountUsd: 7875,
            dueDate: '2026-08-28',
            status: 'submitted',
            submissionNotes: 'All 84 unit tests passing with Invariant test suite. GitHub repo synced to branch release-v1.',
            submittedFiles: [
              { id: 'pf-3', name: 'Foundry_Coverage_Report.html', size: '1.8 MB', type: 'text/html', ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG', uploadedAt: '2026-08-25', uploader: 'Alex Rivera', uploaderRole: 'freelancer' },
              { id: 'pf-4', name: 'Slither_Security_Scan.json', size: '320 KB', type: 'application/json', ipfsHash: 'Qme7ss3ARVgxv6rXqVPiUWZr23mUwsy7BpDgGAivndXLaa', uploadedAt: '2026-08-25', uploader: 'Alex Rivera', uploaderRole: 'freelancer' },
            ],
            requiredSignatures: 2,
            signatures: [
              { signerAddress: '0x71C8F39294208138012f27568395646197f89E41', signerName: 'Sarah Chen', role: 'client', signed: false },
              { signerAddress: '0x3Ab88019482937e2D4024b42A04812398424F19c', signerName: 'Alex Rivera', role: 'freelancer', signed: true, timestamp: '2026-08-25T11:00:00Z', txHash: '0x88bb...991' },
              { signerAddress: '0x98D20398402837492048203849102839482C0E51', signerName: 'Kleros Guild', role: 'arbiter', signed: false },
            ],
            gasCostGwei: 52,
          },
          {
            id: 'm-001-3',
            contractId: 'escrow-001',
            milestoneIndex: 3,
            title: 'Testnet Deployment & Keeper Automation',
            description: 'Deployment on Sepolia / Arbitrum, Chainlink Automation bot integration, and frontend ABI exports.',
            amountEth: 2.0,
            amountUsd: 6300,
            dueDate: '2026-09-12',
            status: 'funded',
            submittedFiles: [],
            requiredSignatures: 2,
            signatures: [
              { signerAddress: '0x71C8F39294208138012f27568395646197f89E41', signerName: 'Sarah Chen', role: 'client', signed: false },
              { signerAddress: '0x3Ab88019482937e2D4024b42A04812398424F19c', signerName: 'Alex Rivera', role: 'freelancer', signed: false },
              { signerAddress: '0x98D20398402837492048203849102839482C0E51', signerName: 'Kleros Guild', role: 'arbiter', signed: false },
            ],
            gasCostGwei: 45,
          },
        ],
        contractStateSnapshot: {
          stateCode: 2,
          escrowBalanceWei: '4500000000000000000',
          arbiterFeePercent: 1.5,
          disputeTimeoutHours: 72,
          autoReleaseDays: 14,
          immutableIpfsTerms: 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
        },
      },
      {
        id: 'escrow-002',
        title: 'Full-Stack Web3 DEX Analytics & Token Dashboard',
        description: 'Modern reactive Angular 21 dashboard tracking pool depths, slippage metrics, gas heatmaps, and whale wallet alerts.',
        category: 'Full-Stack Development',
        network: 'Arbitrum One',
        contractAddress: '0x498a120491823aBc948192847192847192848192',
        creationTxHash: '0x9812739481203948120394810293840192834019283401928340192834019283',
        createdAt: '2026-08-01',
        deadline: '2026-09-05',
        status: 'funded',
        clientAddress: '0x71C8F39294208138012f27568395646197f89E41',
        clientName: 'Sarah Chen (Acme DAO)',
        clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        freelancerAddress: '0x3Ab88019482937e2D4024b42A04812398424F19c',
        freelancerName: 'Alex Rivera (Core Dev)',
        freelancerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        arbiterAddress: '0x98D20398402837492048203849102839482C0E51',
        arbiterName: 'Kleros Guild Arbitrator',
        arbiterAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        totalAmountEth: 4.0,
        totalAmountUsd: 12600,
        releasedAmountEth: 0,
        lockedAmountEth: 4.0,
        currency: 'ETH',
        gasEstimatedGwei: 0.1,
        requiredSignatures: 2,
        totalSigners: 3,
        contractSignatures: [
          { signerAddress: '0x71C8F39294208138012f27568395646197f89E41', signerName: 'Sarah Chen', role: 'client', signed: true },
          { signerAddress: '0x3Ab88019482937e2D4024b42A04812398424F19c', signerName: 'Alex Rivera', role: 'freelancer', signed: true },
          { signerAddress: '0x98D20398402837492048203849102839482C0E51', signerName: 'Kleros Guild', role: 'arbiter', signed: false },
        ],
        milestones: [
          {
            id: 'm-002-1',
            contractId: 'escrow-002',
            milestoneIndex: 1,
            title: 'Design System & Tailwind Architecture',
            description: 'Pixel-perfect UI design system in Tailwind CSS 4 with dark/light themes and charting setup.',
            amountEth: 1.5,
            amountUsd: 4725,
            dueDate: '2026-08-30',
            status: 'in_progress',
            submittedFiles: [],
            requiredSignatures: 2,
            signatures: [
              { signerAddress: '0x71C8F39294208138012f27568395646197f89E41', signerName: 'Sarah Chen', role: 'client', signed: false },
              { signerAddress: '0x3Ab88019482937e2D4024b42A04812398424F19c', signerName: 'Alex Rivera', role: 'freelancer', signed: false },
              { signerAddress: '0x98D20398402837492048203849102839482C0E51', signerName: 'Kleros Guild', role: 'arbiter', signed: false },
            ],
            gasCostGwei: 0.1,
          },
          {
            id: 'm-002-2',
            contractId: 'escrow-002',
            milestoneIndex: 2,
            title: 'The Graph Subgraph Indexing & Live Data API',
            description: 'GraphQL subgraph querying Uniswap v3 swap pools with real-time websocket updates.',
            amountEth: 2.5,
            amountUsd: 7875,
            dueDate: '2026-09-05',
            status: 'funded',
            submittedFiles: [],
            requiredSignatures: 2,
            signatures: [
              { signerAddress: '0x71C8F39294208138012f27568395646197f89E41', signerName: 'Sarah Chen', role: 'client', signed: false },
              { signerAddress: '0x3Ab88019482937e2D4024b42A04812398424F19c', signerName: 'Alex Rivera', role: 'freelancer', signed: false },
              { signerAddress: '0x98D20398402837492048203849102839482C0E51', signerName: 'Kleros Guild', role: 'arbiter', signed: false },
            ],
            gasCostGwei: 0.1,
          },
        ],
        contractStateSnapshot: {
          stateCode: 1,
          escrowBalanceWei: '4000000000000000000',
          arbiterFeePercent: 1.0,
          disputeTimeoutHours: 48,
          autoReleaseDays: 7,
          immutableIpfsTerms: 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR',
        },
      },
      {
        id: 'escrow-003',
        title: 'Smart Contract Penetration Testing & Bytecode Audit',
        description: 'Comprehensive static analysis, symbolic execution, and manual exploit verification of ERC-4337 Account Abstraction paymaster.',
        category: 'Security Audit',
        network: 'Ethereum Mainnet',
        contractAddress: '0x1290384910283948192038491028394819203849',
        creationTxHash: '0x1029384019283019283019283019283019283019283019283019283019283019',
        createdAt: '2026-07-15',
        deadline: '2026-08-05',
        status: 'completed',
        clientAddress: '0x71C8F39294208138012f27568395646197f89E41',
        clientName: 'Sarah Chen (Acme DAO)',
        clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        freelancerAddress: '0x55E901239481290384902839481029384910482A',
        freelancerName: 'Veritas Security Auditor',
        freelancerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        arbiterAddress: '0x98D20398402837492048203849102839482C0E51',
        arbiterName: 'Kleros Guild Arbitrator',
        arbiterAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        totalAmountEth: 3.2,
        totalAmountUsd: 10080,
        releasedAmountEth: 3.2,
        lockedAmountEth: 0,
        currency: 'ETH',
        gasEstimatedGwei: 35,
        requiredSignatures: 2,
        totalSigners: 3,
        contractSignatures: [
          { signerAddress: '0x71C8F39294208138012f27568395646197f89E41', signerName: 'Sarah Chen', role: 'client', signed: true },
          { signerAddress: '0x55E901239481290384902839481029384910482A', signerName: 'Veritas Security', role: 'freelancer', signed: true },
          { signerAddress: '0x98D20398402837492048203849102839482C0E51', signerName: 'Kleros Guild', role: 'arbiter', signed: false },
        ],
        milestones: [
          {
            id: 'm-003-1',
            contractId: 'escrow-003',
            milestoneIndex: 1,
            title: 'Threat Modeling & Automated Vulnerability Scan',
            description: 'Mythril, Slither, and Echidna fuzz testing with initial vulnerability matrix.',
            amountEth: 1.2,
            amountUsd: 3780,
            dueDate: '2026-07-25',
            status: 'released',
            submittedFiles: [
              { id: 'pf-5', name: 'Initial_Vulnerability_Scan.pdf', size: '3.1 MB', type: 'application/pdf', ipfsHash: 'QmPZ9gcCEpqKTo6aq61g2nXGUhM49wbCGLBRQks5DYurCM', uploadedAt: '2026-07-24', uploader: 'Veritas Security', uploaderRole: 'freelancer' },
            ],
            requiredSignatures: 2,
            signatures: [
              { signerAddress: '0x71C8F39294208138012f27568395646197f89E41', signerName: 'Sarah Chen', role: 'client', signed: true },
              { signerAddress: '0x55E901239481290384902839481029384910482A', signerName: 'Veritas Security', role: 'freelancer', signed: true },
              { signerAddress: '0x98D20398402837492048203849102839482C0E51', signerName: 'Kleros Guild', role: 'arbiter', signed: false },
            ],
            releaseTxHash: '0x5511223344556677889900aabbccddeeff11223344556677889900aabbccddee',
            completedAt: '2026-07-25',
          },
          {
            id: 'm-003-2',
            contractId: 'escrow-003',
            milestoneIndex: 2,
            title: 'Final Audit Report & Remediation Verification',
            description: 'Signed executive audit certificate with mitigation verification on GitHub.',
            amountEth: 2.0,
            amountUsd: 6300,
            dueDate: '2026-08-04',
            status: 'released',
            submittedFiles: [
              { id: 'pf-6', name: 'Veritas_Final_Audit_Certificate.pdf', size: '5.2 MB', type: 'application/pdf', ipfsHash: 'QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn', uploadedAt: '2026-08-03', uploader: 'Veritas Security', uploaderRole: 'freelancer' },
            ],
            requiredSignatures: 2,
            signatures: [
              { signerAddress: '0x71C8F39294208138012f27568395646197f89E41', signerName: 'Sarah Chen', role: 'client', signed: true },
              { signerAddress: '0x55E901239481290384902839481029384910482A', signerName: 'Veritas Security', role: 'freelancer', signed: true },
              { signerAddress: '0x98D20398402837492048203849102839482C0E51', signerName: 'Kleros Guild', role: 'arbiter', signed: false },
            ],
            releaseTxHash: '0x66223344556677889900aabbccddeeff11223344556677889900aabbccddee11',
            completedAt: '2026-08-04',
          },
        ],
        contractStateSnapshot: {
          stateCode: 3,
          escrowBalanceWei: '0',
          arbiterFeePercent: 1.0,
          disputeTimeoutHours: 24,
          autoReleaseDays: 7,
          immutableIpfsTerms: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
        },
      },
    ];
  }

  private getInitialDisputes(): DisputeCase[] {
    return [
      {
        id: 'disp-101',
        contractId: 'escrow-001',
        milestoneId: 'm-001-2',
        contractTitle: 'DeFi Yield Aggregator Protocol & Staking Vaults',
        milestoneTitle: 'Foundry Test Suite & Multi-Sig Integration',
        amountEth: 2.5,
        openedBy: 'client',
        openerAddress: '0x71C8F39294208138012f27568395646197f89E41',
        openerName: 'Sarah Chen (Acme DAO)',
        openedAt: '2026-08-25',
        reasonCategory: 'Quality & Vulnerabilities',
        description: 'Preliminary Slither static scan revealed 2 unchecked return values in rebalance logic. Requested patch before multi-sig fund release approval.',
        evidenceFiles: [
          {
            id: 'ef-1',
            name: 'Slither_Warning_Log.txt',
            size: '42 KB',
            type: 'text/plain',
            ipfsHash: 'QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx',
            uploadedAt: '2026-08-25',
            uploader: 'Sarah Chen',
            uploaderRole: 'client',
          },
        ],
        status: 'under_review',
      },
    ];
  }

  private getInitialReputations(): ReputationProfile[] {
    return [
      {
        address: '0x3Ab88019482937e2D4024b42A04812398424F19c',
        name: 'Alex Rivera',
        role: 'freelancer',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        bio: 'Senior Solidity Architect & Full-Stack Web3 Engineer. Specializing in DeFi primitives, EIP-712 multi-sig, and Foundry invariant testing.',
        joinedDate: 'Jan 2024',
        trustScore: 98,
        completionRate: 99.2,
        onTimeDeliveryRate: 97.5,
        disputeWinRate: 100,
        totalContractsCompleted: 34,
        totalVolumeTransactedEth: 184.5,
        gasEfficiencyRating: 'A+ (Top 1% Gas Optimizer)',
        verifiedIdentity: true,
        trustScoreHistory: [
          {
            id: 'tsh-1',
            date: '2024-01-20',
            score: 80,
            delta: 80,
            event: 'On-chain Identity Verified & Keypair Registered',
            category: 'initialization',
            volumeEth: 0,
          },
          {
            id: 'tsh-2',
            date: '2024-03-15',
            score: 84,
            delta: 4,
            event: 'Completed Multi-Sig Escrow: ERC-4626 Vault Module',
            contractTitle: 'ERC-4626 Yield Vault',
            category: 'milestone_completed',
            volumeEth: 4.5,
          },
          {
            id: 'tsh-3',
            date: '2024-05-22',
            score: 88,
            delta: 4,
            event: 'Punctuality Streak: 5 consecutive on-time milestone releases',
            category: 'on_time_streak',
            volumeEth: 12.0,
          },
          {
            id: 'tsh-4',
            date: '2024-08-10',
            score: 86,
            delta: -2,
            event: 'Minor dispute flagged regarding RPC client test coverage',
            contractTitle: 'Uniswap v3 TWAP Oracle',
            category: 'dispute_resolved',
            volumeEth: 8.0,
          },
          {
            id: 'tsh-5',
            date: '2024-10-04',
            score: 90,
            delta: 4,
            event: 'Arbiter Ruled in Favor: Zero security flaws confirmed via Slither',
            contractTitle: 'Uniswap v3 TWAP Oracle',
            category: 'audit_passed',
            volumeEth: 8.0,
          },
          {
            id: 'tsh-6',
            date: '2025-01-18',
            score: 92,
            delta: 2,
            event: 'Minted Soulbound Badge: Zero-Gas Waste Architect',
            category: 'sbt_minted',
            volumeEth: 28.0,
          },
          {
            id: 'tsh-7',
            date: '2025-04-12',
            score: 94,
            delta: 2,
            event: 'Completed High-Value Multi-Sig Escrow: L2 Cross-Bridge Relayer',
            contractTitle: 'L2 Cross-Bridge Relayer',
            category: 'milestone_completed',
            volumeEth: 45.0,
          },
          {
            id: 'tsh-8',
            date: '2025-08-30',
            score: 95,
            delta: 1,
            event: '100% Invariant Coverage on Foundry Fuzzing Milestone',
            contractTitle: 'Decentralized AMM Core',
            category: 'audit_passed',
            volumeEth: 32.0,
          },
          {
            id: 'tsh-9',
            date: '2025-12-15',
            score: 96,
            delta: 1,
            event: 'Minted Soulbound Badge: Diamond Milestone Finisher',
            category: 'sbt_minted',
            volumeEth: 60.0,
          },
          {
            id: 'tsh-10',
            date: '2026-03-20',
            score: 97,
            delta: 1,
            event: 'Completed 30th Escrow Settlement with 5.0 Star Rating',
            contractTitle: 'zk-Rollup Sequencer Validator',
            category: 'milestone_completed',
            volumeEth: 25.0,
          },
          {
            id: 'tsh-11',
            date: '2026-08-19',
            score: 98,
            delta: 1,
            event: 'Milestone #1 of DeFi Yield Aggregator Approved & Released',
            contractTitle: 'DeFi Yield Aggregator Protocol',
            category: 'milestone_completed',
            volumeEth: 6.5,
          },
        ],
        badges: [
          {
            id: 'b-1',
            name: 'Diamond Milestone Finisher',
            icon: 'verified',
            category: 'Execution',
            rarity: 'Legendary',
            issuedAt: '2026-06-15',
            tokenId: '#SBT-0824',
            description: 'Awarded for completing 25+ consecutive high-value milestone contracts without arbitration loss.',
            onChainTx: '0x1290384910283948192038491028394819203849',
          },
          {
            id: 'b-2',
            name: 'Zero-Gas Waste Architect',
            icon: 'local_gas_station',
            category: 'Volume',
            rarity: 'Epic',
            issuedAt: '2026-04-10',
            tokenId: '#SBT-0319',
            description: 'Maintained custom assembly and Yul optimizations saving over 5.2 ETH in aggregate gas for clients.',
            onChainTx: '0x9910283948102938491048203948102938491028',
          },
          {
            id: 'b-3',
            name: 'Multi-Sig Punctual Signer',
            icon: 'security',
            category: 'Punctuality',
            rarity: 'Rare',
            issuedAt: '2026-02-18',
            tokenId: '#SBT-0114',
            description: 'Average multi-sig signature response time under 45 minutes.',
            onChainTx: '0x4410283948102938491048203948102938491044',
          },
        ],
        recentReviews: [
          {
            id: 'rev-1',
            reviewerName: 'Sarah Chen (Acme DAO)',
            reviewerAddress: '0x71C8F39294208138012f27568395646197f89E41',
            reviewerRole: 'Client',
            rating: 5,
            comment: 'Extraordinary Solidity mastery. Delivered invariant fuzzing suites ahead of schedule and the multi-sig authorization flow worked flawlessly.',
            contractTitle: 'DeFi Yield Aggregator Protocol',
            date: '2026-08-19',
            txHash: '0x9182736450192837465019283746501928374650192837465019283746501928',
          },
          {
            id: 'rev-2',
            reviewerName: 'Marcus Vance (Nexus Labs)',
            reviewerAddress: '0x88bb0011223344556677889900aabbccddeeff11',
            reviewerRole: 'Client',
            rating: 5,
            comment: 'Fast communication, clear IPFS artifact hashing, and immaculate code comments. Highly recommended for critical smart contracts.',
            contractTitle: 'Cross-Chain Bridge Relayer',
            date: '2026-07-28',
            txHash: '0x77bb0011223344556677889900aabbccddeeff22',
          },
        ],
      },
      {
        address: '0x71C449294208138012f27568395646197f89E8249',
        name: 'Elena Rostova',
        role: 'freelancer',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        bio: 'L2 Rollup Specialist & Cryptographic Protocol Auditor. Deep expertise in ZK-SNARK verifiers, Arbitrum Nitro, and TSS threshold signatures.',
        joinedDate: 'Jun 2024',
        trustScore: 95,
        completionRate: 98.4,
        onTimeDeliveryRate: 96.0,
        disputeWinRate: 100,
        totalContractsCompleted: 22,
        totalVolumeTransactedEth: 142.0,
        gasEfficiencyRating: 'A (Top 5% ZK Verifier Gas)',
        verifiedIdentity: true,
        trustScoreHistory: [
          {
            id: 'tsh-e1',
            date: '2024-06-10',
            score: 78,
            delta: 78,
            event: 'On-chain Identity Verified & ZK Proof Portfolio Registered',
            category: 'initialization',
            volumeEth: 0,
          },
          {
            id: 'tsh-e2',
            date: '2024-09-18',
            score: 83,
            delta: 5,
            event: 'Completed Escrow Contract: Circom Snark Verifier Pipeline',
            contractTitle: 'Circom Snark Verifier',
            category: 'milestone_completed',
            volumeEth: 6.0,
          },
          {
            id: 'tsh-e3',
            date: '2025-01-25',
            score: 87,
            delta: 4,
            event: 'Completed TSS Key Rotation Module without gas overhead',
            contractTitle: 'Threshold Multi-Sig Vault',
            category: 'milestone_completed',
            volumeEth: 15.0,
          },
          {
            id: 'tsh-e4',
            date: '2025-06-14',
            score: 90,
            delta: 3,
            event: 'Minted SBT: ZK-Prover Optimization Specialist',
            category: 'sbt_minted',
            volumeEth: 30.0,
          },
          {
            id: 'tsh-e5',
            date: '2025-11-02',
            score: 88,
            delta: -2,
            event: 'Brief review delay during testnet RPC hardfork upgrade',
            contractTitle: 'Optimism Bedrock Bridge',
            category: 'on_time_streak',
            volumeEth: 20.0,
          },
          {
            id: 'tsh-e6',
            date: '2026-02-18',
            score: 93,
            delta: 5,
            event: 'Completed 18-milestone multi-chain deployment on Arbitrum',
            contractTitle: 'Arbitrum Nitro Sequencer Node',
            category: 'milestone_completed',
            volumeEth: 50.0,
          },
          {
            id: 'tsh-e7',
            date: '2026-07-10',
            score: 95,
            delta: 2,
            event: 'Audited with Zero Critical Vulnerabilities found by Certora',
            contractTitle: 'Cross-Chain Bridge Liquidity Relayer',
            category: 'audit_passed',
            volumeEth: 35.0,
          },
        ],
        badges: [
          {
            id: 'b-e1',
            name: 'ZK Circuit Architect',
            icon: 'vpn_key',
            category: 'Security',
            rarity: 'Legendary',
            issuedAt: '2026-05-18',
            tokenId: '#SBT-0774',
            description: 'Designed zero-knowledge proof circuits with 100% formal verification.',
            onChainTx: '0x8877665544332211009988776655443322110099',
          },
          {
            id: 'b-e2',
            name: 'L2 Bridge Master',
            icon: 'hub',
            category: 'Execution',
            rarity: 'Epic',
            issuedAt: '2026-03-12',
            tokenId: '#SBT-0512',
            description: 'Deployed and maintained liquidity relayers processing over 500+ ETH safely.',
            onChainTx: '0x7766554433221100998877665544332211008877',
          },
        ],
        recentReviews: [
          {
            id: 'rev-e1',
            reviewerName: 'OpenZeppelin Arbitration DAO',
            reviewerAddress: '0x3F921B7C98d0234a45f94689E27c9F57cD7061E0',
            reviewerRole: 'Arbiter',
            rating: 5,
            comment: 'Flawless compliance with EIP standards. Cryptographic commitments and circuit constraints were rigorously documented.',
            contractTitle: 'Cross-Chain Bridge Liquidity Relayer',
            date: '2026-07-12',
            txHash: '0x6655443322110099887766554433221100776655',
          },
        ],
      },
      {
        address: '0x71C8F39294208138012f27568395646197f89E41',
        name: 'Sarah Chen (Acme DAO)',
        role: 'client',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        bio: 'Core Contributor & Treasury Lead at Acme DAO. Commissioning high-integrity smart contracts, security audits, and decentralized interfaces.',
        joinedDate: 'Nov 2023',
        trustScore: 99,
        completionRate: 100,
        onTimeDeliveryRate: 98.0,
        disputeWinRate: 95.0,
        totalContractsCompleted: 48,
        totalVolumeTransactedEth: 320.8,
        gasEfficiencyRating: 'A (Prompt Escrow Funding)',
        verifiedIdentity: true,
        trustScoreHistory: [
          {
            id: 'tsh-s1',
            date: '2023-11-15',
            score: 85,
            delta: 85,
            event: 'DAO Treasury Multi-Sig Connected & Identity Staked',
            category: 'initialization',
            volumeEth: 0,
          },
          {
            id: 'tsh-s2',
            date: '2024-04-10',
            score: 91,
            delta: 6,
            event: 'Funded 10+ Multi-Sig Escrows with Immediate Upfront Locking',
            category: 'on_time_streak',
            volumeEth: 75.0,
          },
          {
            id: 'tsh-s3',
            date: '2024-11-20',
            score: 95,
            delta: 4,
            event: 'Awarded Instant Escrow Funder Soulbound Badge',
            category: 'sbt_minted',
            volumeEth: 150.0,
          },
          {
            id: 'tsh-s4',
            date: '2025-07-08',
            score: 97,
            delta: 2,
            event: 'Average Multi-Sig Approval Velocity: Under 2.5 hours',
            category: 'on_time_streak',
            volumeEth: 240.0,
          },
          {
            id: 'tsh-s5',
            date: '2026-05-12',
            score: 99,
            delta: 2,
            event: 'Surpassed 300+ ETH Total Transacted with 100% Release Rate',
            category: 'milestone_completed',
            volumeEth: 320.8,
          },
        ],
        badges: [
          {
            id: 'b-4',
            name: 'Instant Escrow Funder',
            icon: 'bolt',
            category: 'Punctuality',
            rarity: 'Legendary',
            issuedAt: '2026-05-12',
            tokenId: '#SBT-0991',
            description: 'Consistently locks 100% of escrow milestone capital upfront upon contract deployment.',
            onChainTx: '0x3344556677889900112233445566778899001122',
          },
          {
            id: 'b-5',
            name: 'Fast Multi-Sig Approver',
            icon: 'verified_user',
            category: 'Execution',
            rarity: 'Epic',
            issuedAt: '2026-03-04',
            tokenId: '#SBT-0402',
            description: 'Signs and releases milestone funds within 4 hours of validated deliverable inspection.',
            onChainTx: '0x2233445566778899001122334455667788990033',
          },
        ],
        recentReviews: [
          {
            id: 'rev-3',
            reviewerName: 'Alex Rivera (Core Dev)',
            reviewerAddress: '0x3Ab88019482937e2D4024b42A04812398424F19c',
            reviewerRole: 'Freelancer',
            rating: 5,
            comment: 'The best client to collaborate with. Clear technical requirements, immediate milestone funding, and prompt multi-sig cryptographic approvals.',
            contractTitle: 'DeFi Yield Aggregator Protocol',
            date: '2026-08-19',
            txHash: '0x9182736450192837465019283746501928374650192837465019283746501928',
          },
        ],
      },
    ];
  }

  private getInitialMessages(): ChatMessage[] {
    return [
      {
        id: 'm-1',
        contractId: 'escrow-001',
        senderAddress: '0x71C8F39294208138012f27568395646197f89E41',
        senderName: 'Sarah Chen (Acme DAO)',
        senderRole: 'client',
        senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        text: 'Hi Alex! The 6.5 ETH has been deposited into the multi-sig escrow contract (2-of-3 threshold). Let me know when you start Milestone 2.',
        timestamp: '10:14 AM',
        isEncrypted: true,
      },
      {
        id: 'm-2',
        contractId: 'escrow-001',
        senderAddress: '0x3Ab88019482937e2D4024b42A04812398424F19c',
        senderName: 'Alex Rivera',
        senderRole: 'freelancer',
        senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        text: 'Confirmed receipt in escrow contract! I have finalized Milestone 1 deliverables with formal proofs. Submitting IPFS hash for review now.',
        timestamp: '10:20 AM',
        isEncrypted: true,
      },
      {
        id: 'm-3',
        contractId: 'escrow-001',
        senderAddress: '0x71C8F39294208138012f27568395646197f89E41',
        senderName: 'Sarah Chen',
        senderRole: 'client',
        senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        text: 'Milestone 1 looks great! I just submitted my cryptographic signature. 2.0 ETH released to your wallet address.',
        timestamp: '11:05 AM',
        isEncrypted: true,
      },
      {
        id: 'm-4',
        contractId: 'escrow-001',
        senderAddress: '0x3Ab88019482937e2D4024b42A04812398424F19c',
        senderName: 'Alex Rivera',
        senderRole: 'freelancer',
        senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        text: 'Working on Milestone 2 Foundry test suite. I have pushed the HTML coverage report to IPFS.',
        timestamp: '02:45 PM',
        isEncrypted: true,
        attachment: {
          name: 'Foundry_Coverage_Report.html',
          size: '1.8 MB',
          ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
          type: 'text/html',
        },
      },
    ];
  }

  private getInitialEvents(): ScheduledEvent[] {
    return [
      {
        id: 'ev-1',
        contractId: 'escrow-001',
        contractTitle: 'DeFi Yield Aggregator Protocol',
        title: 'Milestone 2 Code Walkthrough & Invariant Review',
        description: 'Live architecture walkthrough covering reentrancy guards, yield harvest math, and Foundry test execution.',
        date: '2026-08-28',
        time: '15:00 UTC',
        durationMinutes: 45,
        type: 'milestone_review',
        participants: [
          { name: 'Sarah Chen', role: 'Client', address: '0x71C8F...9E41' },
          { name: 'Alex Rivera', role: 'Freelancer', address: '0x3Ab88...F19c' },
        ],
        meetLink: 'https://meet.jit.si/EscrowMultiSigReview-001',
        status: 'scheduled',
        reminderSet: true,
      },
      {
        id: 'ev-2',
        contractId: 'escrow-002',
        contractTitle: 'Full-Stack Web3 DEX Analytics',
        title: 'Project Kickoff & API Spec Synchronization',
        description: 'Review Tailwind component hierarchy and Uniswap v3 GraphQL endpoint mapping.',
        date: '2026-08-30',
        time: '18:30 UTC',
        durationMinutes: 30,
        type: 'kickoff',
        participants: [
          { name: 'Sarah Chen', role: 'Client', address: '0x71C8F...9E41' },
          { name: 'Alex Rivera', role: 'Freelancer', address: '0x3Ab88...F19c' },
        ],
        meetLink: 'https://meet.jit.si/DEXAnalyticsKickoff-002',
        status: 'scheduled',
        reminderSet: true,
      },
    ];
  }

  private getInitialAuditLogs(): AuditTransaction[] {
    return [
      {
        id: 'audit-1',
        timestamp: '2026-08-25 11:00:15',
        contractId: 'escrow-001',
        contractTitle: 'DeFi Yield Aggregator Protocol',
        action: 'Milestone #2 Deliverable Submitted (IPFS CID: QmYwAPJ...)',
        txHash: '0x88bb192837401928374019283740192837401928374019283740192837409911',
        fromAddress: '0x3Ab88019482937e2D4024b42A04812398424F19c',
        toAddress: '0x8F3bC92A1e2478D71295D3bC9F6c507a216D8e42',
        valueEth: 0,
        gasUsedGwei: 38400,
        gasPriceGwei: 18,
        blockNumber: 19482104,
        status: 'confirmed',
      },
      {
        id: 'audit-2',
        timestamp: '2026-08-18 14:32:40',
        contractId: 'escrow-001',
        contractTitle: 'DeFi Yield Aggregator Protocol',
        action: 'Milestone #1 Quorum Reached (2.0 ETH Transferred to Freelancer)',
        txHash: '0x9182736450192837465019283746501928374650192837465019283746501928',
        fromAddress: '0x8F3bC92A1e2478D71295D3bC9F6c507a216D8e42',
        toAddress: '0x3Ab88019482937e2D4024b42A04812398424F19c',
        valueEth: 2.0,
        gasUsedGwei: 52180,
        gasPriceGwei: 19,
        blockNumber: 19478490,
        status: 'confirmed',
      },
      {
        id: 'audit-3',
        timestamp: '2026-08-10 10:00:22',
        contractId: 'escrow-001',
        contractTitle: 'DeFi Yield Aggregator Protocol',
        action: 'Escrow Contract Deployed & 6.5 ETH Locked in Multi-Sig',
        txHash: '0x3a4b918237c02910482019482019385018294719284019284710293847192837',
        fromAddress: '0x71C8F39294208138012f27568395646197f89E41',
        toAddress: '0x8F3bC92A1e2478D71295D3bC9F6c507a216D8e42',
        valueEth: 6.5,
        gasUsedGwei: 142000,
        gasPriceGwei: 21,
        blockNumber: 19465100,
        status: 'confirmed',
      },
    ];
  }

  private getInitialNotifications(): SystemNotification[] {
    return [
      {
        id: 'n-1',
        title: 'Action Required: Multi-Sig Approval',
        message: 'Alex Rivera submitted deliverables for Milestone 2 of "DeFi Yield Aggregator". Review and sign to authorize payment release.',
        type: 'action_required',
        timestamp: '1 hour ago',
        read: false,
        contractId: 'escrow-001',
        milestoneId: 'm-001-2',
      },
      {
        id: 'n-2',
        title: 'Milestone #1 Payout Confirmed',
        message: '2.0 ETH was successfully transferred from multi-sig vault to Alex Rivera.',
        type: 'funds_released',
        timestamp: 'Aug 18',
        read: true,
        contractId: 'escrow-001',
      },
      {
        id: 'n-3',
        title: 'Upcoming Deadline Warning',
        message: 'Milestone 2 deadline is approaching in 2 days (Aug 28).',
        type: 'deadline_warning',
        timestamp: 'Aug 26',
        read: false,
        contractId: 'escrow-001',
      },
    ];
  }

  private getInitialWidgets(): DashboardWidgetConfig[] {
    return [
      { id: 'w-metrics', title: 'Financial & Multi-Sig Metrics', icon: 'account_balance_wallet', visible: true, order: 1, category: 'metrics' },
      { id: 'w-active-contracts', title: 'Active Escrow Contracts', icon: 'description', visible: true, order: 2, category: 'contracts' },
      { id: 'w-milestones-pipeline', title: 'Milestone Progress Pipeline', icon: 'alt_route', visible: true, order: 3, category: 'milestones' },
      { id: 'w-gas-analytics', title: 'Gas Efficiency & Network Feed', icon: 'local_gas_station', visible: true, order: 4, category: 'gas' },
      { id: 'w-deadlines', title: 'Upcoming Milestone Deadlines', icon: 'event', visible: true, order: 5, category: 'activity' },
      { id: 'w-reputation', title: 'Trust & Reputation Matrix', icon: 'verified', visible: true, order: 6, category: 'activity' },
    ];
  }
}
