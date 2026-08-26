import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { EscrowStateService } from '../../services/escrow-state.service';
import { Web3SimulationService } from '../../services/web3-simulation.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-modals',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <!-- 1. CREATE CONTRACT MODAL -->
    @if (state.isCreateContractModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div class="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <mat-icon style="font-size: 18px; width: 18px; height: 18px;">note_add</mat-icon>
              </div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">
                Deploy New Multi-Sig Escrow Contract
              </h3>
            </div>
            <button (click)="state.isCreateContractModalOpen.set(false)" class="text-slate-400 hover:text-white">
              <mat-icon style="font-size: 18px; width: 18px; height: 18px;">close</mat-icon>
            </button>
          </div>

          <div class="p-6 overflow-y-auto space-y-4 text-xs">
            <div>
              <label for="new-contract-title" class="block text-slate-300 font-medium mb-1">Contract / Project Title</label>
              <input
                id="new-contract-title"
                type="text"
                [(ngModel)]="newContractTitle"
                placeholder="e.g. DeFi Lending Protocol Security Audit"
                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label for="new-contract-desc" class="block text-slate-300 font-medium mb-1">Project Scope & Terms Description</label>
              <textarea
                id="new-contract-desc"
                rows="2"
                [(ngModel)]="newContractDescription"
                placeholder="Detailed deliverables, acceptance criteria, and terms..."
                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
              ></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="new-contract-cat" class="block text-slate-300 font-medium mb-1">Category</label>
                <select
                  id="new-contract-cat"
                  [(ngModel)]="newContractCategory"
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 capitalize"
                >
                  <option value="Smart Contract / DeFi">Smart Contract / DeFi</option>
                  <option value="Full-Stack Development">Full-Stack Development</option>
                  <option value="Security Audit">Security Audit</option>
                  <option value="UI/UX Design">UI/UX Design</option>
                  <option value="AI & Data Science">AI & Data Science</option>
                </select>
              </div>

              <div>
                <label for="new-contract-eth" class="block text-slate-300 font-medium mb-1">Total Budget (ETH)</label>
                <input
                  id="new-contract-eth"
                  type="number"
                  step="0.1"
                  [(ngModel)]="newContractAmountEth"
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
              <div>
                <label for="new-contract-freelancer" class="block text-slate-300 font-sans font-medium mb-1">Freelancer Wallet Address</label>
                <input
                  id="new-contract-freelancer"
                  type="text"
                  [(ngModel)]="newFreelancerAddress"
                  placeholder="0x..."
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 text-[11px]"
                />
              </div>

              <div>
                <label for="new-contract-arbiter" class="block text-slate-300 font-sans font-medium mb-1">Arbiter Wallet (Quorum 2/3)</label>
                <input
                  id="new-contract-arbiter"
                  type="text"
                  [(ngModel)]="newArbiterAddress"
                  placeholder="0x..."
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 text-[11px]"
                />
              </div>
            </div>

            <!-- Milestones configuration preview -->
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div class="flex items-center justify-between text-slate-400 font-semibold">
                <span>Default Milestones (Auto-Split into 2 Stages)</span>
                <span class="text-emerald-400 font-mono font-bold">{{ newContractAmountEth }} ETH Total</span>
              </div>
              <div class="space-y-1 text-slate-300 text-[11px]">
                <div class="flex justify-between">
                  <span>1. Initial Architecture & Unit Tests (50%)</span>
                  <span class="font-mono text-emerald-400">{{ newContractAmountEth / 2 }} ETH</span>
                </div>
                <div class="flex justify-between">
                  <span>2. Mainnet Deployment & Final Handoff (50%)</span>
                  <span class="font-mono text-emerald-400">{{ newContractAmountEth / 2 }} ETH</span>
                </div>
              </div>
            </div>
          </div>

          <div class="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
            <button
              type="button"
              (click)="state.isCreateContractModalOpen.set(false)"
              class="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium"
            >
              Cancel
            </button>

            <button
              type="button"
              (click)="deployContractSubmit()"
              class="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition active:scale-95 flex items-center gap-1.5"
            >
              <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">rocket_launch</mat-icon>
              <span>Deploy & Fund Escrow Contract</span>
            </button>
          </div>

        </div>
      </div>
    }

    <!-- 2. MULTI-SIG SIGN MODAL -->
    @if (state.isMultiSigSignModalOpen()) {
      @let target = state.signingTargetMilestone();
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <mat-icon style="font-size: 20px; width: 20px; height: 20px;">fingerprint</mat-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">EIP-712 Multi-Sig Sign</h3>
                <span class="text-[10px] font-mono text-emerald-400">Cryptographic Authorization</span>
              </div>
            </div>
            <button (click)="state.isMultiSigSignModalOpen.set(false)" class="text-slate-400 hover:text-white">
              <mat-icon style="font-size: 18px; width: 18px; height: 18px;">close</mat-icon>
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono">
              <div class="text-slate-400 text-[11px]">Contract: <span class="text-white">{{ target?.contract?.title }}</span></div>
              <div class="text-slate-400 text-[11px]">Milestone #{{ target?.milestone?.milestoneIndex }}: <span class="text-emerald-400 font-bold">{{ target?.milestone?.title }}</span></div>
              <div class="text-slate-400 text-[11px]">Payout Amount: <span class="text-emerald-400 font-bold">{{ target?.milestone?.amountEth }} ETH</span> (\${{ target?.milestone?.amountUsd }})</div>
            </div>

            <div class="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/20 text-[11px] text-slate-300 font-mono space-y-1">
              <span class="text-emerald-400 font-bold block">Signer Role: {{ state.activeRole() }}</span>
              <span class="text-slate-500 block truncate">Address: {{ web3.currentAccount().address }}</span>
              <span class="text-slate-500 block">Quorum Rule: 2 of 3 valid signatures trigger automated payout</span>
            </div>
          </div>

          <button
            type="button"
            (click)="executeSign()"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition active:scale-95 flex items-center justify-center gap-2"
          >
            <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">lock_open</mat-icon>
            <span>Sign with Private Key & Authorize Release</span>
          </button>
        </div>
      </div>
    }

    <!-- 3. SUBMIT WORK MODAL -->
    @if (state.isSubmitWorkModalOpen()) {
      @let subTarget = state.submitTargetMilestone();
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div class="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <mat-icon style="font-size: 18px; width: 18px; height: 18px;">cloud_upload</mat-icon>
              </div>
              <h3 class="text-sm font-bold text-white">Submit Deliverable & IPFS Proof</h3>
            </div>
            <button (click)="state.isSubmitWorkModalOpen.set(false)" class="text-slate-400 hover:text-white">
              <mat-icon style="font-size: 18px; width: 18px; height: 18px;">close</mat-icon>
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span class="text-slate-400 block font-mono">Milestone: #{{ subTarget?.milestone?.milestoneIndex }} - {{ subTarget?.milestone?.title }}</span>
              <span class="text-emerald-400 font-mono font-bold">{{ subTarget?.milestone?.amountEth }} ETH Escrow Locked</span>
            </div>

            <div>
              <label for="work-submission-notes" class="block text-slate-300 font-medium mb-1">Submission Notes & Changelog</label>
              <textarea
                id="work-submission-notes"
                rows="3"
                [(ngModel)]="workNotes"
                placeholder="Describe completed work, GitHub commit hashes, test coverage..."
                class="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
              ></textarea>
            </div>

            <div>
              <label for="work-deliverable-file" class="block text-slate-300 font-medium mb-1">Attach Deliverable File (Code, PDF, Zip)</label>
              <input
                id="work-deliverable-file"
                type="file"
                (change)="onDeliverableFileSelected($event)"
                class="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs"
              />
              @if (deliverableFile()) {
                <div class="mt-1 text-[11px] text-indigo-400 font-mono">
                  File: {{ deliverableFile()?.name }} ({{ deliverableFile()?.size }})
                </div>
              }
            </div>
          </div>

          <button
            type="button"
            (click)="executeWorkSubmission()"
            class="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">upload_file</mat-icon>
            <span>Submit Deliverable for Client Review</span>
          </button>
        </div>
      </div>
    }

    <!-- 4. OPEN DISPUTE MODAL -->
    @if (state.isDisputeModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div class="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                <mat-icon style="font-size: 18px; width: 18px; height: 18px;">gavel</mat-icon>
              </div>
              <h3 class="text-sm font-bold text-white">Escalate to Arbitration Dispute</h3>
            </div>
            <button (click)="state.isDisputeModalOpen.set(false)" class="text-slate-400 hover:text-white">
              <mat-icon style="font-size: 18px; width: 18px; height: 18px;">close</mat-icon>
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <label for="dispute-category-select" class="block text-slate-300 font-medium mb-1">Dispute Category</label>
              <select
                id="dispute-category-select"
                [(ngModel)]="disputeCategory"
                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 capitalize"
              >
                <option value="Scope Creep / Incomplete Work">Scope Creep / Incomplete Work</option>
                <option value="Missed Deadline">Missed Deadline</option>
                <option value="Quality & Vulnerabilities">Quality & Vulnerabilities</option>
                <option value="Unresponsive Counterparty">Unresponsive Counterparty</option>
                <option value="Payment Dispute">Payment Dispute</option>
              </select>
            </div>

            <div>
              <label for="dispute-description-text" class="block text-slate-300 font-medium mb-1">Statement of Facts & Evidence Summary</label>
              <textarea
                id="dispute-description-text"
                rows="3"
                [(ngModel)]="disputeDescription"
                placeholder="State why the deliverable does not satisfy the smart contract specifications..."
                class="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
              ></textarea>
            </div>
          </div>

          <button
            type="button"
            (click)="executeOpenDispute()"
            class="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-950/40 transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">report_problem</mat-icon>
            <span>Trigger Smart Contract Dispute Case</span>
          </button>
        </div>
      </div>
    }

    <!-- 5. SCHEDULER MODAL -->
    @if (state.isSchedulerModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <mat-icon style="font-size: 18px; width: 18px; height: 18px;">event_available</mat-icon>
              </div>
              <h3 class="text-sm font-bold text-white">Schedule Project Review / Meeting</h3>
            </div>
            <button (click)="state.isSchedulerModalOpen.set(false)" class="text-slate-400 hover:text-white">
              <mat-icon style="font-size: 18px; width: 18px; height: 18px;">close</mat-icon>
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <label for="schedule-meeting-title" class="block text-slate-300 font-medium mb-1">Meeting Title</label>
              <input
                id="schedule-meeting-title"
                type="text"
                [(ngModel)]="meetingTitle"
                placeholder="e.g. Milestone 2 Code Walkthrough"
                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label for="schedule-meeting-date" class="block text-slate-300 font-medium mb-1">Date</label>
                <input
                  id="schedule-meeting-date"
                  type="date"
                  [(ngModel)]="meetingDate"
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label for="schedule-meeting-time" class="block text-slate-300 font-medium mb-1">Time (UTC)</label>
                <input
                  id="schedule-meeting-time"
                  type="time"
                  [(ngModel)]="meetingTime"
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            (click)="executeScheduleMeeting()"
            class="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">calendar_today</mat-icon>
            <span>Save & Broadcast Calendar Invites</span>
          </button>
        </div>
      </div>
    }

    <!-- 6. CUSTOMIZE WIDGETS DRAWER -->
    @if (state.isWidgetDrawerOpen()) {
      <div class="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
        <div class="w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full p-6 space-y-5 overflow-y-auto shadow-2xl">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <mat-icon class="text-emerald-400 text-lg">tune</mat-icon>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">
                Customize Dashboard
              </h3>
            </div>
            <button (click)="state.isWidgetDrawerOpen.set(false)" class="text-slate-400 hover:text-white">
              <mat-icon style="font-size: 18px; width: 18px; height: 18px;">close</mat-icon>
            </button>
          </div>

          <p class="text-xs text-slate-400">
            Toggle which real-time widgets and analytical feeds are displayed on your main overview dashboard:
          </p>

          <div class="space-y-3">
            @for (w of state.widgets(); track w.id) {
              <button
                type="button"
                (click)="state.toggleWidget(w.id)"
                class="w-full text-left p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between"
                [class.bg-slate-950]="w.visible"
                [class.border-emerald-500/40]="w.visible"
                [class.bg-slate-950/40]="!w.visible"
                [class.border-slate-800]="!w.visible"
              >
                <div>
                  <div class="text-xs font-bold" [class.text-white]="w.visible" [class.text-slate-500]="!w.visible">
                    {{ w.title }}
                  </div>
                  <div class="text-[10px] text-slate-500 font-mono">{{ w.category }} widget</div>
                </div>

                <mat-icon
                  class="text-sm transition"
                  [class.text-emerald-400]="w.visible"
                  [class.text-slate-600]="!w.visible"
                  style="font-size: 20px; width: 20px; height: 20px;"
                >
                  {{ w.visible ? 'check_box' : 'check_box_outline_blank' }}
                </mat-icon>
              </button>
            }
          </div>

          <button
            type="button"
            (click)="state.isWidgetDrawerOpen.set(false)"
            class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Save Preferences
          </button>
        </div>
      </div>
    }
  `,
})
export class ModalsComponent {
  readonly state = inject(EscrowStateService);
  readonly web3 = inject(Web3SimulationService);
  readonly i18n = inject(I18nService);

  // Create Contract Form State
  newContractTitle = 'Cross-Chain Bridge Liquidity Relayer';
  newContractDescription = 'Build secure TSS relayer nodes, zero-knowledge fraud proof verifier, and Solidity test suite with Foundry.';
  newContractCategory: 'Smart Contract / DeFi' | 'Full-Stack Development' | 'Security Audit' | 'UI/UX Design' | 'AI & Data Science' = 'Smart Contract / DeFi';
  newContractAmountEth = 3.5;
  newFreelancerAddress = '0x71C...8249';
  newArbiterAddress = '0x3F9...61E0';

  // Submit Work State
  workNotes = 'Completed the core modules. 100% test coverage with Foundry and Echidna fuzzing.';
  deliverableFile = signal<{ name: string; size: string; type: string } | null>(null);

  // Dispute State
  disputeCategory: 'Scope Creep / Incomplete Work' | 'Missed Deadline' | 'Quality & Vulnerabilities' | 'Unresponsive Counterparty' | 'Payment Dispute' = 'Scope Creep / Incomplete Work';
  disputeDescription = 'The submitted deliverable fails fuzzing invariant tests and does not support the required EIP-4337 bundler RPC endpoints.';

  // Scheduler State
  meetingTitle = 'Milestone 2 Architecture & Audit Review';
  meetingDate = '2026-09-02';
  meetingTime = '16:00';

  deployContractSubmit() {
    const halfEth = Math.round((this.newContractAmountEth / 2) * 100) / 100;
    this.state.createContract({
      title: this.newContractTitle,
      description: this.newContractDescription,
      category: this.newContractCategory,
      freelancerAddress: this.newFreelancerAddress,
      freelancerName: 'Elena Rostova (L2 Specialist)',
      arbiterAddress: this.newArbiterAddress,
      arbiterName: 'OpenZeppelin Arbitration DAO',
      milestones: [
        {
          title: 'Architecture Spec & Foundry Test Matrix',
          description: 'Specification documents, interface definitions, and 100% unit test coverage.',
          amountEth: halfEth,
          dueDate: '2026-09-10',
        },
        {
          title: 'Mainnet Relayer Node Deployment & Gas Optimization',
          description: 'Production containerization, RPC relaying pipeline, and gas efficiency verification.',
          amountEth: this.newContractAmountEth - halfEth,
          dueDate: '2026-09-24',
        },
      ],
    });
    this.state.isCreateContractModalOpen.set(false);
  }

  executeSign() {
    const target = this.state.signingTargetMilestone();
    if (target) {
      this.state.signMilestoneApproval(target.contract.id, target.milestone.id);
      this.state.isMultiSigSignModalOpen.set(false);
    }
  }

  onDeliverableFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const f = input.files[0];
      this.deliverableFile.set({
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(2)} MB`,
        type: f.type || 'application/zip',
      });
    }
  }

  executeWorkSubmission() {
    const target = this.state.submitTargetMilestone();
    if (target) {
      const files = this.deliverableFile()
        ? [this.deliverableFile()!]
        : [
            {
              name: 'relayer-core-build.zip',
              size: '4.8 MB',
              type: 'application/zip',
            },
          ];

      this.state.submitMilestoneDeliverable(
        target.contract.id,
        target.milestone.id,
        this.workNotes,
        files
      );
      this.state.isSubmitWorkModalOpen.set(false);
    }
  }

  executeOpenDispute() {
    const target = this.state.disputeTargetContract();
    if (target && target.contract) {
      this.state.openDisputeCase({
        contractId: target.contract.id,
        milestoneId: target.milestone?.id || target.contract.milestones[0].id,
        category: this.disputeCategory,
        description: this.disputeDescription,
        files: [
          {
            name: 'invariant-fuzz-failure.log',
            size: '142 KB',
            type: 'text/plain',
          },
        ],
      });
      this.state.isDisputeModalOpen.set(false);
    }
  }

  executeScheduleMeeting() {
    const currentContract = this.state.selectedContract();
    this.state.scheduleEvent({
      contractId: currentContract.id,
      contractTitle: currentContract.title,
      title: this.meetingTitle,
      date: this.meetingDate,
      time: this.meetingTime,
      durationMinutes: 45,
      type: 'milestone_review',
      description: 'Scheduled automated milestone verification and code review.',
      participants: [
        { name: currentContract.clientName, role: 'Client', address: currentContract.clientAddress },
        { name: currentContract.freelancerName, role: 'Freelancer', address: currentContract.freelancerAddress },
        { name: currentContract.arbiterName, role: 'Arbiter', address: currentContract.arbiterAddress },
      ],
      meetLink: 'https://meet.jit.si/escrow-multisig-room',
      status: 'scheduled',
      reminderSet: true,
    });
    this.state.isSchedulerModalOpen.set(false);
  }
}
