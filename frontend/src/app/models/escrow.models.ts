export type ContractStatus = 'draft' | 'funded' | 'in_progress' | 'completed' | 'disputed' | 'cancelled';

export type MilestoneStatus = 'pending' | 'funded' | 'in_progress' | 'submitted' | 'approved' | 'released' | 'disputed';

export type UserRole = 'client' | 'freelancer' | 'arbiter' | 'auditor';

export type NetworkType = 'Ethereum Mainnet' | 'Arbitrum One' | 'Sepolia Testnet' | 'Base';

export interface MultiSigSignature {
  signerAddress: string;
  signerName: string;
  role: 'client' | 'freelancer' | 'arbiter';
  signed: boolean;
  timestamp?: string;
  txHash?: string;
  rawSignature?: string;
}

export interface ProofFile {
  id: string;
  name: string;
  size: string;
  type: string;
  ipfsHash: string;
  uploadedAt: string;
  uploader: string;
  uploaderRole: string;
}

export interface Milestone {
  id: string;
  contractId: string;
  milestoneIndex: number;
  title: string;
  description: string;
  amountEth: number;
  amountUsd: number;
  dueDate: string;
  status: MilestoneStatus;
  submissionNotes?: string;
  submittedFiles: ProofFile[];
  requiredSignatures: number;
  signatures: MultiSigSignature[];
  releaseTxHash?: string;
  gasCostGwei?: number;
  completedAt?: string;
}

export interface EscrowContract {
  id: string;
  title: string;
  description: string;
  category: 'Smart Contract / DeFi' | 'Full-Stack Development' | 'Security Audit' | 'UI/UX Design' | 'AI & Data Science';
  network: NetworkType;
  contractAddress: string;
  creationTxHash: string;
  createdAt: string;
  deadline: string;
  status: ContractStatus;
  
  // Parties
  clientAddress: string;
  clientName: string;
  clientAvatar: string;
  freelancerAddress: string;
  freelancerName: string;
  freelancerAvatar: string;
  arbiterAddress: string;
  arbiterName: string;
  arbiterAvatar: string;
  
  // Financials
  totalAmountEth: number;
  totalAmountUsd: number;
  releasedAmountEth: number;
  lockedAmountEth: number;
  currency: 'ETH' | 'USDC' | 'DAI';
  gasEstimatedGwei: number;
  
  // Multi-Sig Rules
  requiredSignatures: number; // e.g. 2
  totalSigners: number; // e.g. 3
  contractSignatures: MultiSigSignature[];
  
  // Milestones
  milestones: Milestone[];
  
  // Smart contract storage snapshot
  contractStateSnapshot: {
    stateCode: number; // 0: Created, 1: Funded, 2: Active, 3: Completed, 4: Disputed
    escrowBalanceWei: string;
    arbiterFeePercent: number;
    disputeTimeoutHours: number;
    autoReleaseDays: number;
    immutableIpfsTerms: string;
  };
}

export interface DisputeCase {
  id: string;
  contractId: string;
  milestoneId: string;
  contractTitle: string;
  milestoneTitle: string;
  amountEth: number;
  openedBy: 'client' | 'freelancer';
  openerAddress: string;
  openerName: string;
  openedAt: string;
  reasonCategory: 'Scope Creep / Incomplete Work' | 'Missed Deadline' | 'Quality & Vulnerabilities' | 'Unresponsive Counterparty' | 'Payment Dispute';
  description: string;
  evidenceFiles: ProofFile[];
  status: 'open' | 'under_review' | 'resolved';
  arbiterVerdict?: {
    resolution: 'refund_client' | 'release_freelancer' | 'split_50_50' | 'custom_split';
    clientSharePercent: number;
    freelancerSharePercent: number;
    reasoning: string;
    resolvedAt: string;
    txHash: string;
    arbiterSignature: string;
  };
}

export interface SoulboundBadge {
  id: string;
  name: string;
  icon: string;
  category: 'Execution' | 'Security' | 'Punctuality' | 'Mediation' | 'Volume';
  rarity: 'Legendary' | 'Epic' | 'Rare' | 'Verified';
  issuedAt: string;
  tokenId: string;
  description: string;
  onChainTx: string;
}

export interface TrustScoreHistoryPoint {
  id: string;
  date: string;
  score: number; // 0-100
  delta: number; // e.g. +3, -2
  event: string;
  contractTitle?: string;
  category: 'milestone_completed' | 'on_time_streak' | 'dispute_resolved' | 'sbt_minted' | 'audit_passed' | 'initialization';
  volumeEth?: number;
}

export interface ReputationProfile {
  address: string;
  name: string;
  role: UserRole;
  avatar: string;
  bio: string;
  joinedDate: string;
  trustScore: number; // 0 - 100
  completionRate: number; // %
  onTimeDeliveryRate: number; // %
  disputeWinRate: number; // %
  totalContractsCompleted: number;
  totalVolumeTransactedEth: number;
  gasEfficiencyRating: string;
  verifiedIdentity: boolean;
  trustScoreHistory: TrustScoreHistoryPoint[];
  badges: SoulboundBadge[];
  recentReviews: {
    id: string;
    reviewerName: string;
    reviewerAddress: string;
    reviewerRole: string;
    rating: number;
    comment: string;
    contractTitle: string;
    date: string;
    txHash: string;
  }[];
}

export interface ChatMessage {
  id: string;
  contractId: string;
  senderAddress: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isEncrypted: boolean;
  attachment?: {
    name: string;
    size: string;
    ipfsHash: string;
    type: string;
  };
  isSystemAlert?: boolean;
  systemActionType?: 'deposit' | 'sign' | 'submit' | 'release' | 'dispute';
  systemTxHash?: string;
}

export interface ScheduledEvent {
  id: string;
  contractId: string;
  contractTitle: string;
  title: string;
  description: string;
  date: string;
  time: string;
  durationMinutes: number;
  type: 'milestone_review' | 'kickoff' | 'code_walkthrough' | 'dispute_hearing';
  participants: { name: string; role: string; address: string }[];
  meetLink: string;
  status: 'scheduled' | 'completed' | 'rescheduled';
  reminderSet: boolean;
}

export interface AuditTransaction {
  id: string;
  timestamp: string;
  contractId: string;
  contractTitle: string;
  action: string;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  valueEth: number;
  gasUsedGwei: number;
  gasPriceGwei: number;
  blockNumber: number;
  status: 'confirmed' | 'pending' | 'failed';
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'action_required' | 'milestone_submitted' | 'funds_released' | 'dispute_alert' | 'deadline_warning' | 'signature_received';
  timestamp: string;
  read: boolean;
  contractId?: string;
  milestoneId?: string;
  actionUrl?: string;
}

export interface DashboardWidgetConfig {
  id: string;
  title: string;
  icon: string;
  visible: boolean;
  order: number;
  category: 'metrics' | 'contracts' | 'milestones' | 'charts' | 'gas' | 'activity';
}
