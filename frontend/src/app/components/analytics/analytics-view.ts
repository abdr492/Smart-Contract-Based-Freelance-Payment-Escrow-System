import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EscrowStateService } from '../../services/escrow-state.service';
import { Web3SimulationService } from '../../services/web3-simulation.service';
import { I18nService } from '../../services/i18n.service';
import { AnalyticsExportService } from '../../services/analytics-export.service';

@Component({
  selector: 'app-analytics-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Banner with Export Buttons -->
      <div class="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-bold text-white tracking-tight">
              {{ i18n.t('navAnalytics') }} & Payment History
            </h2>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              Verified Records
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time fee savings metrics, protected funds breakdown, and official transaction receipt logs.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            (click)="exportPdfReport()"
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
          >
            <mat-icon class="text-sm text-red-400" style="font-size: 16px; width: 16px; height: 16px;">picture_as_pdf</mat-icon>
            <span>{{ i18n.t('exportPdf') }}</span>
          </button>

          <button
            type="button"
            (click)="exportCsvLogs()"
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
          >
            <mat-icon class="text-sm text-emerald-400" style="font-size: 16px; width: 16px; height: 16px;">table_chart</mat-icon>
            <span>{{ i18n.t('exportCsv') }}</span>
          </button>
        </div>
      </div>

      <!-- Financial Metrics Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span class="text-xs text-slate-400 font-medium block">Total Escrow Volume Locked</span>
          <div class="text-2xl font-mono font-bold text-white mt-1">
            {{ state.totalLockedEscrowEth() | number:'1.2-2' }} ETH
          </div>
          <span class="text-xs font-mono text-emerald-400 mt-0.5 block">
            ≈ \${{ (state.totalLockedEscrowEth() * web3.ethPriceUsd()) | number:'1.0-0' }} USD
          </span>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span class="text-xs text-slate-400 font-medium block">Settled Milestone Payouts</span>
          <div class="text-2xl font-mono font-bold text-emerald-400 mt-1">
            {{ state.totalReleasedEth() | number:'1.2-2' }} ETH
          </div>
          <span class="text-xs font-mono text-slate-400 mt-0.5 block">
            ≈ \${{ (state.totalReleasedEth() * web3.ethPriceUsd()) | number:'1.0-0' }} USD (100% On-Chain)
          </span>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span class="text-xs text-slate-400 font-medium block">Cumulative Gas Optimization</span>
          <div class="text-2xl font-mono font-bold text-indigo-400 mt-1">
            ~1.84 ETH Saved
          </div>
          <span class="text-xs font-mono text-slate-400 mt-0.5 block">
            Via Batch Multi-Sig & L2 Rollups
          </span>
        </div>

      </div>

      <!-- Gas Comparison Breakdown -->
      <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <mat-icon class="text-amber-400 text-lg">local_gas_station</mat-icon>
            <h3 class="text-sm font-bold text-white uppercase tracking-wider">
              Network Gas Comparison & Batch Efficiency
            </h3>
          </div>
          <span class="text-xs font-mono text-emerald-400">Live Fee Oracle</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          
          <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-300">Ethereum L1 (Single Release)</span>
              <span class="text-slate-500">~68,000 gas</span>
            </div>
            <div class="text-lg font-bold text-amber-400">~$3.86 / tx</div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div class="bg-amber-500 h-full w-full"></div>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-300">Arbitrum One L2 (Single Release)</span>
              <span class="text-slate-500">~0.1 Gwei</span>
            </div>
            <div class="text-lg font-bold text-emerald-400">~$0.02 / tx</div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div class="bg-emerald-500 h-full w-[4%]"></div>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-300">Batch Multi-Sig (3 Milestones)</span>
              <span class="text-slate-500">~78,500 gas</span>
            </div>
            <div class="text-lg font-bold text-indigo-400">42% Savings</div>
            <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div class="bg-indigo-500 h-full w-[58%]"></div>
            </div>
          </div>

        </div>
      </div>

      <!-- Transaction Audit Trail Explorer -->
      <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <mat-icon class="text-emerald-400 text-lg">receipt_long</mat-icon>
            <h3 class="text-sm font-bold text-white uppercase tracking-wider">
              On-Chain Transaction & Audit Logs
            </h3>
          </div>
          <span class="text-xs font-mono text-slate-400">{{ state.auditLogs().length }} Confirmed Events</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs font-mono">
            <thead>
              <tr class="border-b border-slate-800 text-slate-400 text-[11px]">
                <th class="pb-3 font-semibold">TIMESTAMP (UTC)</th>
                <th class="pb-3 font-semibold">ACTION</th>
                <th class="pb-3 font-semibold">TX HASH</th>
                <th class="pb-3 font-semibold">FROM</th>
                <th class="pb-3 font-semibold">VALUE</th>
                <th class="pb-3 font-semibold">BLOCK</th>
                <th class="pb-3 font-semibold text-right">STATUS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              @for (log of state.auditLogs(); track log.id) {
                <tr class="hover:bg-slate-950/40 transition">
                  <td class="py-3 text-slate-400">{{ log.timestamp }}</td>
                  <td class="py-3 font-medium text-slate-200 font-sans max-w-xs truncate">{{ log.action }}</td>
                  <td class="py-3 text-emerald-400">{{ log.txHash.slice(0, 10) }}...{{ log.txHash.slice(-4) }}</td>
                  <td class="py-3 text-slate-400">{{ log.fromAddress.slice(0, 8) }}...</td>
                  <td class="py-3 font-bold" [class.text-emerald-400]="log.valueEth > 0" [class.text-slate-500]="log.valueEth === 0">
                    {{ log.valueEth > 0 ? log.valueEth + ' ETH' : '-' }}
                  </td>
                  <td class="py-3 text-slate-500">#{{ log.blockNumber }}</td>
                  <td class="py-3 text-right">
                    <span class="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {{ log.status }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `,
})
export class AnalyticsViewComponent {
  readonly state = inject(EscrowStateService);
  readonly web3 = inject(Web3SimulationService);
  readonly i18n = inject(I18nService);
  readonly exportService = inject(AnalyticsExportService);

  exportPdfReport() {
    const current = this.state.selectedContract();
    if (current) {
      this.exportService.exportContractPdf(current, this.web3.ethPriceUsd());
    }
  }

  exportCsvLogs() {
    this.exportService.exportAuditLogsCsv(this.state.auditLogs());
  }
}
