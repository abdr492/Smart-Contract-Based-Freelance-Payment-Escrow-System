import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import * as d3 from 'd3';
import { ReputationProfile, TrustScoreHistoryPoint } from '../../models/escrow.models';
import { Web3SimulationService } from '../../services/web3-simulation.service';
import { I18nService } from '../../services/i18n.service';

type TimeRange = 'all' | '1y' | '6m' | '90d';
type MetricMode = 'trustScore' | 'scoreDelta' | 'volume';

@Component({
  selector: 'app-trust-score-trend',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
      
      <!-- Header with Metric Controls & Time Filter -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <mat-icon style="font-size: 18px; width: 18px; height: 18px;">trending_up</mat-icon>
            </div>
            <h3 class="text-sm font-bold text-white uppercase tracking-wider">
              Historical Trust Score Fluctuations & Milestone Velocity
            </h3>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              D3.js Real-Time Engine
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-1">
            Cryptographic reputation trajectory based on multi-sig execution speeds, milestone settlements, dispute verdicts, and soulbound badge mints.
          </p>
        </div>

        <!-- Metric & Timeframe Selectors -->
        <div class="flex flex-wrap items-center gap-2">
          
          <!-- Metric Mode Switcher -->
          <div class="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              type="button"
              (click)="metricMode.set('trustScore')"
              class="px-2.5 py-1 rounded-lg font-medium transition"
              [class.bg-emerald-500/20]="metricMode() === 'trustScore'"
              [class.text-emerald-400]="metricMode() === 'trustScore'"
              [class.text-slate-400]="metricMode() !== 'trustScore'"
            >
              Trust Score (0-100)
            </button>
            <button
              type="button"
              (click)="metricMode.set('volume')"
              class="px-2.5 py-1 rounded-lg font-medium transition"
              [class.bg-indigo-500/20]="metricMode() === 'volume'"
              [class.text-indigo-400]="metricMode() === 'volume'"
              [class.text-slate-400]="metricMode() !== 'volume'"
            >
              Cumulative ETH
            </button>
          </div>

          <!-- Time Range Buttons -->
          <div class="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
            @for (range of timeRanges; track range.id) {
              <button
                type="button"
                (click)="selectedRange.set(range.id)"
                class="px-2.5 py-1 rounded-lg font-medium transition"
                [class.bg-slate-800]="selectedRange() === range.id"
                [class.text-white]="selectedRange() === range.id"
                [class.text-slate-400]="selectedRange() !== range.id"
              >
                {{ range.label }}
              </button>
            }
          </div>

        </div>
      </div>

      <!-- Quick Summary Stats Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
          <div class="text-[11px] font-mono text-slate-500">Current Score</div>
          <div class="text-xl font-mono font-bold text-emerald-400 mt-0.5">
            {{ currentScore() }} / 100
          </div>
          <div class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
            <mat-icon style="font-size: 12px; width: 12px; height: 12px;" class="text-emerald-400">arrow_upward</mat-icon>
            <span>+{{ netGrowth() }} pts all-time growth</span>
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
          <div class="text-[11px] font-mono text-slate-500">Historical Range</div>
          <div class="text-xl font-mono font-bold text-white mt-0.5">
            {{ lowestScore() }} &rarr; {{ peakScore() }}
          </div>
          <div class="text-[10px] text-slate-400 mt-0.5 font-mono">
            {{ filteredHistory().length }} Verified On-Chain Events
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
          <div class="text-[11px] font-mono text-slate-500">Milestone Reliability</div>
          <div class="text-xl font-mono font-bold text-indigo-400 mt-0.5">
            {{ profile()?.completionRate || 99.2 }}%
          </div>
          <div class="text-[10px] text-slate-400 mt-0.5 font-mono">
            0 Arbitrated Defaults
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
          <div class="text-[11px] font-mono text-slate-500">Protocol Standing</div>
          <div class="text-xl font-mono font-bold text-amber-400 mt-0.5">
            Top Tier (SBT S-Rank)
          </div>
          <div class="text-[10px] text-slate-400 mt-0.5 font-mono">
            Eligible for 0% Escrow Collateral
          </div>
        </div>

      </div>

      <!-- D3 Interactive Chart Container -->
      <div class="relative w-full rounded-xl bg-slate-950 border border-slate-800 p-3 sm:p-4 overflow-hidden">
        
        <!-- Legend & Threshold Notes -->
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400 mb-2 px-1">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-0.5 bg-emerald-400 rounded-full inline-block"></span>
              <span class="text-slate-300">Trust Score Curve</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/30 border border-emerald-400 inline-block"></span>
              <span class="text-slate-400">Milestone Event / SBT Mint</span>
            </div>
            <div class="hidden sm:flex items-center gap-1.5">
              <span class="w-3 h-0.5 border-t border-dashed border-emerald-500/50 inline-block"></span>
              <span class="text-emerald-400/80">Elite Protocol Tier (90+)</span>
            </div>
          </div>

          <div class="text-[11px] text-slate-500">
            Hover points for on-chain block receipt details
          </div>
        </div>

        <!-- SVG Container for D3 rendering -->
        <div #chartContainer class="w-full h-72 sm:h-80 relative select-none">
          <svg #chartSvg class="w-full h-full block"></svg>

          <!-- Interactive Tooltip Box -->
          @if (activePoint()) {
            @let pt = activePoint()!;
            <div
              class="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-2.5 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md text-xs space-y-1 w-64"
              [style.left.px]="tooltipX()"
              [style.top.px]="tooltipY()"
            >
              <div class="flex items-center justify-between border-b border-slate-800 pb-1 font-mono text-[11px]">
                <span class="text-slate-400">{{ pt.date }}</span>
                <span
                  class="px-1.5 py-0.2 rounded font-bold"
                  [class.text-emerald-400]="pt.delta >= 0"
                  [class.bg-emerald-500/10]="pt.delta >= 0"
                  [class.text-rose-400]="pt.delta < 0"
                  [class.bg-rose-500/10]="pt.delta < 0"
                >
                  {{ pt.delta >= 0 ? '+' : '' }}{{ pt.delta }} pts
                </span>
              </div>

              <div class="flex items-center justify-between pt-0.5">
                <span class="text-slate-400">Trust Score:</span>
                <span class="text-sm font-mono font-bold text-emerald-400">{{ pt.score }} / 100</span>
              </div>

              @if (pt.volumeEth !== undefined) {
                <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Transacted Vol:</span>
                  <span class="text-slate-200 font-bold">{{ pt.volumeEth }} ETH</span>
                </div>
              }

              <p class="text-[11px] text-slate-300 font-sans leading-tight pt-1">
                {{ pt.event }}
              </p>

              @if (pt.contractTitle) {
                <div class="text-[10px] font-mono text-indigo-400 truncate pt-0.5">
                  Ref: {{ pt.contractTitle }}
                </div>
              }
            </div>
          }
        </div>

      </div>

      <!-- Chronological Milestone Event Ledger with Synced Hover -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <mat-icon class="text-slate-400 text-sm" style="font-size: 16px; width: 16px; height: 16px;">history</mat-icon>
            <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">
              On-Chain Milestone & Reputation Activity Ledger
            </h4>
          </div>
          <span class="text-xs font-mono text-slate-500">
            {{ filteredHistory().length }} Historical Records
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          @for (item of filteredHistory(); track item.id) {
            <div
              (mouseenter)="onPointHoverFromList(item)"
              (mouseleave)="onPointLeaveFromList()"
              class="p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-2"
              [class.bg-slate-950]="activePoint()?.id !== item.id"
              [class.border-slate-800]="activePoint()?.id !== item.id"
              [class.bg-slate-900]="activePoint()?.id === item.id"
              [class.border-emerald-500]="activePoint()?.id === item.id"
              [class.shadow-md]="activePoint()?.id === item.id"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <div
                    class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs"
                    [class.bg-emerald-500/10]="item.category === 'milestone_completed' || item.category === 'audit_passed'"
                    [class.text-emerald-400]="item.category === 'milestone_completed' || item.category === 'audit_passed'"
                    [class.bg-amber-500/10]="item.category === 'sbt_minted'"
                    [class.text-amber-400]="item.category === 'sbt_minted'"
                    [class.bg-indigo-500/10]="item.category === 'on_time_streak'"
                    [class.text-indigo-400]="item.category === 'on_time_streak'"
                    [class.bg-slate-800]="item.category === 'initialization' || item.category === 'dispute_resolved'"
                    [class.text-slate-300]="item.category === 'initialization' || item.category === 'dispute_resolved'"
                  >
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px;">
                      {{ getCategoryIcon(item.category) }}
                    </mat-icon>
                  </div>
                  <div>
                    <span class="text-xs font-mono text-slate-400 block">{{ item.date }}</span>
                    <span class="text-xs font-bold text-white line-clamp-1">{{ item.event }}</span>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <span class="text-xs font-mono font-bold text-emerald-400 block">{{ item.score }} pts</span>
                  <span
                    class="text-[10px] font-mono"
                    [class.text-emerald-400]="item.delta >= 0"
                    [class.text-rose-400]="item.delta < 0"
                  >
                    {{ item.delta >= 0 ? '+' : '' }}{{ item.delta }}
                  </span>
                </div>
              </div>

              @if (item.contractTitle) {
                <div class="text-[11px] font-mono text-slate-400 bg-slate-900/60 px-2 py-1 rounded-lg truncate border border-slate-800/60">
                  Contract: <span class="text-slate-300">{{ item.contractTitle }}</span>
                </div>
              }
            </div>
          }
        </div>
      </div>

    </div>
  `,
})
export class TrustScoreTrendComponent implements OnInit, OnDestroy {
  readonly web3 = inject(Web3SimulationService);
  readonly i18n = inject(I18nService);

  readonly profile = input<ReputationProfile | null>(null);

  readonly chartContainer = viewChild<ElementRef<HTMLDivElement>>('chartContainer');
  readonly chartSvg = viewChild<ElementRef<SVGSVGElement>>('chartSvg');

  readonly selectedRange = signal<TimeRange>('all');
  readonly metricMode = signal<MetricMode>('trustScore');

  readonly activePoint = signal<TrustScoreHistoryPoint | null>(null);
  readonly tooltipX = signal<number>(0);
  readonly tooltipY = signal<number>(0);

  readonly timeRanges: { id: TimeRange; label: string }[] = [
    { id: 'all', label: 'All Time' },
    { id: '1y', label: '1 Year' },
    { id: '6m', label: '6 Mos' },
    { id: '90d', label: '90 Days' },
  ];

  private resizeObserver: ResizeObserver | null = null;

  readonly allHistory = computed<TrustScoreHistoryPoint[]>(() => {
    const prof = this.profile();
    if (!prof || !prof.trustScoreHistory || prof.trustScoreHistory.length === 0) {
      return this.generateFallbackHistory(prof?.trustScore || 95);
    }
    return [...prof.trustScoreHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  });

  readonly filteredHistory = computed<TrustScoreHistoryPoint[]>(() => {
    const list = this.allHistory();
    const range = this.selectedRange();

    if (list.length === 0 || range === 'all') {
      return list;
    }

    const latestDate = new Date(list[list.length - 1].date);
    const cutoff = new Date(latestDate);

    if (range === '1y') {
      cutoff.setFullYear(cutoff.getFullYear() - 1);
    } else if (range === '6m') {
      cutoff.setMonth(cutoff.getMonth() - 6);
    } else if (range === '90d') {
      cutoff.setDate(cutoff.getDate() - 90);
    }

    const filtered = list.filter((pt) => new Date(pt.date) >= cutoff);
    return filtered.length >= 2 ? filtered : list.slice(-4);
  });

  readonly currentScore = computed<number>(() => {
    const list = this.filteredHistory();
    if (list.length === 0) return this.profile()?.trustScore || 95;
    return list[list.length - 1].score;
  });

  readonly lowestScore = computed<number>(() => {
    const list = this.filteredHistory();
    if (list.length === 0) return 80;
    return Math.min(...list.map((p) => p.score));
  });

  readonly peakScore = computed<number>(() => {
    const list = this.filteredHistory();
    if (list.length === 0) return 98;
    return Math.max(...list.map((p) => p.score));
  });

  readonly netGrowth = computed<number>(() => {
    const list = this.filteredHistory();
    if (list.length === 0) return 18;
    const start = list[0].score;
    const end = list[list.length - 1].score;
    return Math.max(0, end - start);
  });

  constructor() {
    // Redraw whenever the filtered data or metric mode changes
    effect(() => {
      // access signals to subscribe
      this.filteredHistory();
      this.metricMode();
      this.profile();
      if (typeof window !== 'undefined') {
        setTimeout(() => this.renderD3Chart(), 10);
      }
    });
  }

  ngOnInit() {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.setupResizeObserver();
        this.renderD3Chart();
      }, 50);
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private setupResizeObserver() {
    const container = this.chartContainer()?.nativeElement;
    if (!container || typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => {
      this.renderD3Chart();
    });
    this.resizeObserver.observe(container);
  }

  renderD3Chart() {
    const svgEl = this.chartSvg()?.nativeElement;
    const containerEl = this.chartContainer()?.nativeElement;
    if (!svgEl || !containerEl) return;

    const data = this.filteredHistory();
    if (data.length === 0) return;

    const width = containerEl.clientWidth;
    const height = containerEl.clientHeight;
    if (width <= 0 || height <= 0) return;

    const margin = { top: 25, right: 30, bottom: 40, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse Dates
    const parseDate = (dStr: string) => new Date(dStr);
    const parsedData = data.map((d) => ({
      ...d,
      parsedDate: parseDate(d.date),
    }));

    // Scales
    const xExtent = d3.extent(parsedData, (d) => d.parsedDate) as [Date, Date];
    const xScale = d3.scaleTime().domain(xExtent).range([0, innerWidth]);

    const isVolumeMode = this.metricMode() === 'volume';
    let yScale: d3.ScaleLinear<number, number>;

    if (isVolumeMode) {
      const maxVol = d3.max(parsedData, (d) => d.volumeEth || 10) || 100;
      yScale = d3
        .scaleLinear()
        .domain([0, maxVol * 1.15])
        .nice()
        .range([innerHeight, 0]);
    } else {
      const minScore = Math.max(0, (d3.min(parsedData, (d) => d.score) || 75) - 5);
      const maxScore = Math.min(100, (d3.max(parsedData, (d) => d.score) || 98) + 2);
      yScale = d3
        .scaleLinear()
        .domain([minScore, maxScore])
        .nice()
        .range([innerHeight, 0]);
    }

    // SVG Defs (Gradients & Filters)
    const defs = svg.append('defs');

    // Area Gradient
    const gradientId = `trust-grad-${Math.random().toString(36).substring(2, 9)}`;
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    const themeColor = isVolumeMode ? '#6366f1' : '#10b981';

    areaGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', themeColor)
      .attr('stop-opacity', 0.35);

    areaGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', themeColor)
      .attr('stop-opacity', 0.0);

    // Glow Filter
    const filter = defs.append('filter').attr('id', 'glow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Elite Tier Reference Band (Score >= 90) when in trust score mode
    if (!isVolumeMode && yScale(90) >= 0 && yScale(100) <= innerHeight) {
      const topTierY = Math.max(0, yScale(100));
      const tier90Y = yScale(90);
      if (tier90Y > topTierY) {
        g.append('rect')
          .attr('x', 0)
          .attr('y', topTierY)
          .attr('width', innerWidth)
          .attr('height', tier90Y - topTierY)
          .attr('fill', '#10b981')
          .attr('fill-opacity', 0.04)
          .attr('rx', 4);

        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', tier90Y)
          .attr('y2', tier90Y)
          .attr('stroke', '#10b981')
          .attr('stroke-opacity', 0.3)
          .attr('stroke-dasharray', '4 4');

        g.append('text')
          .attr('x', innerWidth - 8)
          .attr('y', tier90Y - 6)
          .attr('text-anchor', 'end')
          .attr('fill', '#10b981')
          .attr('fill-opacity', 0.8)
          .attr('font-size', '10px')
          .attr('font-family', 'monospace')
          .text('Tier 1 Threshold (90 pts)');
      }
    }

    // Gridlines
    const yTicks = yScale.ticks(5);
    g.selectAll('.grid-line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', '3 3');

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.max(3, Math.floor(innerWidth / 90)))
      .tickFormat((d) => d3.timeFormat('%b %Y')(d as Date));

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => (isVolumeMode ? `${d}Ξ` : `${d}`));

    const xAxisG = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisG.select('.domain').attr('stroke', '#475569').attr('stroke-opacity', 0.6);
    xAxisG.selectAll('.tick line').attr('stroke', '#475569').attr('stroke-opacity', 0.6);
    xAxisG
      .selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('dy', '1em');

    const yAxisG = g.append('g').call(yAxis);
    yAxisG.select('.domain').attr('stroke', '#475569').attr('stroke-opacity', 0.6);
    yAxisG.selectAll('.tick line').attr('stroke', '#475569').attr('stroke-opacity', 0.6);
    yAxisG
      .selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Value accessor helper
    const getValue = (d: typeof parsedData[0]) =>
      isVolumeMode ? (d.volumeEth || 0) : d.score;

    // D3 Area Generator
    const areaGen = d3
      .area<typeof parsedData[0]>()
      .x((d) => xScale(d.parsedDate))
      .y0(innerHeight)
      .y1((d) => yScale(getValue(d)))
      .curve(d3.curveMonotoneX);

    // Append Area Path
    g.append('path')
      .datum(parsedData)
      .attr('fill', `url(#${gradientId})`)
      .attr('d', areaGen);

    // D3 Line Generator
    const lineGen = d3
      .line<typeof parsedData[0]>()
      .x((d) => xScale(d.parsedDate))
      .y((d) => yScale(getValue(d)))
      .curve(d3.curveMonotoneX);

    // Glow Underlay Line
    g.append('path')
      .datum(parsedData)
      .attr('fill', 'none')
      .attr('stroke', themeColor)
      .attr('stroke-width', 5)
      .attr('stroke-opacity', 0.25)
      .attr('filter', 'url(#glow)')
      .attr('d', lineGen);

    // Primary High-Contrast Line Path
    g.append('path')
      .datum(parsedData)
      .attr('fill', 'none')
      .attr('stroke', themeColor)
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', lineGen);

    // Datapoints Group
    const pointsG = g.append('g').attr('class', 'datapoints');

    parsedData.forEach((pt) => {
      const cx = xScale(pt.parsedDate);
      const cy = yScale(getValue(pt));

      const isSbt = pt.category === 'sbt_minted';
      const isDispute = pt.category === 'dispute_resolved';

      // Pulse ring for SBT or Dispute resolution points
      if (isSbt || isDispute) {
        pointsG
          .append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 8)
          .attr('fill', isSbt ? '#f59e0b' : '#6366f1')
          .attr('fill-opacity', 0.2)
          .attr('stroke', isSbt ? '#f59e0b' : '#6366f1')
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.5);
      }

      // Outer point
      pointsG
        .append('circle')
        .attr('class', `point-${pt.id}`)
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 4.5)
        .attr('fill', '#020617')
        .attr('stroke', isSbt ? '#f59e0b' : themeColor)
        .attr('stroke-width', 2)
        .style('cursor', 'pointer');
    });

    // Crosshair Guide elements
    const focusG = g.append('g').style('display', 'none');

    const verticalLine = focusG
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#64748b')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3 3');

    const focusCircle = focusG
      .append('circle')
      .attr('r', 7)
      .attr('fill', themeColor)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    // Mouse Overlay Rect for seamless hovering
    const bisectDate = d3.bisector((d: typeof parsedData[0]) => d.parsedDate).center;

    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mouseenter', () => {
        focusG.style('display', null);
      })
      .on('mouseleave', () => {
        focusG.style('display', 'none');
        this.activePoint.set(null);
      })
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event);
        const x0 = xScale.invert(mx);
        const index = bisectDate(parsedData, x0);
        const selected = parsedData[index];

        if (selected) {
          const cx = xScale(selected.parsedDate);
          const cy = yScale(getValue(selected));

          verticalLine.attr('x1', cx).attr('x2', cx);
          focusCircle.attr('cx', cx).attr('cy', cy);

          // Update tooltip signals
          this.activePoint.set(selected);
          this.tooltipX.set(cx + margin.left);
          this.tooltipY.set(cy + margin.top);
        }
      });
  }

  onPointHoverFromList(item: TrustScoreHistoryPoint) {
    this.activePoint.set(item);
    const svgEl = this.chartSvg()?.nativeElement;
    const containerEl = this.chartContainer()?.nativeElement;
    if (!svgEl || !containerEl) return;

    const data = this.filteredHistory();
    const margin = { top: 25, right: 30, bottom: 40, left: 45 };
    const innerWidth = containerEl.clientWidth - margin.left - margin.right;
    const innerHeight = containerEl.clientHeight - margin.top - margin.bottom;

    const parsedData = data.map((d) => ({
      ...d,
      parsedDate: new Date(d.date),
    }));

    const xExtent = d3.extent(parsedData, (d) => d.parsedDate) as [Date, Date];
    const xScale = d3.scaleTime().domain(xExtent).range([0, innerWidth]);

    const isVolumeMode = this.metricMode() === 'volume';
    let yScale: d3.ScaleLinear<number, number>;

    if (isVolumeMode) {
      const maxVol = d3.max(parsedData, (d) => d.volumeEth || 10) || 100;
      yScale = d3.scaleLinear().domain([0, maxVol * 1.15]).nice().range([innerHeight, 0]);
    } else {
      const minScore = Math.max(0, (d3.min(parsedData, (d) => d.score) || 75) - 5);
      const maxScore = Math.min(100, (d3.max(parsedData, (d) => d.score) || 98) + 2);
      yScale = d3.scaleLinear().domain([minScore, maxScore]).nice().range([innerHeight, 0]);
    }

    const pt = parsedData.find((p) => p.id === item.id);
    if (pt) {
      const cx = xScale(pt.parsedDate);
      const cy = yScale(isVolumeMode ? (pt.volumeEth || 0) : pt.score);
      this.tooltipX.set(cx + margin.left);
      this.tooltipY.set(cy + margin.top);
    }
  }

  onPointLeaveFromList() {
    this.activePoint.set(null);
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'milestone_completed':
        return 'task_alt';
      case 'sbt_minted':
        return 'workspace_premium';
      case 'audit_passed':
        return 'verified';
      case 'on_time_streak':
        return 'bolt';
      case 'dispute_resolved':
        return 'gavel';
      default:
        return 'account_circle';
    }
  }

  private generateFallbackHistory(currentScore: number): TrustScoreHistoryPoint[] {
    return [
      {
        id: 'fb-1',
        date: '2024-01-15',
        score: Math.max(70, currentScore - 18),
        delta: Math.max(70, currentScore - 18),
        event: 'On-Chain Identity Verification',
        category: 'initialization',
        volumeEth: 0,
      },
      {
        id: 'fb-2',
        date: '2024-06-20',
        score: Math.max(75, currentScore - 12),
        delta: 6,
        event: 'Completed Multi-Sig Escrow Milestone Release',
        category: 'milestone_completed',
        volumeEth: 10.0,
      },
      {
        id: 'fb-3',
        date: '2025-02-10',
        score: Math.max(80, currentScore - 6),
        delta: 6,
        event: 'Awarded Soulbound Achievement Proof Token',
        category: 'sbt_minted',
        volumeEth: 35.0,
      },
      {
        id: 'fb-4',
        date: '2026-08-15',
        score: currentScore,
        delta: 6,
        event: 'Top Tier Protocol Settlement Confirmed',
        category: 'milestone_completed',
        volumeEth: 75.0,
      },
    ];
  }
}
