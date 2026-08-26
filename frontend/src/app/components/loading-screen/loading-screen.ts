import { Component, ChangeDetectionStrategy, signal, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div
      *ngIf="isVisible()"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-slate-100 overflow-hidden select-none transition-opacity duration-700"
      [class.opacity-0]="isFading()"
    >
      <!-- Background Ambient Glow Orbs -->
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style="animation-delay: 1.5s;"></div>
      <div class="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none"></div>

      <!-- Main Center Emblem & Title -->
      <div class="relative z-10 flex flex-col items-center max-w-md px-6 text-center">
        
        <!-- Animated Glowing Emblem -->
        <div class="relative mb-8 flex items-center justify-center">
          <!-- Pulse Ring 1 -->
          <div class="absolute w-28 h-28 rounded-full border-2 border-emerald-500/20 animate-ping" style="animation-duration: 2.5s;"></div>
          <!-- Pulse Ring 2 -->
          <div class="absolute w-24 h-24 rounded-full border border-emerald-400/40 animate-spin" style="animation-duration: 8s;"></div>
          
          <!-- Core Icon Shield -->
          <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)] backdrop-blur-xl">
            <mat-icon class="text-emerald-400 text-4xl" style="font-size: 38px; width: 38px; height: 38px;">shield</mat-icon>
          </div>
        </div>

        <!-- Middle Name: EtherTrust -->
        <div class="space-y-2 mb-8">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wider uppercase">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Protected Freelance Payments
          </div>
          <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-emerald-200 to-teal-400 bg-clip-text text-transparent drop-shadow-sm font-sans">
            EtherTrust
          </h1>
          <p class="text-slate-400 text-sm font-medium">
            Smart Freelance Payment Escrow & Milestone Protection Platform
          </p>
        </div>

        <!-- Progress Bar & Telemetry Status -->
        <div class="w-full space-y-3 mb-8">
          <!-- Progress Track -->
          <div class="w-full bg-slate-900 border border-slate-800 rounded-full h-2 overflow-hidden shadow-inner p-0.5">
            <div
              class="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              [style.width.%]="progress()"
            ></div>
          </div>

          <!-- Status Message & Percentage -->
          <div class="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span class="flex items-center gap-1.5 truncate max-w-[280px]">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {{ currentStatus() }}
            </span>
            <span class="text-emerald-400 font-semibold font-mono">{{ progress() }}%</span>
          </div>
        </div>

        <!-- Skip / Enter Button -->
        <button
          type="button"
          (click)="dismiss()"
          class="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-emerald-500/20 border border-slate-700 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 text-xs font-semibold tracking-wide transition shadow-lg backdrop-blur-md"
        >
          <span>Enter Dashboard</span>
          <mat-icon class="text-sm group-hover:translate-x-0.5 transition-transform" style="font-size: 14px; width: 14px; height: 14px;">arrow_forward</mat-icon>
        </button>

      </div>

      <!-- Footer Micro-Text -->
      <div class="absolute bottom-6 text-[11px] text-slate-600 font-mono tracking-wider">
        SECURE ESCROW • MULTI-SIG VERIFIED • DISPUTE PROTECTED
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingScreenComponent implements OnInit {
  readonly isVisible = signal<boolean>(true);
  readonly isFading = signal<boolean>(false);
  readonly progress = signal<number>(0);
  readonly currentStatus = signal<string>('Initializing Secure Payment Vault...');

  readonly dismissed = output<void>();

  private readonly stages = [
    { target: 25, status: 'Setting up Secure Payment Vault...' },
    { target: 50, status: 'Connecting to Protected Network...' },
    { target: 75, status: 'Checking Milestone Protection Rules...' },
    { target: 90, status: 'Loading Verified Reputation Badges...' },
    { target: 100, status: 'EtherTrust Platform Ready.' },
  ];

  ngOnInit(): void {
    this._runLoadingSequence();
  }

  dismiss(): void {
    this.isFading.set(true);
    setTimeout(() => {
      this.isVisible.set(false);
      this.dismissed.emit();
    }, 600);
  }

  private _runLoadingSequence(): void {
    let currentStageIndex = 0;

    const interval = setInterval(() => {
      const stage = this.stages[currentStageIndex];
      if (!stage) {
        clearInterval(interval);
        setTimeout(() => this.dismiss(), 500);
        return;
      }

      if (this.progress() < stage.target) {
        this.progress.update((p) => Math.min(p + 5, stage.target));
        this.currentStatus.set(stage.status);
      } else {
        currentStageIndex++;
      }
    }, 100);
  }
}
