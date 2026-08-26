import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EscrowStateService } from '../../services/escrow-state.service';
import { Web3SimulationService } from '../../services/web3-simulation.service';
import { I18nService } from '../../services/i18n.service';
import { DisputeCase } from '../../models/escrow.models';

@Component({
  selector: 'app-disputes-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Banner -->
      <div class="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-bold text-white tracking-tight">
              {{ i18n.t('navDisputes') }}
            </h2>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/30">
              Decentralized Arbitration Court
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Neutral third-party and multi-sig mediation for contested deliverables, scope disputes, and on-chain fund splits.
          </p>
        </div>

        <button
          type="button"
          (click)="openDisputeDialog()"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-semibold transition"
        >
          <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">add_alert</mat-icon>
          <span>{{ i18n.t('openDispute') }}</span>
        </button>
      </div>

      <!-- Disputes Cases Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Disputes List (Left 1 Col) -->
        <div class="space-y-3">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Arbitration Cases ({{ state.disputes().length }})
          </h3>

          <div class="space-y-2">
            @for (disp of state.disputes(); track disp.id) {
              <button
                type="button"
                (click)="selectedDispute.set(disp)"
                class="w-full p-4 rounded-xl border text-left transition flex flex-col justify-between"
                [class.bg-slate-900]="selectedDispute()?.id === disp.id"
                [class.border-red-500]="selectedDispute()?.id === disp.id"
                [class.bg-slate-950/60]="selectedDispute()?.id !== disp.id"
                [class.border-slate-800]="selectedDispute()?.id !== disp.id"
              >
                <div class="flex items-center justify-between w-full">
                  <span class="text-xs font-bold text-white truncate max-w-[180px]">{{ disp.contractTitle }}</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold"
                    [class.bg-red-500/20]="disp.status === 'open' || disp.status === 'under_review'"
                    [class.text-red-400]="disp.status === 'open' || disp.status === 'under_review'"
                    [class.bg-emerald-500/20]="disp.status === 'resolved'"
                    [class.text-emerald-400]="disp.status === 'resolved'">
                    {{ disp.status }}
                  </span>
                </div>
                <div class="text-[11px] text-slate-400 mt-1 line-clamp-1">
                  {{ disp.reasonCategory }}
                </div>
                <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 w-full">
                  <span class="text-amber-400 font-bold">{{ disp.amountEth }} ETH Disputed</span>
                  <span>{{ disp.openedAt }}</span>
                </div>
              </button>
            }

            @if (state.disputes().length === 0) {
              <div class="p-8 text-center rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500">
                No active dispute cases filed. All escrow contracts operating peacefully!
              </div>
            }
          </div>
        </div>

        <!-- Dispute Case Deep View (Right 2 Cols) -->
        <div class="lg:col-span-2 space-y-4">
          @let d = selectedDispute();
          @if (d) {
            <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              
              <!-- Dispute Header -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      CASE {{ d.id.toUpperCase() }}
                    </span>
                    <span class="text-xs text-slate-400 font-mono">Opened: {{ d.openedAt }}</span>
                  </div>
                  <h3 class="text-lg font-bold text-white mt-1">{{ d.contractTitle }}</h3>
                  <p class="text-xs text-slate-400 font-mono">Target Milestone: {{ d.milestoneTitle }}</p>
                </div>

                <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-right shrink-0">
                  <span class="text-[10px] text-slate-500 block uppercase font-mono">Contested Value</span>
                  <span class="text-lg font-mono font-bold text-amber-400">{{ d.amountEth }} ETH</span>
                </div>
              </div>

              <!-- Reason & Evidence -->
              <div class="space-y-3">
                <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <mat-icon class="text-red-400 text-sm" style="font-size: 16px; width: 16px; height: 16px;">report_problem</mat-icon>
                  <span>Category: {{ d.reasonCategory }}</span>
                </h4>
                <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  {{ d.description }}
                </div>
              </div>

              <!-- Evidence Files -->
              @if (d.evidenceFiles.length > 0) {
                <div class="space-y-2">
                  <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Attached Evidence Artifacts (IPFS)
                  </h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    @for (ef of d.evidenceFiles; track ef.id) {
                      <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2 truncate">
                          <mat-icon class="text-red-400 text-sm" style="font-size: 16px; width: 16px; height: 16px;">attachment</mat-icon>
                          <span class="font-medium text-slate-200 truncate">{{ ef.name }}</span>
                        </div>
                        <span class="font-mono text-slate-500 text-[10px] shrink-0">{{ ef.ipfsHash.slice(0, 6) }}...</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Resolved Verdict Info (if resolved) -->
              @if (d.status === 'resolved' && d.arbiterVerdict) {
                <div class="p-5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <mat-icon style="font-size: 18px; width: 18px; height: 18px;">gavel</mat-icon>
                      <span>Arbiter Verdict Executed</span>
                    </span>
                    <span class="text-xs font-mono text-slate-400">Resolved: {{ d.arbiterVerdict.resolvedAt }}</span>
                  </div>

                  <p class="text-xs text-slate-300 italic leading-relaxed">
                    "{{ d.arbiterVerdict.reasoning }}"
                  </p>

                  <div class="grid grid-cols-2 gap-4 pt-2 border-t border-emerald-500/20 text-xs font-mono">
                    <div>
                      <span class="text-slate-400 text-[11px] block">Client Share (Refund)</span>
                      <span class="text-base font-bold text-emerald-400">{{ d.arbiterVerdict.clientSharePercent }}%</span>
                    </div>
                    <div>
                      <span class="text-slate-400 text-[11px] block">Freelancer Share (Payout)</span>
                      <span class="text-base font-bold text-indigo-400">{{ d.arbiterVerdict.freelancerSharePercent }}%</span>
                    </div>
                  </div>

                  <div class="text-[11px] font-mono text-slate-500 truncate pt-2">
                    Tx: {{ d.arbiterVerdict.txHash }}
                  </div>
                </div>
              }

              <!-- Arbiter Action Console (Only available to Arbiter or when case is open) -->
              @if (d.status !== 'resolved') {
                <div class="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-amber-400 text-lg">gavel</mat-icon>
                      <h4 class="text-xs font-bold text-white uppercase tracking-wider">
                        {{ i18n.t('arbiterRuling') }} (Multi-Sig Mediator Console)
                      </h4>
                    </div>
                    <span class="text-xs font-mono text-slate-400">Active Role: {{ state.activeRole() }}</span>
                  </div>

                  <!-- Quick Resolution Preset Buttons -->
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      (click)="setSplit(100, 0)"
                      class="p-2.5 rounded-xl border text-xs font-semibold transition text-left"
                      [class.bg-emerald-500/10]="clientSplit() === 100"
                      [class.border-emerald-500]="clientSplit() === 100"
                      [class.text-emerald-400]="clientSplit() === 100"
                      [class.border-slate-800]="clientSplit() !== 100"
                      [class.text-slate-300]="clientSplit() !== 100"
                    >
                      <div>100% Refund Client</div>
                      <div class="text-[10px] text-slate-500 font-normal mt-0.5">Full return to Client</div>
                    </button>

                    <button
                      type="button"
                      (click)="setSplit(0, 100)"
                      class="p-2.5 rounded-xl border text-xs font-semibold transition text-left"
                      [class.bg-emerald-500/10]="freelancerSplit() === 100"
                      [class.border-emerald-500]="freelancerSplit() === 100"
                      [class.text-emerald-400]="freelancerSplit() === 100"
                      [class.border-slate-800]="freelancerSplit() !== 100"
                      [class.text-slate-300]="freelancerSplit() !== 100"
                    >
                      <div>100% Release Freelancer</div>
                      <div class="text-[10px] text-slate-500 font-normal mt-0.5">Full payment release</div>
                    </button>

                    <button
                      type="button"
                      (click)="setSplit(50, 50)"
                      class="p-2.5 rounded-xl border text-xs font-semibold transition text-left"
                      [class.bg-emerald-500/10]="clientSplit() === 50 && freelancerSplit() === 50"
                      [class.border-emerald-500]="clientSplit() === 50 && freelancerSplit() === 50"
                      [class.text-emerald-400]="clientSplit() === 50 && freelancerSplit() === 50"
                      [class.border-slate-800]="clientSplit() !== 50 || freelancerSplit() !== 50"
                      [class.text-slate-300]="clientSplit() !== 50 || freelancerSplit() !== 50"
                    >
                      <div>50 / 50 Split</div>
                      <div class="text-[10px] text-slate-500 font-normal mt-0.5">Even split settlement</div>
                    </button>
                  </div>

                  <!-- Custom Percentage Slider -->
                  <div class="space-y-2 pt-2">
                    <div class="flex items-center justify-between text-xs font-mono">
                      <span>Client Share: <b class="text-emerald-400">{{ clientSplit() }}%</b> (\${{ (d.amountEth * (clientSplit() / 100) * web3.ethPriceUsd()) | number:'1.0-0' }})</span>
                      <span>Freelancer Share: <b class="text-indigo-400">{{ freelancerSplit() }}%</b> (\${{ (d.amountEth * (freelancerSplit() / 100) * web3.ethPriceUsd()) | number:'1.0-0' }})</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      [value]="clientSplit()"
                      (input)="onSliderChange($event)"
                      class="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <!-- Reasoning Note -->
                  <div>
                    <label [for]="'arbitration-reasoning-' + d.id" class="block text-xs text-slate-400 mb-1">Arbitration Reasoning & Ruling Notes</label>
                    <textarea
                      [id]="'arbitration-reasoning-' + d.id"
                      rows="2"
                      placeholder="Explain findings, code review audit results, and justification for fund split..."
                      [value]="rulingNotes()"
                      (input)="rulingNotes.set($any($event.target).value)"
                      class="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    ></textarea>
                  </div>

                  <!-- Submit Ruling Button -->
                  <button
                    type="button"
                    (click)="submitRuling(d.id)"
                    class="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">gavel</mat-icon>
                    <span>Sign & Execute Smart Contract Arbitration Ruling</span>
                  </button>
                </div>
              }

            </div>
          }
        </div>

      </div>

    </div>
  `,
})
export class DisputesViewComponent {
  readonly state = inject(EscrowStateService);
  readonly web3 = inject(Web3SimulationService);
  readonly i18n = inject(I18nService);

  readonly selectedDispute = signal<DisputeCase | null>(this.state.disputes()[0] || null);
  readonly clientSplit = signal<number>(50);
  readonly freelancerSplit = signal<number>(50);
  readonly rulingNotes = signal<string>('After reviewing Slither security reports and git commits, the rebalance logic vulnerability was mitigated. Split approved for completed scope.');

  setSplit(client: number, freelancer: number) {
    this.clientSplit.set(client);
    this.freelancerSplit.set(freelancer);
  }

  onSliderChange(event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.clientSplit.set(val);
    this.freelancerSplit.set(100 - val);
  }

  openDisputeDialog() {
    this.state.disputeTargetContract.set({ contract: this.state.selectedContract() });
    this.state.isDisputeModalOpen.set(true);
  }

  submitRuling(disputeId: string) {
    const res = this.clientSplit() === 100 ? 'refund_client' : this.freelancerSplit() === 100 ? 'release_freelancer' : 'custom_split';
    this.state.resolveDisputeByArbiter(
      disputeId,
      res,
      this.clientSplit(),
      this.freelancerSplit(),
      this.rulingNotes()
    );
  }
}
