import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EscrowStateService } from '../../services/escrow-state.service';
import { Web3SimulationService } from '../../services/web3-simulation.service';
import { I18nService } from '../../services/i18n.service';
import { ReputationProfile } from '../../models/escrow.models';
import { TrustScoreTrendComponent } from './trust-score-trend';

@Component({
  selector: 'app-reputation-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, TrustScoreTrendComponent],
  template: `
    <div class="space-y-6">
      
      <!-- Top Banner -->
      <div class="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-bold text-white tracking-tight">
              {{ i18n.t('navReputation') }} & Soulbound Proofs
            </h2>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              ERC-5192 SBT System
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Non-transferable on-chain proof of work, multi-sig reliability ratings, and cryptographic peer reviews for long-term client-freelancer trust.
          </p>
        </div>

        <!-- Profile Switcher -->
        <div class="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
          @for (prof of state.reputationProfiles(); track prof.address) {
            <button
              type="button"
              (click)="selectedProfile.set(prof)"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition"
              [class.bg-emerald-500/20]="selectedProfile()?.address === prof.address"
              [class.text-emerald-400]="selectedProfile()?.address === prof.address"
              [class.text-slate-400]="selectedProfile()?.address !== prof.address"
            >
              {{ prof.name }}
            </button>
          }
        </div>
      </div>

      @let p = selectedProfile();
      @if (p) {
        <div class="space-y-6">
          
          <!-- Profile Card -->
          <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div class="flex items-center gap-4">
              <div class="relative">
                <img [src]="p.avatar" alt="Avatar" class="w-20 h-20 rounded-2xl object-cover ring-2 ring-emerald-500/50" referrerpolicy="no-referrer" />
                @if (p.verifiedIdentity) {
                  <span class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow">
                    <mat-icon style="font-size: 14px; width: 14px; height: 14px;">verified</mat-icon>
                  </span>
                }
              </div>
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-bold text-white">{{ p.name }}</h3>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300">
                    {{ p.role }}
                  </span>
                </div>
                <p class="text-xs font-mono text-slate-400">{{ p.address }}</p>
                <p class="text-xs text-slate-300 max-w-xl leading-relaxed">{{ p.bio }}</p>
              </div>
            </div>

            <!-- Trust Score Circular Widget -->
            <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center shrink-0 w-full md:w-48">
              <div class="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">On-Chain Trust Score</div>
              <div class="text-3xl font-mono font-bold text-emerald-400">{{ p.trustScore }}/100</div>
              <div class="text-[11px] text-slate-400 mt-1 font-mono">
                Top 0.5% Protocol Tier
              </div>
            </div>
          </div>

          <!-- Reputation Metrics Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span class="text-xs text-slate-500 block">Completed Contracts</span>
              <div class="text-xl font-mono font-bold text-white mt-1">{{ p.totalContractsCompleted }} Escrows</div>
              <span class="text-[11px] text-emerald-400 font-mono">100% Settlement</span>
            </div>

            <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span class="text-xs text-slate-500 block">On-Time Delivery</span>
              <div class="text-xl font-mono font-bold text-emerald-400 mt-1">{{ p.onTimeDeliveryRate }}%</div>
              <span class="text-[11px] text-slate-400 font-mono">Milestone Adherence</span>
            </div>

            <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span class="text-xs text-slate-500 block">Total Volume Settled</span>
              <div class="text-xl font-mono font-bold text-white mt-1">{{ p.totalVolumeTransactedEth }} ETH</div>
              <span class="text-[11px] text-slate-400 font-mono">≈ \${{ (p.totalVolumeTransactedEth * web3.ethPriceUsd()) | number:'1.0-0' }}</span>
            </div>

            <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span class="text-xs text-slate-500 block">Dispute Win Ratio</span>
              <div class="text-xl font-mono font-bold text-indigo-400 mt-1">{{ p.disputeWinRate }}%</div>
              <span class="text-[11px] text-slate-400 font-mono">Zero Negligence</span>
            </div>

          </div>

          <!-- D3 Historical Trust Score Trend-Line Visualization -->
          <app-trust-score-trend [profile]="p" />

          <!-- Soulbound Badges Showcase -->
          <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <mat-icon class="text-amber-400 text-lg">workspace_premium</mat-icon>
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">
                  Soulbound Achievement Badges (ERC-5192)
                </h3>
              </div>
              <span class="text-xs font-mono text-slate-400">{{ p.badges.length }} Badges Minted</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              @for (badge of p.badges; track badge.id) {
                <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition group">
                  <div class="flex items-center justify-between">
                    <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                      <mat-icon style="font-size: 20px; width: 20px; height: 20px;">{{ badge.icon }}</mat-icon>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                      [class.bg-amber-500/20]="badge.rarity === 'Legendary'"
                      [class.text-amber-400]="badge.rarity === 'Legendary'"
                      [class.bg-purple-500/20]="badge.rarity === 'Epic'"
                      [class.text-purple-400]="badge.rarity === 'Epic'"
                      [class.bg-blue-500/20]="badge.rarity === 'Rare'"
                      [class.text-blue-400]="badge.rarity === 'Rare'">
                      {{ badge.rarity }}
                    </span>
                  </div>

                  <h4 class="text-sm font-bold text-white mt-3 group-hover:text-amber-400 transition">{{ badge.name }}</h4>
                  <p class="text-xs text-slate-400 mt-1 leading-relaxed">{{ badge.description }}</p>

                  <div class="flex items-center justify-between mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500">
                    <span>Token: {{ badge.tokenId }}</span>
                    <span>{{ badge.issuedAt }}</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Verified Reviews & Ratings Ledger -->
          <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <mat-icon class="text-emerald-400 text-lg">rate_review</mat-icon>
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">
                  Verified On-Chain Reviews Ledger
                </h3>
              </div>
              <span class="text-xs font-mono text-slate-400">{{ p.recentReviews.length }} Reviews</span>
            </div>

            <div class="space-y-3">
              @for (rev of p.recentReviews; track rev.id) {
                <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="text-xs font-bold text-white">{{ rev.reviewerName }}</span>
                      <span class="text-xs text-slate-500 font-mono ml-2">({{ rev.reviewerRole }})</span>
                    </div>
                    <div class="flex items-center gap-1 text-amber-400">
                      @for (star of [1,2,3,4,5]; track star) {
                        <mat-icon style="font-size: 14px; width: 14px; height: 14px;">star</mat-icon>
                      }
                    </div>
                  </div>

                  <p class="text-xs text-slate-300 italic leading-relaxed">
                    "{{ rev.comment }}"
                  </p>

                  <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-900">
                    <span>Contract: <b class="text-slate-300">{{ rev.contractTitle }}</b></span>
                    <span>Tx: {{ rev.txHash.slice(0, 10) }}...</span>
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
export class ReputationViewComponent {
  readonly state = inject(EscrowStateService);
  readonly web3 = inject(Web3SimulationService);
  readonly i18n = inject(I18nService);

  readonly selectedProfile = signal<ReputationProfile | null>(this.state.reputationProfiles()[0] || null);
}
