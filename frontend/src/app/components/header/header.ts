import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EscrowStateService } from '../../services/escrow-state.service';
import { Web3SimulationService } from '../../services/web3-simulation.service';
import { I18nService, LanguageCode } from '../../services/i18n.service';
import { NetworkType, UserRole } from '../../models/escrow.models';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <header class="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md transition-colors duration-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16 gap-4">
          
          <!-- Logo & Brand Title -->
          <button type="button" class="flex items-center gap-3 cursor-pointer select-none text-left" (click)="state.setActiveTab('dashboard')">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-md shadow-emerald-950/50 flex items-center justify-center">
              <div class="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <mat-icon class="text-emerald-400 text-xl">gavel</mat-icon>
              </div>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold tracking-tight text-white text-base sm:text-lg">EtherTrust</span>
                <span class="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Protected Escrow
                </span>
              </div>
              <p class="hidden sm:block text-[11px] text-slate-400 font-medium">
                {{ i18n.t('appSubtitle') }}
              </p>
            </div>
          </button>

          <!-- Center Status Badges (Network & Gas Feed) -->
          <div class="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
            <!-- Network Pill -->
            <div class="flex items-center gap-1.5 pr-3 border-r border-slate-800">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <select
                class="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs"
                [value]="web3.currentNetwork().name"
                (change)="onNetworkChange($event)"
              >
                @for (net of web3.networks; track net.chainId) {
                  <option class="bg-slate-900 text-slate-200" [value]="net.name">
                    {{ net.name }}
                  </option>
                }
              </select>
            </div>

            <!-- Gas Price -->
            <div class="flex items-center gap-1 text-slate-400">
              <mat-icon class="text-amber-400 text-sm" style="font-size: 16px; width: 16px; height: 16px;">local_gas_station</mat-icon>
              <span>{{ web3.currentNetwork().currentGasGwei }} Gwei</span>
            </div>

            <!-- ETH Price -->
            <div class="flex items-center gap-1 pl-2 border-l border-slate-800 text-slate-300">
              <span class="text-emerald-400 font-bold">ETH</span>
              <span>\${{ web3.ethPriceUsd().toLocaleString() }}</span>
            </div>
          </div>

          <!-- Right Controls & Actions -->
          <div class="flex items-center gap-2 sm:gap-3">
            
            <!-- Quick Role Switcher Dropdown / Pill -->
            <div class="relative">
              <button
                type="button"
                (click)="isRoleMenuOpen.set(!isRoleMenuOpen())"
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 hover:border-slate-700 transition"
                title="Switch Active Persona / Role"
              >
                <mat-icon class="text-indigo-400 text-sm" style="font-size: 16px; width: 16px; height: 16px;">badge</mat-icon>
                <span class="hidden sm:inline text-slate-400 text-[11px]">Role:</span>
                <span class="font-semibold capitalize text-emerald-400">{{ state.activeRole() }}</span>
                <mat-icon class="text-slate-500 text-xs" style="font-size: 14px; width: 14px; height: 14px;">arrow_drop_down</mat-icon>
              </button>

              @if (isRoleMenuOpen()) {
                <div class="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div class="px-3 py-2 border-b border-slate-800/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {{ i18n.t('switchRole') }}
                  </div>
                  @for (role of availableRoles; track role) {
                    <button
                      type="button"
                      (click)="selectRole(role)"
                      class="w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-800/80 transition"
                      [class.text-emerald-400]="state.activeRole() === role"
                      [class.text-slate-300]="state.activeRole() !== role"
                    >
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-sm" [class.text-emerald-400]="state.activeRole() === role" style="font-size: 16px; width: 16px; height: 16px;">
                          {{ role === 'client' ? 'person' : role === 'freelancer' ? 'code' : role === 'arbiter' ? 'gavel' : 'verified' }}
                        </mat-icon>
                        <span class="capitalize font-medium">{{ role }}</span>
                      </div>
                      @if (state.activeRole() === role) {
                        <mat-icon class="text-emerald-400 text-xs" style="font-size: 16px; width: 16px; height: 16px;">check</mat-icon>
                      }
                    </button>
                  }
                </div>
              }
            </div>

            <!-- Connected Wallet Pill with avatar -->
            <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <img
                [src]="web3.currentAccount().avatar"
                alt="Avatar"
                class="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-500/50"
                referrerpolicy="no-referrer"
              />
              <div class="hidden sm:flex flex-col text-left">
                <span class="font-mono text-slate-200 font-medium text-[11px] leading-tight">
                  {{ web3.shortAddress() }}
                </span>
                <span class="text-emerald-400 font-mono text-[10px] font-semibold leading-tight">
                  {{ web3.currentAccount().balanceEth }} ETH
                </span>
              </div>
            </div>

            <!-- Notification Bell -->
            <div class="relative">
              <button
                type="button"
                (click)="toggleNotificationPanel()"
                class="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
                title="Notifications"
              >
                <mat-icon class="text-sm" style="font-size: 18px; width: 18px; height: 18px;">notifications</mat-icon>
                @if (state.unreadNotificationsCount() > 0) {
                  <span class="absolute top-1 right-1 flex h-2 w-2">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                }
              </button>

              <!-- Notifications Dropdown -->
              @if (state.isNotificationPanelOpen()) {
                <div class="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/50">
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-emerald-400 text-sm" style="font-size: 16px; width: 16px; height: 16px;">notifications</mat-icon>
                      <span class="text-xs font-bold text-white uppercase tracking-wider">{{ i18n.t('notifications') }}</span>
                    </div>
                    <button
                      type="button"
                      (click)="state.markAllNotificationsRead()"
                      class="text-[11px] text-emerald-400 hover:underline"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div class="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
                    @for (notif of state.notifications(); track notif.id) {
                      <div class="p-3 hover:bg-slate-800/40 transition flex items-start gap-3" [class.bg-emerald-950/10]="!notif.read">
                        <div class="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          [ngClass]="{
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20': notif.type === 'action_required',
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': notif.type === 'funds_released',
                            'bg-red-500/10 text-red-400 border border-red-500/20': notif.type === 'dispute_alert',
                            'bg-blue-500/10 text-blue-400 border border-blue-500/20': notif.type === 'milestone_submitted',
                            'bg-purple-500/10 text-purple-400 border border-purple-500/20': notif.type === 'deadline_warning'
                          }">
                          <mat-icon style="font-size: 16px; width: 16px; height: 16px;">
                            {{ notif.type === 'funds_released' ? 'paid' : notif.type === 'dispute_alert' ? 'warning' : notif.type === 'action_required' ? 'fingerprint' : 'info' }}
                          </mat-icon>
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center justify-between">
                            <h4 class="text-xs font-semibold text-slate-200 truncate">{{ notif.title }}</h4>
                            <span class="text-[10px] text-slate-500 font-mono">{{ notif.timestamp }}</span>
                          </div>
                          <p class="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{{ notif.message }}</p>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Language Switcher Dropdown -->
            <div class="relative">
              <button
                type="button"
                (click)="isLangMenuOpen.set(!isLangMenuOpen())"
                class="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center gap-1"
                title="Change Language"
              >
                <span class="text-sm">{{ getActiveLangFlag() }}</span>
                <mat-icon class="text-slate-500 text-xs hidden sm:inline" style="font-size: 14px; width: 14px; height: 14px;">arrow_drop_down</mat-icon>
              </button>

              @if (isLangMenuOpen()) {
                <div class="absolute right-0 mt-2 w-44 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-50">
                  @for (lang of i18n.supportedLanguages; track lang.code) {
                    <button
                      type="button"
                      (click)="selectLanguage(lang.code)"
                      class="w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-800 transition"
                      [class.text-emerald-400]="i18n.currentLanguage() === lang.code"
                      [class.text-slate-300]="i18n.currentLanguage() !== lang.code"
                    >
                      <div class="flex items-center gap-2">
                        <span>{{ lang.flag }}</span>
                        <span>{{ lang.label }}</span>
                      </div>
                      @if (i18n.currentLanguage() === lang.code) {
                        <mat-icon class="text-emerald-400 text-xs" style="font-size: 16px; width: 16px; height: 16px;">check</mat-icon>
                      }
                    </button>
                  }
                </div>
              }
            </div>

            <!-- Theme Toggle -->
            <button
              type="button"
              (click)="state.toggleDarkMode()"
              class="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 hover:border-slate-700 transition"
              [title]="state.isDarkMode() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
            >
              <mat-icon class="text-sm" style="font-size: 18px; width: 18px; height: 18px;">
                {{ state.isDarkMode() ? 'light_mode' : 'dark_mode' }}
              </mat-icon>
            </button>

            <!-- New Escrow Contract Action Button -->
            <button
              type="button"
              (click)="state.isCreateContractModalOpen.set(true)"
              class="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition active:scale-95"
            >
              <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">add</mat-icon>
              <span>{{ i18n.t('createContract') }}</span>
            </button>

          </div>

        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="border-t border-slate-800/60 bg-slate-950/60 overflow-x-auto scrollbar-none">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-1 sm:space-x-2 py-1.5">
          @for (tab of navTabs; track tab.id) {
            <button
              type="button"
              (click)="state.setActiveTab(tab.id)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap"
              [class.bg-emerald-500/10]="state.activeTab() === tab.id"
              [class.text-emerald-400]="state.activeTab() === tab.id"
              [class.border]="state.activeTab() === tab.id"
              [class.border-emerald-500/30]="state.activeTab() === tab.id"
              [class.text-slate-400]="state.activeTab() !== tab.id"
              [class.hover:text-slate-200]="state.activeTab() !== tab.id"
              [class.hover:bg-slate-900]="state.activeTab() !== tab.id"
            >
              <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">{{ tab.icon }}</mat-icon>
              <span>{{ i18n.t(tab.labelKey) }}</span>
              @if (tab.id === 'contracts' && state.pendingMultiSigCount() > 0) {
                <span class="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {{ state.pendingMultiSigCount() }}
                </span>
              }
              @if (tab.id === 'disputes' && state.disputes().length > 0) {
                <span class="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  {{ state.disputes().length }}
                </span>
              }
            </button>
          }
        </div>
      </nav>
    </header>
  `,
})
export class HeaderComponent {
  readonly state = inject(EscrowStateService);
  readonly web3 = inject(Web3SimulationService);
  readonly i18n = inject(I18nService);

  readonly isRoleMenuOpen = signal<boolean>(false);
  readonly isLangMenuOpen = signal<boolean>(false);
  readonly availableRoles: UserRole[] = ['client', 'freelancer', 'arbiter', 'auditor'];

  toggleNotificationPanel() {
    this.state.isNotificationPanelOpen.update((v) => !v);
  }

  readonly navTabs: { id: 'dashboard' | 'contracts' | 'solidity' | 'disputes' | 'reputation' | 'messages' | 'analytics'; icon: string; labelKey: string }[] = [
    { id: 'dashboard', icon: 'dashboard', labelKey: 'navDashboard' },
    { id: 'contracts', icon: 'account_tree', labelKey: 'navContracts' },
    { id: 'solidity', icon: 'code', labelKey: 'navSolidity' },
    { id: 'disputes', icon: 'gavel', labelKey: 'navDisputes' },
    { id: 'reputation', icon: 'verified', labelKey: 'navReputation' },
    { id: 'messages', icon: 'chat', labelKey: 'navMessages' },
    { id: 'analytics', icon: 'insights', labelKey: 'navAnalytics' },
  ];

  selectRole(role: UserRole) {
    this.state.setActiveRole(role);
    this.isRoleMenuOpen.set(false);
  }

  selectLanguage(code: LanguageCode) {
    this.i18n.setLanguage(code);
    this.isLangMenuOpen.set(false);
  }

  getActiveLangFlag(): string {
    const lang = this.i18n.supportedLanguages.find((l) => l.code === this.i18n.currentLanguage());
    return lang ? lang.flag : '🌐';
  }

  onNetworkChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value as NetworkType;
    this.web3.switchNetwork(val);
  }
}
