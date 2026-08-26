import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EscrowStateService } from '../../services/escrow-state.service';
import { Web3SimulationService } from '../../services/web3-simulation.service';
import { I18nService } from '../../services/i18n.service';
import { AnalyticsExportService } from '../../services/analytics-export.service';
import { EscrowContract, Milestone } from '../../models/escrow.models';

@Component({
  selector: 'app-contracts-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Control Bar: Search, Status Filter, Batch Action, PDF Export -->
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        
        <!-- Search Input -->
        <div class="relative flex-1">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" style="font-size: 18px; width: 18px; height: 18px;">search</mat-icon>
          <input
            type="text"
            [placeholder]="i18n.t('searchContracts')"
            [value]="state.searchQuery()"
            (input)="onSearchInput($event)"
            class="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <!-- Filter Status & Actions -->
        <div class="flex flex-wrap items-center gap-2">
          
          <!-- Status Dropdown -->
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <span class="text-slate-500">{{ i18n.t('filterStatus') }}:</span>
            <select
              [value]="state.filterStatus()"
              (change)="onStatusFilterChange($event)"
              class="bg-transparent text-emerald-400 font-semibold focus:outline-none cursor-pointer text-xs capitalize"
            >
              <option class="bg-slate-900 text-slate-200" value="all">{{ i18n.t('all') }}</option>
              <option class="bg-slate-900 text-slate-200" value="active">{{ i18n.t('inProgress') }}</option>
              <option class="bg-slate-900 text-slate-200" value="completed">{{ i18n.t('completed') }}</option>
              <option class="bg-slate-900 text-slate-200" value="disputed">{{ i18n.t('disputed') }}</option>
            </select>
          </div>

          <!-- Batch Release Button -->
          <button
            type="button"
            (click)="triggerBatchRelease()"
            class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
            title="Batch release all submitted milestones to save 40%+ gas"
          >
            <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">dynamic_feed</mat-icon>
            <span class="hidden sm:inline">{{ i18n.t('batchRelease') }}</span>
          </button>

          <!-- Export Contract PDF -->
          <button
            type="button"
            (click)="exportCurrentPdf()"
            class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            title="Download immutable audit report in PDF"
          >
            <mat-icon class="text-sm text-red-400" style="font-size: 16px; width: 16px; height: 16px;">picture_as_pdf</mat-icon>
            <span class="hidden sm:inline">{{ i18n.t('exportPdf') }}</span>
          </button>

          <!-- New Contract Modal Trigger -->
          <button
            type="button"
            (click)="state.isCreateContractModalOpen.set(true)"
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition active:scale-95"
          >
            <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">add</mat-icon>
            <span class="hidden sm:inline">{{ i18n.t('createContract') }}</span>
          </button>

        </div>

      </div>

      <!-- Contract Selector Carousel / Tabs -->
      <div class="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        @for (contract of state.filteredContracts(); track contract.id) {
          <button
            type="button"
            (click)="state.setSelectedContract(contract.id)"
            class="px-4 py-2.5 rounded-xl text-left border transition shrink-0 max-w-xs flex flex-col justify-between"
            [class.bg-slate-900]="state.selectedContractId() === contract.id"
            [class.border-emerald-500]="state.selectedContractId() === contract.id"
            [class.shadow-lg]="state.selectedContractId() === contract.id"
            [class.shadow-emerald-950/30]="state.selectedContractId() === contract.id"
            [class.bg-slate-950/50]="state.selectedContractId() !== contract.id"
            [class.border-slate-800]="state.selectedContractId() !== contract.id"
            [class.hover:border-slate-700]="state.selectedContractId() !== contract.id"
          >
            <div class="flex items-center justify-between gap-3 w-full">
              <span class="text-xs font-bold truncate" [class.text-emerald-400]="state.selectedContractId() === contract.id" [class.text-slate-200]="state.selectedContractId() !== contract.id">
                {{ contract.title }}
              </span>
              <span class="text-[10px] font-mono font-bold text-white px-1.5 py-0.5 rounded bg-slate-800 shrink-0">
                {{ contract.totalAmountEth }} ETH
              </span>
            </div>
            <div class="flex items-center justify-between gap-2 mt-1 text-[11px] text-slate-400 w-full font-mono">
              <span class="capitalize">{{ contract.status }}</span>
              <span>{{ contract.milestones.length }} Milestones</span>
            </div>
          </button>
        }
      </div>

      <!-- Active Selected Contract Deep Workspace -->
      @let current = state.selectedContract();
      @if (current) {
        <div class="space-y-6">
          
          <!-- Contract Overview Banner -->
          <div class="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-xl">
            <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              
              <div class="space-y-1.5 max-w-3xl">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="px-2 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {{ current.category }}
                  </span>
                  <span class="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-800 text-slate-300">
                    {{ current.network }}
                  </span>
                  <span class="px-2 py-0.5 rounded-full text-xs font-mono font-bold uppercase"
                    [ngClass]="{
                      'bg-emerald-500/20 text-emerald-400': current.status === 'in_progress' || current.status === 'funded',
                      'bg-teal-500/20 text-teal-400': current.status === 'completed',
                      'bg-red-500/20 text-red-400': current.status === 'disputed'
                    }">
                    ● Status: {{ current.status }}
                  </span>
                </div>

                <h2 class="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {{ current.title }}
                </h2>
                <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {{ current.description }}
                </p>
              </div>

              <!-- Financials Badge -->
              <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-right shrink-0 w-full lg:w-auto">
                <div class="text-xs text-slate-400 font-medium">Total Escrow Vault</div>
                <div class="text-2xl font-mono font-bold text-emerald-400">{{ current.totalAmountEth }} ETH</div>
                <div class="text-xs font-mono text-slate-400 mt-0.5">
                  \${{ current.totalAmountUsd.toLocaleString() }} USD
                </div>
                <div class="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between gap-4 font-mono">
                  <span>Released: <b class="text-white">{{ current.releasedAmountEth }} ETH</b></span>
                  <span>Locked: <b class="text-amber-400">{{ current.lockedAmountEth }} ETH</b></span>
                </div>
              </div>

            </div>

            <!-- Multi-Sig Signers Quorum Strip -->
            <div class="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <!-- Signer 1: Client -->
              <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <img [src]="current.clientAvatar" alt="Client" class="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700" referrerpolicy="no-referrer" />
                  <div>
                    <div class="text-xs font-bold text-slate-200">{{ current.clientName }}</div>
                    <div class="text-[10px] font-mono text-slate-500 truncate max-w-[120px]">{{ current.clientAddress.slice(0, 8) }}...</div>
                  </div>
                </div>
                <span class="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Client
                </span>
              </div>

              <!-- Signer 2: Freelancer -->
              <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <img [src]="current.freelancerAvatar" alt="Freelancer" class="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700" referrerpolicy="no-referrer" />
                  <div>
                    <div class="text-xs font-bold text-slate-200">{{ current.freelancerName }}</div>
                    <div class="text-[10px] font-mono text-slate-500 truncate max-w-[120px]">{{ current.freelancerAddress.slice(0, 8) }}...</div>
                  </div>
                </div>
                <span class="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Freelancer
                </span>
              </div>

              <!-- Signer 3: Arbiter -->
              <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <img [src]="current.arbiterAvatar" alt="Arbiter" class="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700" referrerpolicy="no-referrer" />
                  <div>
                    <div class="text-xs font-bold text-slate-200">{{ current.arbiterName }}</div>
                    <div class="text-[10px] font-mono text-slate-500 truncate max-w-[120px]">{{ current.arbiterAddress.slice(0, 8) }}...</div>
                  </div>
                </div>
                <span class="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Arbiter (Quorum 2/3)
                </span>
              </div>

            </div>
          </div>

          <!-- Milestones Detailed Workspace -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <mat-icon class="text-emerald-400 text-lg">timeline</mat-icon>
                <h3 class="text-base font-bold text-white">Project Milestones & Escrow Stages</h3>
              </div>
              <span class="text-xs text-slate-400 font-mono">
                {{ current.milestones.length }} Total Milestones
              </span>
            </div>

            <!-- Milestone Cards Grid -->
            <div class="space-y-4">
              @for (m of current.milestones; track m.id) {
                <div class="p-5 rounded-2xl bg-slate-900 border transition"
                  [ngClass]="{
                    'border-emerald-500/40 bg-slate-900/90': m.status === 'released',
                    'border-amber-500/40 bg-slate-900/90': m.status === 'submitted',
                    'border-slate-800 bg-slate-900': m.status === 'in_progress' || m.status === 'funded',
                    'border-red-500/40 bg-slate-900/90': m.status === 'disputed'
                  }">
                  
                  <!-- Card Header -->
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs"
                        [ngClass]="{
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30': m.status === 'released',
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30': m.status === 'submitted',
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30': m.status === 'in_progress' || m.status === 'funded',
                          'bg-red-500/20 text-red-400 border border-red-500/30': m.status === 'disputed'
                        }">
                        #{{ m.milestoneIndex }}
                      </div>
                      <div>
                        <h4 class="text-sm sm:text-base font-bold text-white">{{ m.title }}</h4>
                        <div class="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                          <span>Due: {{ m.dueDate }}</span>
                          <span>•</span>
                          <span class="text-emerald-400 font-semibold">{{ m.amountEth }} ETH</span>
                          <span>(\${{ m.amountUsd.toLocaleString() }})</span>
                        </div>
                      </div>
                    </div>

                    <!-- Milestone Status Badge -->
                    <div class="flex items-center gap-2">
                      <span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider"
                        [ngClass]="{
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30': m.status === 'released',
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30': m.status === 'submitted',
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30': m.status === 'in_progress' || m.status === 'funded',
                          'bg-red-500/20 text-red-400 border border-red-500/30': m.status === 'disputed'
                        }">
                        {{ m.status }}
                      </span>
                    </div>
                  </div>

                  <!-- Description -->
                  <p class="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed">
                    {{ m.description }}
                  </p>

                  <!-- Submitted Deliverables & IPFS Proofs (if any) -->
                  @if (m.submittedFiles.length > 0) {
                    <div class="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div class="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                        <span class="flex items-center gap-1.5">
                          <mat-icon class="text-indigo-400 text-sm" style="font-size: 16px; width: 16px; height: 16px;">cloud_done</mat-icon>
                          <span>Deliverable Proofs (IPFS Encrypted)</span>
                        </span>
                        <span class="text-[11px] font-mono text-slate-500">{{ m.submittedFiles.length }} File(s)</span>
                      </div>
                      
                      @if (m.submissionNotes) {
                        <p class="text-xs text-slate-300 italic mb-2 px-2 py-1 rounded bg-slate-900 border border-slate-800/80">
                          "{{ m.submissionNotes }}"
                        </p>
                      }

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        @for (file of m.submittedFiles; track file.id) {
                          <div class="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                            <div class="flex items-center gap-2 truncate">
                              <mat-icon class="text-indigo-400 text-sm" style="font-size: 16px; width: 16px; height: 16px;">insert_drive_file</mat-icon>
                              <span class="font-medium text-slate-200 truncate">{{ file.name }}</span>
                              <span class="text-[10px] text-slate-500 font-mono shrink-0">({{ file.size }})</span>
                            </div>
                            <span class="text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 shrink-0">
                              {{ file.ipfsHash.slice(0, 6) }}...
                            </span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Multi-Sig Signatures Quorum Tracker -->
                  <div class="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-semibold text-slate-400">Multi-Sig Signatures:</span>
                      <div class="flex items-center gap-1.5">
                        @for (sig of m.signatures; track sig.signerAddress) {
                          <span
                            class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold flex items-center gap-1"
                            [ngClass]="{
                              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30': sig.signed,
                              'bg-slate-800 text-slate-500 border border-slate-700': !sig.signed
                            }"
                            [title]="sig.signerName + ' (' + sig.role + ')'"
                          >
                            <mat-icon style="font-size: 12px; width: 12px; height: 12px;">
                              {{ sig.signed ? 'check_circle' : 'pending' }}
                            </mat-icon>
                            <span class="capitalize">{{ sig.role }}</span>
                          </span>
                        }
                      </div>
                    </div>

                    <!-- Action Buttons per role -->
                    <div class="flex items-center gap-2">
                      
                      <!-- Submit Work (Freelancer) -->
                      @if (m.status !== 'released' && m.status !== 'disputed') {
                        <button
                          type="button"
                          (click)="openSubmitWorkModal(current, m)"
                          class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                        >
                          <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">upload_file</mat-icon>
                          <span>{{ i18n.t('submitWork') }}</span>
                        </button>
                      }

                      <!-- Cryptographic Authorize / Sign Release (Client / Arbiter) -->
                      @if (m.status !== 'released') {
                        <button
                          type="button"
                          (click)="openSignModal(current, m)"
                          class="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition active:scale-95"
                        >
                          <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">fingerprint</mat-icon>
                          <span>{{ i18n.t('signRelease') }}</span>
                        </button>
                      }

                      <!-- Raise Dispute -->
                      @if (m.status !== 'released' && m.status !== 'disputed') {
                        <button
                          type="button"
                          (click)="openDisputeModal(current, m)"
                          class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium transition"
                          title="Escalate to Arbiter"
                        >
                          <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">gavel</mat-icon>
                          <span>{{ i18n.t('openDispute') }}</span>
                        </button>
                      }

                      @if (m.status === 'released') {
                        <div class="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                          <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">verified</mat-icon>
                          <span>Released (Tx: {{ m.releaseTxHash?.slice(0, 8) }}...)</span>
                        </div>
                      }

                    </div>

                  </div>

                </div>
              }
            </div>

          </div>

        </div>
      }

    </div>
  `,
})
export class ContractsViewComponent {
  readonly state = inject(EscrowStateService);
  readonly web3 = inject(Web3SimulationService);
  readonly i18n = inject(I18nService);
  readonly exportService = inject(AnalyticsExportService);

  onSearchInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.state.searchQuery.set(val);
  }

  onStatusFilterChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.state.filterStatus.set(val);
  }

  openSignModal(contract: EscrowContract, milestone: Milestone) {
    this.state.signingTargetMilestone.set({ contract, milestone });
    this.state.isMultiSigSignModalOpen.set(true);
  }

  openSubmitWorkModal(contract: EscrowContract, milestone: Milestone) {
    this.state.submitTargetMilestone.set({ contract, milestone });
    this.state.isSubmitWorkModalOpen.set(true);
  }

  openDisputeModal(contract: EscrowContract, milestone: Milestone) {
    this.state.disputeTargetContract.set({ contract, milestone });
    this.state.isDisputeModalOpen.set(true);
  }

  triggerBatchRelease() {
    const current = this.state.selectedContract();
    if (current) {
      this.state.batchReleaseApprovedMilestones(current.id);
    }
  }

  exportCurrentPdf() {
    const current = this.state.selectedContract();
    if (current) {
      this.exportService.exportContractPdf(current, this.web3.ethPriceUsd());
    }
  }
}
