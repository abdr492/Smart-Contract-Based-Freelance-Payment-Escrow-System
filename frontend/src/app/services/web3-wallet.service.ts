import { Injectable, signal, computed } from '@angular/core';
import { BrowserProvider, JsonRpcSigner, Contract, ethers } from 'ethers';

// ─── ABI & Address are exported by the Hardhat deploy script ─────────────────
let CONTRACT_ABI: unknown[] = [];
let DEPLOYED_ADDRESS = '';

try {
  const abiModule = require('../contracts/FreelanceEscrowABI.json');
  const addrModule = require('../contracts/deployedAddress.json');
  CONTRACT_ABI    = abiModule;
  DEPLOYED_ADDRESS = addrModule.address;
} catch {
  console.info('[Web3WalletService] Contract artifacts not found. Running in simulation mode.');
}

const HARDHAT_CHAIN_ID = 31337;
const HARDHAT_CHAIN_HEX = '0x7A69';

const HARDHAT_CHAIN_PARAMS = {
  chainId:   HARDHAT_CHAIN_HEX,
  chainName: 'Hardhat Local EVM',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['http://127.0.0.1:8545'],
};

@Injectable({ providedIn: 'root' })
export class Web3WalletService {

  // ── Reactive Signals ───────────────────────────────────────────────────────
  readonly isMetaMaskInstalled = signal<boolean>(false);
  readonly isConnected         = signal<boolean>(false);
  readonly connectedAddress    = signal<string>('');
  readonly chainId             = signal<number | null>(null);
  readonly networkName         = signal<string>('');
  readonly isOnCorrectNetwork  = computed(() => this.chainId() === HARDHAT_CHAIN_ID);

  private _provider: BrowserProvider | null = null;
  private _signer:   JsonRpcSigner   | null = null;

  constructor() {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      this.isMetaMaskInstalled.set(true);
      this._listenForAccountChanges();
      this._listenForChainChanges();
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async connectWallet(): Promise<string> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to connect a wallet.');
    }

    const ethereum = (window as any).ethereum;
    this._provider = new BrowserProvider(ethereum);

    const accounts: string[] = await this._provider.send('eth_requestAccounts', []);
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Unlock MetaMask and try again.');
    }

    await this._switchToHardhatNetwork();

    this._signer = await this._provider.getSigner();
    const address = await this._signer.getAddress();
    const network = await this._provider.getNetwork();

    this.connectedAddress.set(address);
    this.isConnected.set(true);
    this.chainId.set(Number(network.chainId));
    this.networkName.set(network.name);

    return address;
  }

  disconnectWallet(): void {
    this._provider = null;
    this._signer   = null;
    this.isConnected.set(false);
    this.connectedAddress.set('');
    this.chainId.set(null);
    this.networkName.set('');
  }

  getProvider(): BrowserProvider {
    if (!this._provider) throw new Error('Wallet not connected');
    return this._provider;
  }

  async getSigner(): Promise<JsonRpcSigner> {
    if (!this._signer) throw new Error('Wallet not connected');
    return this._signer;
  }

  async getContractInstance(): Promise<Contract | null> {
    if (!DEPLOYED_ADDRESS || !CONTRACT_ABI || CONTRACT_ABI.length === 0) {
      console.warn('[Web3WalletService] Contract not deployed. Run `npm run hardhat:deploy` first.');
      return null;
    }

    const signer = await this.getSigner();
    return new Contract(DEPLOYED_ADDRESS, CONTRACT_ABI as ethers.InterfaceAbi, signer);
  }

  async getEthBalance(): Promise<string> {
    if (!this._provider || !this.connectedAddress()) return '0.000';
    const balance = await this._provider.getBalance(this.connectedAddress());
    return parseFloat(ethers.formatEther(balance)).toFixed(3);
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private async _switchToHardhatNetwork(): Promise<void> {
    const ethereum = (window as any).ethereum;
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: HARDHAT_CHAIN_HEX }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [HARDHAT_CHAIN_PARAMS],
        });
      } else {
        throw switchError;
      }
    }
  }

  private _listenForAccountChanges(): void {
    const ethereum = (window as any).ethereum;
    ethereum.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        this.disconnectWallet();
      } else {
        this.connectedAddress.set(accounts[0]);
      }
    });
  }

  private _listenForChainChanges(): void {
    const ethereum = (window as any).ethereum;
    ethereum.on('chainChanged', (chainIdHex: string) => {
      this.chainId.set(parseInt(chainIdHex, 16));
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    });
  }
}
