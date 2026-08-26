import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EscrowStateService } from '../../services/escrow-state.service';
import { Web3SimulationService } from '../../services/web3-simulation.service';
import { I18nService } from '../../services/i18n.service';
import { EscrowContract } from '../../models/escrow.models';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Welcome Hero Banner with Quick Stats & Action -->
      <div class="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-5 sm:p-6 relative overflow-hidden">
        <div class="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {{ i18n.t('appTitle') }}
              </h1>
              <span class="px-2 py-0.5 text-xs font-mono rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                2-of-3 Multi-Sig
              </span>
            </div>
            <p class="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Automated milestone disbursements secured by Ethereum smart contracts, multi-signature quorum, and decentralized arbitration.
            </p>
          </div>
          
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              (click)="state.isWidgetDrawerOpen.set(true)"
              class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            >
              <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">tune</mat-icon>
              <span>{{ i18n.t('customizeWidgets') }}</span>
            </button>

            <button
              type="button"
              (click)="state.isCreateContractModalOpen.set(true)"
              class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/50 transition active:scale-95"
            >
              <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">add_circle</mat-icon>
              <span>{{ i18n.t('createContract') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Customizable Widgets Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Metric Card 1: Locked in Escrow -->
        @if (isWidgetVisible('w-metrics')) {
          <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-slate-400">{{ i18n.t('lockedEscrow') }}</span>
              <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <mat-icon style="font-size: 18px; width: 18px; height: 18px;">lock</mat-icon>
              </div>
            </div>
            <div class="mt-2">
              <div class="text-2xl font-bold font-mono text-white">
                {{ state.totalLockedEscrowEth() | number:'1.2-2' }} ETH
              </div>
              <div class="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-mono">
                <span>≈ \${{ (state.totalLockedEscrowEth() * web3.ethPriceUsd()) | number:'1.0-0' }} USD</span>
                <span class="text-emerald-400 text-[10px] font-sans font-semibold">● 100% On-Chain</span>
              </div>
            </div>
          </div>

          <!-- Metric Card 2: Total Released -->
          <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-slate-400">{{ i18n.t('totalReleased') }}</span>
              <div class="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <mat-icon style="font-size: 18px; width: 18px; height: 18px;">payments</mat-icon>
              </div>
            </div>
            <div class="mt-2">
              <div class="text-2xl font-bold font-mono text-emerald-400">
                {{ state.totalReleasedEth() | number:'1.2-2' }} ETH
              </div>
              <div class="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-mono">
                <span>≈ \${{ (state.totalReleasedEth() * web3.ethPriceUsd()) | number:'1.0-0' }} USD</span>
                <span class="text-slate-400 text-[10px]">Settled via Multi-Sig</span>
              </div>
            </div>
          </div>

          <!-- Metric Card 3: Pending Approvals -->
          <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-slate-400">{{ i18n.t('pendingMultiSig') }}</span>
              <div class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <mat-icon style="font-size: 18px; width: 18px; height: 18px;">fingerprint</mat-icon>
              </div>
            </div>
            <div class="mt-2">
              <div class="text-2xl font-bold font-mono text-amber-400">
                {{ state.pendingMultiSigCount() }} Action(s)
              </div>
              <div class="flex items-center gap-1 mt-1 text-xs text-amber-400/80 font-medium">
                <mat-icon class="text-xs" style="font-size: 14px; width: 14px; height: 14px;">warning</mat-icon>
                <span>Requires Cryptographic Sign</span>
              </div>
            </div>
          </div>

          <!-- Metric Card 4: Gas Optimized -->
          <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-slate-400">{{ i18n.t('gasSaved') }}</span>
              <div class="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <mat-icon style="font-size: 18px; width: 18px; height: 18px;">local_gas_station</mat-icon>
              </div>
            </div>
            <div class="mt-2">
              <div class="text-2xl font-bold font-mono text-indigo-300">
                ~42.8%
              </div>
              <div class="flex items-center gap-1 mt-1 text-xs text-slate-400">
                <span>Batch release & Arbitrum L2</span>
              </div>
            </div>
          </div>
        }

      </div>

      <!-- Main Two-Column Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left 2 Columns: Active Contracts & Milestone Progress -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Widget: Active Escrow Contracts -->
          @if (isWidgetVisible('w-active-contracts')) {
            <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <mat-icon class="text-emerald-400 text-lg">account_balance</mat-icon>
                  <h2 class="text-sm font-bold text-white uppercase tracking-wider">
                    {{ i18n.t('activeContracts') }} ({{ state.contracts().length }})
                  </h2>
                </div>
                <button
                  type="button"
                  (click)="state.setActiveTab('contracts')"
                  class="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <span>View All</span>
                  <mat-icon class="text-xs" style="font-size: 14px; width: 14px; height: 14px;">arrow_forward</mat-icon>
                </button>
              </div>

              <!-- Contracts Cards -->
              <div class="space-y-3">
                @for (contract of state.contracts(); track contract.id) {
                  <button
                    type="button"
                    (click)="openContract(contract.id)"
                    class="w-full text-left p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-950/90 transition cursor-pointer group block"
                  >
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div class="flex items-center gap-2.5">
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold"
                          [ngClass]="{
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': contract.status === 'in_progress' || contract.status === 'funded',
                            'bg-teal-500/10 text-teal-400 border border-teal-500/20': contract.status === 'completed',
                            'bg-red-500/10 text-red-400 border border-red-500/20': contract.status === 'disputed'
                          }">
                          {{ contract.status }}
                        </span>
                        <h3 class="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition truncate max-w-md">
                          {{ contract.title }}
                        </h3>
                      </div>
                      <div class="text-right">
                        <span class="text-sm font-mono font-bold text-white">{{ contract.totalAmountEth }} ETH</span>
                        <span class="text-xs text-slate-500 block font-mono">(\${{ contract.totalAmountUsd.toLocaleString() }})</span>
                      </div>
                    </div>

                    <p class="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {{ contract.description }}
                    </p>

                    <!-- Milestone Progress Bar -->
                    <div class="mt-3">
                      <div class="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>Milestone Progress ({{ getCompletedMilestones(contract) }}/{{ contract.milestones.length }})</span>
                        <span class="font-mono text-emerald-400 font-semibold">
                          {{ getProgressPercentage(contract) }}% Released
                        </span>
                      </div>
                      <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                          [style.width.%]="getProgressPercentage(contract)"
                        ></div>
                      </div>
                    </div>

                    <!-- Footer Details: Parties & Address -->
                    <div class="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <div class="flex items-center gap-3">
                        <div class="flex items-center gap-1.5">
                          <span class="text-slate-500 text-[11px]">Client:</span>
                          <span class="font-medium text-slate-300">{{ contract.clientName }}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <span class="text-slate-500 text-[11px]">Freelancer:</span>
                          <span class="font-medium text-slate-300">{{ contract.freelancerName }}</span>
                        </div>
                      </div>

                      <div class="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                        <mat-icon style="font-size: 13px; width: 13px; height: 13px;">link</mat-icon>
                        <span>{{ contract.contractAddress.slice(0, 8) }}...{{ contract.contractAddress.slice(-4) }}</span>
                        <span class="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">{{ contract.network }}</span>
                      </div>
                    </div>
                  </button>
                }
              </div>
            </div>
          }

          <!-- Widget: Milestone Progress Pipeline -->
          @if (isWidgetVisible('w-milestones-pipeline')) {
            <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <mat-icon class="text-teal-400 text-lg">alt_route</mat-icon>
                  <h2 class="text-sm font-bold text-white uppercase tracking-wider">
                    {{ i18n.t('milestoneTracker') }}
                  </h2>
                </div>
                <span class="text-xs text-slate-400 font-mono">
                  Focus: {{ state.selectedContract().title.slice(0, 24) }}...
                </span>
              </div>

              <!-- Pipeline Stepper -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                @for (m of state.selectedContract().milestones; track m.id) {
                  <div class="p-3 rounded-xl border bg-slate-950/80 transition flex flex-col justify-between"
                    [ngClass]="{
                      'border-emerald-500/50 bg-emerald-950/10': m.status === 'released',
                      'border-amber-500/50 bg-amber-950/10': m.status === 'submitted',
                      'border-slate-800': m.status === 'funded' || m.status === 'in_progress',
                      'border-red-500/50 bg-red-950/10': m.status === 'disputed'
                    }">
                    <div>
                      <div class="flex items-center justify-between">
                        <span class="text-[10px] font-mono font-bold text-slate-400">
                          MILESTONE #{{ m.milestoneIndex }}
                        </span>
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold"
                          [ngClass]="{
                            'bg-emerald-500/20 text-emerald-400': m.status === 'released',
                            'bg-amber-500/20 text-amber-400': m.status === 'submitted',
                            'bg-blue-500/20 text-blue-400': m.status === 'in_progress' || m.status === 'funded',
                            'bg-red-500/20 text-red-400': m.status === 'disputed'
                          }">
                          {{ m.status }}
                        </span>
                      </div>
                      <h4 class="text-xs font-bold text-slate-200 mt-1 line-clamp-1">{{ m.title }}</h4>
                      <p class="text-[11px] text-slate-400 mt-1 line-clamp-2">{{ m.description }}</p>
                    </div>

                    <div class="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <span class="font-mono font-bold text-emerald-400">{{ m.amountEth }} ETH</span>
                      <span class="text-[11px] text-slate-500 font-mono">Due: {{ m.dueDate }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

        </div>

        <!-- Right 1 Column: Upcoming Deadlines & Reputation Trust -->
        <div class="space-y-6">
          
          <!-- Widget: Upcoming Deadlines -->
          @if (isWidgetVisible('w-deadlines')) {
            <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <mat-icon class="text-amber-400 text-lg">event_upcoming</mat-icon>
                  <h2 class="text-sm font-bold text-white uppercase tracking-wider">
                    {{ i18n.t('upcomingDeadlines') }}
                  </h2>
                </div>
                <button
                  type="button"
                  (click)="state.isSchedulerModalOpen.set(true)"
                  class="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  title="Schedule New Meeting"
                >
                  <mat-icon style="font-size: 16px; width: 16px; height: 16px;">add</mat-icon>
                </button>
              </div>

              <div class="space-y-3">
                @for (item of state.allUpcomingMilestones().slice(0, 3); track item.milestone.id) {
                  <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
                    <div class="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex flex-col items-center justify-center shrink-0">
                      <span class="text-[9px] font-bold uppercase leading-none font-mono">
                        {{ item.milestone.dueDate.slice(5, 7) }}/{{ item.milestone.dueDate.slice(8, 10) }}
                      </span>
                      <mat-icon class="text-xs mt-0.5" style="font-size: 14px; width: 14px; height: 14px;">alarm</mat-icon>
                    </div>
                    <div class="flex-1 min-w-0">
                      <h4 class="text-xs font-semibold text-slate-200 truncate">{{ item.milestone.title }}</h4>
                      <p class="text-[11px] text-slate-400 truncate">{{ item.contract.title }}</p>
                      <div class="flex items-center justify-between mt-1 text-[11px]">
                        <span class="font-mono text-emerald-400 font-bold">{{ item.milestone.amountEth }} ETH</span>
                        <span class="text-[10px] text-amber-400 font-mono">Due {{ item.milestone.dueDate }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Widget: Reputation & Soulbound Trust Score -->
          @if (isWidgetVisible('w-reputation')) {
            <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <mat-icon class="text-emerald-400 text-lg">verified</mat-icon>
                  <h2 class="text-sm font-bold text-white uppercase tracking-wider">
                    {{ i18n.t('trustScore') }}
                  </h2>
                </div>
                <button
                  type="button"
                  (click)="state.setActiveTab('reputation')"
                  class="text-xs text-emerald-400 hover:underline"
                >
                  View Matrix
                </button>
              </div>

              <!-- Trust Card Preview -->
              <div class="p-4 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 text-center relative overflow-hidden">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-400 text-xl font-mono font-bold shadow-lg shadow-emerald-500/10">
                  98%
                </div>
                <h3 class="text-sm font-bold text-white mt-2">Alex Rivera (Core Dev)</h3>
                <p class="text-[11px] text-slate-400">Verified Smart Contract Architect</p>

                <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-left text-xs">
                  <div>
                    <span class="text-slate-500 text-[10px] block">Contracts</span>
                    <span class="font-mono font-bold text-slate-200">34 Completed</span>
                  </div>
                  <div>
                    <span class="text-slate-500 text-[10px] block">On-Time</span>
                    <span class="font-mono font-bold text-emerald-400">97.5% Rate</span>
                  </div>
                </div>
              </div>
            </div>
          }

        </div>

      </div>

    </div>
  `,
})
export class DashboardComponent {
  readonly state = inject(EscrowStateService);
  readonly web3 = inject(Web3SimulationService);
  readonly i18n = inject(I18nService);

  isWidgetVisible(widgetId: string): boolean {
    const w = this.state.widgets().find((widget) => widget.id === widgetId);
    return w ? w.visible : true;
  }

  openContract(contractId: string) {
    this.state.setSelectedContract(contractId);
    this.state.setActiveTab('contracts');
  }

  getCompletedMilestones(contract: EscrowContract): number {
    return contract.milestones.filter((m) => m.status === 'released').length;
  }

  getProgressPercentage(contract: EscrowContract): number {
    if (!contract.totalAmountEth || contract.totalAmountEth === 0) return 0;
    const pct = (contract.releasedAmountEth / contract.totalAmountEth) * 100;
    return Math.round(pct);
  }
}
