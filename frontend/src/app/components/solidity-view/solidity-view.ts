import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SolidityContractService, ContractFunctionDef } from '../../services/solidity-contract.service';
import { Web3SimulationService } from '../../services/web3-simulation.service';
import { EscrowStateService } from '../../services/escrow-state.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-solidity-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Contract Header & Metadata -->
      <div class="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-bold text-white tracking-tight">
              FreelanceEscrowMultiSig.sol
            </h2>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Verified Source Code
            </span>
          </div>
          <p class="text-xs text-slate-400 font-mono mt-1">
            Contract: {{ solidityService.contractAddress }} • Compiler: {{ solidityService.compilerVersion }} • {{ solidityService.optimization }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="copyCode()"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">
              {{ copied() ? 'check' : 'content_copy' }}
            </mat-icon>
            <span>{{ copied() ? 'Copied Source!' : 'Copy Code' }}</span>
          </button>
        </div>
      </div>

      <!-- Main Tabs: Agreement Rules vs Interactive Functions vs Data Storage -->
      <div class="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          (click)="activeSubTab.set('source')"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition"
          [class.bg-emerald-500/10]="activeSubTab() === 'source'"
          [class.text-emerald-400]="activeSubTab() === 'source'"
          [class.border]="activeSubTab() === 'source'"
          [class.border-emerald-500/30]="activeSubTab() === 'source'"
          [class.text-slate-400]="activeSubTab() !== 'source'"
        >
          <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">integration_instructions</mat-icon>
          <span>Agreement Rules & Logic</span>
        </button>

        <button
          type="button"
          (click)="activeSubTab.set('abi')"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition"
          [class.bg-emerald-500/10]="activeSubTab() === 'abi'"
          [class.text-emerald-400]="activeSubTab() === 'abi'"
          [class.border]="activeSubTab() === 'abi'"
          [class.border-emerald-500/30]="activeSubTab() === 'abi'"
          [class.text-slate-400]="activeSubTab() !== 'abi'"
        >
          <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">terminal</mat-icon>
          <span>Interactive Function Console</span>
        </button>

        <button
          type="button"
          (click)="activeSubTab.set('state')"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition"
          [class.bg-emerald-500/10]="activeSubTab() === 'state'"
          [class.text-emerald-400]="activeSubTab() === 'state'"
          [class.border]="activeSubTab() === 'state'"
          [class.border-emerald-500/30]="activeSubTab() === 'state'"
          [class.text-slate-400]="activeSubTab() !== 'state'"
        >
          <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">memory</mat-icon>
          <span>Live Data Storage Inspector</span>
        </button>
      </div>

      <!-- Tab 1: Source Code View -->
      @if (activeSubTab() === 'source') {
        <div class="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
          <div class="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-400">
            <span class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
              <span class="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span class="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
              <span class="text-slate-300 ml-2">contracts/FreelanceEscrowMultiSig.sol</span>
            </span>
            <span>EVM Istanbul/Shanghai Target</span>
          </div>

          <pre class="p-4 sm:p-6 text-xs sm:text-sm font-mono text-emerald-300/90 overflow-x-auto leading-relaxed max-h-[600px] scrollbar-thin">
            <code>{{ solidityService.soliditySourceCode }}</code>
          </pre>
        </div>
      }

      <!-- Tab 2: Interactive ABI Caller -->
      @if (activeSubTab() === 'abi') {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Functions List -->
          <div class="space-y-3">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Contract Write & Read Functions
            </h3>
            <div class="space-y-2">
              @for (fn of solidityService.contractAbi; track fn.name) {
                <button
                  type="button"
                  (click)="selectedFunction.set(fn)"
                  class="w-full p-3 rounded-xl border text-left transition flex items-center justify-between"
                  [class.bg-slate-900]="selectedFunction()?.name === fn.name"
                  [class.border-emerald-500]="selectedFunction()?.name === fn.name"
                  [class.bg-slate-950/60]="selectedFunction()?.name !== fn.name"
                  [class.border-slate-800]="selectedFunction()?.name !== fn.name"
                >
                  <div>
                    <div class="text-xs font-mono font-bold text-white">{{ fn.name }}()</div>
                    <div class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{{ fn.description }}</div>
                  </div>
                  <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {{ fn.stateMutability }}
                  </span>
                </button>
              }
            </div>
          </div>

          <!-- Function Execution Console -->
          <div class="lg:col-span-2 space-y-4">
            @let fn = selectedFunction();
            @if (fn) {
              <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h4 class="text-sm font-mono font-bold text-emerald-400">function {{ fn.name }}()</h4>
                    <p class="text-xs text-slate-400 mt-0.5">{{ fn.description }}</p>
                  </div>
                  <span class="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Est: {{ fn.exampleGas }}
                  </span>
                </div>

                <!-- Parameters Form -->
                <div class="space-y-3">
                  @for (input of fn.inputs; track input.name) {
                    <div>
                      <label [for]="'abi-input-' + input.name" class="block text-xs font-mono text-slate-300 mb-1">
                        {{ input.name }} <span class="text-slate-500">({{ input.type }})</span>
                      </label>
                      <input
                        type="text"
                        [id]="'abi-input-' + input.name"
                        [placeholder]="input.type === 'uint256' ? '0' : '0x... or IPFS hash'"
                        class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  }
                  @if (fn.inputs.length === 0) {
                    <p class="text-xs text-slate-500 font-mono italic">No input arguments required for this function.</p>
                  }
                </div>

                <!-- Caller Account Info -->
                <div class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <span class="text-slate-400">Caller (msg.sender):</span>
                  <span class="text-emerald-400">{{ web3.shortAddress() }} ({{ state.activeRole() }})</span>
                </div>

                <!-- Execute Button -->
                <button
                  type="button"
                  (click)="simulateContractCall(fn.name)"
                  [disabled]="isExecuting()"
                  class="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">
                    {{ isExecuting() ? 'hourglass_top' : 'send' }}
                  </mat-icon>
                  <span>{{ isExecuting() ? 'Broadcasting to EVM Node...' : 'Simulate Transaction Call' }}</span>
                </button>

                <!-- Execution Output Log -->
                @if (executionLog()) {
                  <div class="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs font-mono space-y-1">
                    <div class="text-emerald-400 font-bold flex items-center gap-1.5">
                      <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">check_circle</mat-icon>
                      <span>Transaction Confirmed in Block #19482109</span>
                    </div>
                    <div class="text-slate-400 truncate">Tx Hash: {{ executionLog()?.txHash }}</div>
                    <div class="text-slate-500">Gas Used: 48,210 • Effective Gas Price: 18 Gwei</div>
                  </div>
                }
              </div>
            }
          </div>

        </div>
      }

      <!-- Tab 3: EVM Storage Slot Inspector -->
      @if (activeSubTab() === 'state') {
        @let c = state.selectedContract();
        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">
                On-Chain Storage Slot Inspector
              </h3>
              <p class="text-xs text-slate-400 font-mono">Contract Target: {{ c.contractAddress }}</p>
            </div>
            <span class="text-xs font-mono text-emerald-400">Network: {{ c.network }}</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
            
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span class="text-slate-500 block text-[10px]">SLOT 0: totalEscrowAmount</span>
              <span class="text-emerald-400 font-bold text-sm">{{ c.totalAmountEth }} ETH ({{ c.contractStateSnapshot.escrowBalanceWei }} wei)</span>
            </div>

            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span class="text-slate-500 block text-[10px]">SLOT 1: currentState (Enum)</span>
              <span class="text-white font-bold text-sm">StateCode: {{ c.contractStateSnapshot.stateCode }} (Active)</span>
            </div>

            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span class="text-slate-500 block text-[10px]">SLOT 2: requiredSignatures</span>
              <span class="text-amber-400 font-bold text-sm">2 of 3 (Multi-Sig Quorum)</span>
            </div>

            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span class="text-slate-500 block text-[10px]">SLOT 3: arbiterFeePercent</span>
              <span class="text-slate-300 font-bold text-sm">{{ c.contractStateSnapshot.arbiterFeePercent }}% Fixed Fee</span>
            </div>

            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 md:col-span-2">
              <span class="text-slate-500 block text-[10px]">SLOT 4: immutable termsIpfsHash (bytes32)</span>
              <span class="text-indigo-400 font-bold text-xs truncate block">{{ c.contractStateSnapshot.immutableIpfsTerms }}</span>
            </div>

          </div>
        </div>
      }

    </div>
  `,
})
export class SolidityViewComponent {
  readonly solidityService = inject(SolidityContractService);
  readonly web3 = inject(Web3SimulationService);
  readonly state = inject(EscrowStateService);
  readonly i18n = inject(I18nService);

  readonly activeSubTab = signal<'source' | 'abi' | 'state'>('source');
  readonly selectedFunction = signal<ContractFunctionDef | null>(this.solidityService.contractAbi[0]);
  readonly copied = signal<boolean>(false);
  readonly isExecuting = signal<boolean>(false);
  readonly executionLog = signal<{ txHash: string } | null>(null);

  copyCode() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.solidityService.soliditySourceCode);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }

  simulateContractCall(fnName: string) {
    this.isExecuting.set(true);
    setTimeout(() => {
      const txHash = this.web3.generateTxHash();
      this.executionLog.set({ txHash });
      this.isExecuting.set(false);

      this.state.addAuditLog({
        contractId: this.state.selectedContractId(),
        contractTitle: this.state.selectedContract().title,
        action: `ABI Call Executed: ${fnName}()`,
        fromAddress: this.web3.currentAccount().address,
        toAddress: this.solidityService.contractAddress,
        valueEth: 0,
        txHash,
      });
    }, 900);
  }
}
