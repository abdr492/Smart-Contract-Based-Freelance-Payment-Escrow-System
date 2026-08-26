import { Injectable, signal, computed } from '@angular/core';
import { NetworkType, UserRole } from '../models/escrow.models';

export interface WalletAccount {
  address: string;
  name: string;
  role: UserRole;
  balanceEth: number;
  avatar: string;
  ensDomain?: string;
}

export interface NetworkConfig {
  name: NetworkType;
  chainId: number;
  currency: string;
  blockExplorer: string;
  currentGasGwei: number;
  isL2: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class Web3SimulationService {
  // Preset accounts representing parties in the multi-sig escrow ecosystem
  readonly availableAccounts: WalletAccount[] = [
    {
      address: '0x71C8F39294208138012f27568395646197f89E41',
      name: 'Sarah Chen (Acme DAO)',
      role: 'client',
      balanceEth: 14.85,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      ensDomain: 'acmedao.eth',
    },
    {
      address: '0x3Ab88019482937e2D4024b42A04812398424F19c',
      name: 'Alex Rivera (Core Dev)',
      role: 'freelancer',
      balanceEth: 5.42,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      ensDomain: 'alexrivera.eth',
    },
    {
      address: '0x98D20398402837492048203849102839482C0E51',
      name: 'Kleros Guild Arbitrator',
      role: 'arbiter',
      balanceEth: 28.10,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      ensDomain: 'klerosguild.eth',
    },
    {
      address: '0x55E901239481290384902839481029384910482A',
      name: 'Veritas Security Auditor',
      role: 'auditor',
      balanceEth: 9.30,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      ensDomain: 'veritas-audit.eth',
    },
  ];

  readonly networks: NetworkConfig[] = [
    {
      name: 'Ethereum Mainnet',
      chainId: 1,
      currency: 'ETH',
      blockExplorer: 'https://etherscan.io',
      currentGasGwei: 18,
      isL2: false,
    },
    {
      name: 'Arbitrum One',
      chainId: 42161,
      currency: 'ETH',
      blockExplorer: 'https://arbiscan.io',
      currentGasGwei: 0.1,
      isL2: true,
    },
    {
      name: 'Base',
      chainId: 8453,
      currency: 'ETH',
      blockExplorer: 'https://basescan.org',
      currentGasGwei: 0.05,
      isL2: true,
    },
    {
      name: 'Sepolia Testnet',
      chainId: 11155111,
      currency: 'SepoliaETH',
      blockExplorer: 'https://sepolia.etherscan.io',
      currentGasGwei: 3,
      isL2: false,
    },
  ];

  readonly ethPriceUsd = signal<number>(3150);
  readonly currentNetwork = signal<NetworkConfig>(this.networks[0]);
  readonly currentAccount = signal<WalletAccount>(this.availableAccounts[0]);
  readonly isConnected = signal<boolean>(true);
  readonly isSigningInProgress = signal<boolean>(false);
  readonly lastTransactionHash = signal<string | null>(null);

  readonly formattedBalanceUsd = computed(() => {
    const usd = this.currentAccount().balanceEth * this.ethPriceUsd();
    return usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  });

  readonly shortAddress = computed(() => {
    const addr = this.currentAccount().address;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  });

  switchAccount(roleOrAddress: UserRole | string) {
    const found = this.availableAccounts.find(
      (a) => a.role === roleOrAddress || a.address.toLowerCase() === roleOrAddress.toLowerCase()
    );
    if (found) {
      this.currentAccount.set(found);
    }
  }

  switchNetwork(networkName: NetworkType) {
    const found = this.networks.find((n) => n.name === networkName);
    if (found) {
      this.currentNetwork.set(found);
    }
  }

  generateTxHash(): string {
    const hex = '0123456789abcdef';
    let result = '0x';
    for (let i = 0; i < 64; i++) {
      result += hex.charAt(Math.floor(Math.random() * hex.length));
    }
    return result;
  }

  generateIpfsCid(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'Qm';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateEip712Signature(payload?: string): string {
    const hex = '0123456789abcdef';
    let result = '0x';
    const seed = payload ? payload.length : 0;
    for (let i = 0; i < 130; i++) {
      result += hex.charAt((Math.floor(Math.random() * hex.length) + seed) % hex.length);
    }
    return result + '1b';
  }

  estimateGasForAction(action: 'deposit' | 'sign' | 'submit' | 'release' | 'dispute' | 'batch'): {
    gasUnits: number;
    costEth: number;
    costUsd: number;
  } {
    const gasGwei = this.currentNetwork().currentGasGwei;
    let gasUnits = 45000;
    if (action === 'deposit') gasUnits = 42000;
    if (action === 'submit') gasUnits = 38000;
    if (action === 'sign') gasUnits = 52000;
    if (action === 'release') gasUnits = 68000;
    if (action === 'dispute') gasUnits = 49000;
    if (action === 'batch') gasUnits = 79000;

    const costEth = (gasUnits * gasGwei) / 1e9;
    const costUsd = costEth * this.ethPriceUsd();
    return { gasUnits, costEth, costUsd };
  }
}
