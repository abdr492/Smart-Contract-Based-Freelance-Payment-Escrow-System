import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EscrowStateService } from '../../services/escrow-state.service';
import { Web3SimulationService } from '../../services/web3-simulation.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-messages-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Top Banner -->
      <div class="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-bold text-white tracking-tight">
              {{ i18n.t('navMessages') }}
            </h2>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              E2E Encrypted & IPFS Attached
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Direct cryptographic communication channel with deliverable artifact sharing and automated project scheduling calendar.
          </p>
        </div>

        <button
          type="button"
          (click)="state.isSchedulerModalOpen.set(true)"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition active:scale-95"
        >
          <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">event</mat-icon>
          <span>{{ i18n.t('scheduleMeeting') }}</span>
        </button>
      </div>

      <!-- Main Layout: Chat Room & Project Scheduler -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left 2 Cols: Encrypted Chat Portal -->
        <div class="lg:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col h-[600px] overflow-hidden">
          
          <!-- Chat Header -->
          <div class="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <mat-icon style="font-size: 18px; width: 18px; height: 18px;">lock</mat-icon>
              </div>
              <div>
                <h3 class="text-xs font-bold text-white">{{ state.selectedContract().title }}</h3>
                <div class="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>EIP-712 Encrypted Channel</span>
                </div>
              </div>
            </div>

            <span class="text-xs font-mono text-slate-400">
              Contract: {{ state.selectedContract().id }}
            </span>
          </div>

          <!-- Messages Stream -->
          <div class="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
            @for (msg of contractMessages(); track msg.id) {
              <div class="flex items-start gap-3" [class.flex-row-reverse]="msg.senderAddress.toLowerCase() === web3.currentAccount().address.toLowerCase()">
                <img [src]="msg.senderAvatar" alt="Avatar" class="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700 shrink-0" referrerpolicy="no-referrer" />
                
                <div class="max-w-md space-y-1" [class.text-right]="msg.senderAddress.toLowerCase() === web3.currentAccount().address.toLowerCase()">
                  <div class="flex items-center gap-2 text-[11px]" [class.justify-end]="msg.senderAddress.toLowerCase() === web3.currentAccount().address.toLowerCase()">
                    <span class="font-bold text-slate-300">{{ msg.senderName }}</span>
                    <span class="text-slate-500 font-mono text-[10px]">{{ msg.timestamp }}</span>
                  </div>

                  <!-- Message Bubble -->
                  <div
                    class="p-3 rounded-2xl text-xs leading-relaxed text-left"
                    [ngClass]="{
                      'bg-emerald-600 text-white rounded-tr-none': msg.senderAddress.toLowerCase() === web3.currentAccount().address.toLowerCase(),
                      'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-tl-none': msg.senderAddress.toLowerCase() !== web3.currentAccount().address.toLowerCase()
                    }">
                    <p>{{ msg.text }}</p>

                    <!-- Attachment if present -->
                    @if (msg.attachment) {
                      <div class="mt-2 p-2 rounded-xl bg-black/20 border border-white/10 flex items-center justify-between text-[11px] gap-2">
                        <div class="flex items-center gap-1.5 truncate">
                          <mat-icon class="text-xs" style="font-size: 14px; width: 14px; height: 14px;">attach_file</mat-icon>
                          <span class="truncate font-medium">{{ msg.attachment.name }}</span>
                          <span class="opacity-75">({{ msg.attachment.size }})</span>
                        </div>
                        <span class="font-mono text-[9px] bg-black/30 px-1 py-0.5 rounded shrink-0">
                          {{ msg.attachment.ipfsHash.slice(0, 6) }}...
                        </span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Message Input Bar -->
          <div class="p-3 border-t border-slate-800 bg-slate-950/80">
            @if (attachedFile()) {
              <div class="mb-2 p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 text-indigo-400 truncate">
                  <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">attachment</mat-icon>
                  <span class="text-slate-200 truncate">{{ attachedFile()?.name }}</span>
                  <span class="text-slate-500 font-mono text-[10px]">({{ attachedFile()?.size }})</span>
                </div>
                <button
                  type="button"
                  (click)="attachedFile.set(null)"
                  class="text-slate-400 hover:text-red-400 p-0.5"
                >
                  <mat-icon style="font-size: 14px; width: 14px; height: 14px;">close</mat-icon>
                </button>
              </div>
            }

            <div class="flex items-center gap-2">
              <label class="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer border border-slate-800 transition" title="Upload IPFS File">
                <mat-icon class="text-sm" style="font-size: 18px; width: 18px; height: 18px;">attach_file</mat-icon>
                <input type="file" (change)="onFileSelected($event)" class="hidden" />
              </label>

              <input
                type="text"
                placeholder="Type an encrypted message or paste IPFS deliverable hash..."
                [value]="messageText()"
                (input)="messageText.set($any($event.target).value)"
                (keydown.enter)="sendMessage()"
                class="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />

              <button
                type="button"
                (click)="sendMessage()"
                class="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition active:scale-95 flex items-center justify-center"
              >
                <mat-icon class="text-sm" style="font-size: 18px; width: 18px; height: 18px;">send</mat-icon>
              </button>
            </div>
          </div>

        </div>

        <!-- Right 1 Col: Automated Project Scheduler & Milestones Calendar -->
        <div class="space-y-4">
          <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <mat-icon class="text-emerald-400 text-lg">calendar_month</mat-icon>
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">
                  Project Schedule & Events
                </h3>
              </div>
              <span class="text-xs font-mono text-slate-400">{{ state.scheduledEvents().length }} Scheduled</span>
            </div>

            <!-- Events List -->
            <div class="space-y-3">
              @for (ev of state.scheduledEvents(); track ev.id) {
                <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                      [class.bg-emerald-500/20]="ev.type === 'milestone_review'"
                      [class.text-emerald-400]="ev.type === 'milestone_review'"
                      [class.bg-blue-500/20]="ev.type === 'kickoff'"
                      [class.text-blue-400]="ev.type === 'kickoff'"
                      [class.bg-purple-500/20]="ev.type === 'code_walkthrough'"
                      [class.text-purple-400]="ev.type === 'code_walkthrough'">
                      {{ ev.type.replace('_', ' ') }}
                    </span>
                    <span class="text-xs font-mono text-amber-400 font-bold">{{ ev.date }}</span>
                  </div>

                  <h4 class="text-xs font-bold text-white">{{ ev.title }}</h4>
                  <p class="text-[11px] text-slate-400 leading-relaxed">{{ ev.description }}</p>

                  <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                    <span class="text-slate-400">Time: {{ ev.time }} ({{ ev.durationMinutes }}m)</span>
                    <a [href]="ev.meetLink" target="_blank" class="text-emerald-400 hover:underline flex items-center gap-1 font-semibold">
                      <span>Join Room</span>
                      <mat-icon style="font-size: 13px; width: 13px; height: 13px;">launch</mat-icon>
                    </a>
                  </div>
                </div>
              }
            </div>

            <!-- Schedule New Event CTA -->
            <button
              type="button"
              (click)="state.isSchedulerModalOpen.set(true)"
              class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <mat-icon class="text-sm" style="font-size: 16px; width: 16px; height: 16px;">add</mat-icon>
              <span>Schedule New Review / Call</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  `,
})
export class MessagesViewComponent {
  readonly state = inject(EscrowStateService);
  readonly web3 = inject(Web3SimulationService);
  readonly i18n = inject(I18nService);

  readonly messageText = signal<string>('');
  readonly attachedFile = signal<{ name: string; size: string; type: string } | null>(null);

  contractMessages() {
    return this.state.messages();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const f = input.files[0];
      this.attachedFile.set({
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(2)} MB`,
        type: f.type || 'application/octet-stream',
      });
    }
  }

  sendMessage() {
    const text = this.messageText().trim();
    if (!text && !this.attachedFile()) return;

    const currentAccount = this.web3.currentAccount();
    const contract = this.state.selectedContract();

    let attachmentObj = undefined;
    if (this.attachedFile()) {
      attachmentObj = {
        name: this.attachedFile()!.name,
        size: this.attachedFile()!.size,
        ipfsHash: this.web3.generateIpfsCid(),
        type: this.attachedFile()!.type,
      };
    }

    this.state.addChatMessage({
      contractId: contract.id,
      senderAddress: currentAccount.address,
      senderName: currentAccount.name,
      senderRole: currentAccount.role,
      senderAvatar: currentAccount.avatar,
      text: text || `Attached deliverable file: ${attachmentObj?.name}`,
      isEncrypted: true,
      attachment: attachmentObj,
    });

    this.messageText.set('');
    this.attachedFile.set(null);
  }
}
