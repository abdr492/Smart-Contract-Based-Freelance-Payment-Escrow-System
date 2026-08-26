import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HeaderComponent } from './components/header/header';
import { DashboardComponent } from './components/dashboard/dashboard';
import { ContractsViewComponent } from './components/contracts/contracts-view';
import { SolidityViewComponent } from './components/solidity-view/solidity-view';
import { DisputesViewComponent } from './components/disputes/disputes-view';
import { ReputationViewComponent } from './components/reputation/reputation-view';
import { MessagesViewComponent } from './components/messages/messages-view';
import { AnalyticsViewComponent } from './components/analytics/analytics-view';
import { ModalsComponent } from './components/modals/modals';
import { LoadingScreenComponent } from './components/loading-screen/loading-screen';
import { EscrowStateService } from './services/escrow-state.service';
import { I18nService } from './services/i18n.service';
import { Web3SimulationService } from './services/web3-simulation.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [
    CommonModule,
    MatIconModule,
    LoadingScreenComponent,
    HeaderComponent,
    DashboardComponent,
    ContractsViewComponent,
    SolidityViewComponent,
    DisputesViewComponent,
    ReputationViewComponent,
    MessagesViewComponent,
    AnalyticsViewComponent,
    ModalsComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly state = inject(EscrowStateService);
  readonly i18n = inject(I18nService);
  readonly web3 = inject(Web3SimulationService);
}

