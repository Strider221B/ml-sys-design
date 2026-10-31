import React from 'react';
import { AiExchangeModal } from '@/components/ai_exchange/ai_exchange_modal';
import { AgentCascadeSimulator, CascadeSimulationResult } from '@/core/chaos/agent_cascade_simulator';
import { ChaosConstants } from '@/core/chaos/chaos_constants';
import { EdgeModelParams, EdgeQuantizationDebugger, EdgeSimResult, QuantizationPrecision } from '@/core/chaos/edge_quantization_debugger';
import { CanvasGraph, FaultDescriptor, FaultInjectionEngine } from '@/core/chaos/fault_injection_engine';
import { ArgonReviewData, GeminiArgonReviewer } from '@/core/chaos/gemini_argon_reviewer';
import { IncidentEvent, IncidentRouletteEngine, MitigationResult } from '@/core/chaos/incident_roulette_engine';
import { WorkspaceEdge, WorkspaceNode } from '@/core/state/workspace_types';
import { LLMExchangeEnvelope } from '@/schemas/exchange_envelope_schema';

export type ChaosTab = 'PLAYGROUND' | 'ARGON' | 'CASCADE' | 'QUANTIZATION' | 'ROULETTE';

export interface ChaosWorkspaceProps {
  initialTab?: ChaosTab | undefined;
  faultEngine?: FaultInjectionEngine | undefined;
  argonReviewer?: GeminiArgonReviewer | undefined;
  cascadeSimulator?: AgentCascadeSimulator | undefined;
  quantizationDebugger?: EdgeQuantizationDebugger | undefined;
  rouletteEngine?: IncidentRouletteEngine | undefined;
  initialNodes?: WorkspaceNode[] | undefined;
  initialEdges?: WorkspaceEdge[] | undefined;
}

export interface ChaosWorkspaceState {
  activeTab: ChaosTab;
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
  selectedTargetId: string;
  selectedFaultType: string;
  blastRadius: number;
  faultLogs: string[];
  isAnalyzingArgon: boolean;
  argonData: ArgonReviewData | null;
  argonEnvelope: LLMExchangeEnvelope | null;
  isExchangeModalOpen: boolean;
  cascadeResult: CascadeSimulationResult | null;
  circuitBreakerEnabled: boolean;
  selectedPrecision: QuantizationPrecision;
  paramCountBillions: number;
  quantizationResult: EdgeSimResult | null;
  activeIncident: IncidentEvent | null;
  errorBudgetMinutes: number;
  errorBudgetPct: number;
  mitigationFeedback: string | null;
}

/**
 * Interactive failure injection, adversarial red-teaming, and incident response console.
 */
export class ChaosSandboxWorkspace extends React.Component<ChaosWorkspaceProps, ChaosWorkspaceState> {
  private static readonly _LABEL_TITLE = 'Chaos Engineering & Failure Sandbox';
  private static readonly _DEFAULT_TARGET = 'edge_1';
  private static readonly _DEFAULT_FAULT = ChaosConstants.FAULT_NETWORK_PARTITION;
  private static readonly _DEFAULT_PARAMS_B = 7;

  public constructor(props: ChaosWorkspaceProps) {
    super(props);
    this._faultEngine = props.faultEngine ?? new FaultInjectionEngine();
    this._argonReviewer = props.argonReviewer ?? null;
    this._cascadeSimulator = props.cascadeSimulator ?? new AgentCascadeSimulator();
    this._quantizationDebugger = props.quantizationDebugger ?? new EdgeQuantizationDebugger();
    this._rouletteEngine = props.rouletteEngine ?? new IncidentRouletteEngine();

    const nodes = props.initialNodes ?? this._buildDefaultNodes();
    const edges = props.initialEdges ?? this._buildDefaultEdges();

    this.state = {
      activeTab: props.initialTab ?? 'PLAYGROUND',
      nodes,
      edges,
      selectedTargetId: edges[0]?.id ?? ChaosSandboxWorkspace._DEFAULT_TARGET,
      selectedFaultType: ChaosSandboxWorkspace._DEFAULT_FAULT,
      blastRadius: 0,
      faultLogs: [],
      isAnalyzingArgon: false,
      argonData: null,
      argonEnvelope: null,
      isExchangeModalOpen: false,
      cascadeResult: null,
      circuitBreakerEnabled: true,
      selectedPrecision: 'INT4',
      paramCountBillions: ChaosSandboxWorkspace._DEFAULT_PARAMS_B,
      quantizationResult: null,
      activeIncident: null,
      errorBudgetMinutes: this._rouletteEngine.getErrorBudgetRemaining(),
      errorBudgetPct: this._rouletteEngine.getErrorBudgetPercentage(),
      mitigationFeedback: null,
    };
  }

  public override render(): React.ReactNode {
    return (
      <div className="flex flex-col h-full w-full bg-neutral-950 text-neutral-100 p-4 gap-4" data-testid="chaos-workspace">
        {this._renderHeader()}
        {this._renderTabNavigation()}
        <div className="flex-1 min-h-0 bg-neutral-900/60 border border-neutral-800 rounded-lg p-4 overflow-y-auto">
          {this._renderActiveTabContent()}
        </div>
        {this._renderExchangeModal()}
      </div>
    );
  }

  private readonly _faultEngine: FaultInjectionEngine;
  private readonly _argonReviewer: GeminiArgonReviewer | null;
  private readonly _cascadeSimulator: AgentCascadeSimulator;
  private readonly _quantizationDebugger: EdgeQuantizationDebugger;
  private readonly _rouletteEngine: IncidentRouletteEngine;

  private _renderHeader(): React.ReactNode {
    return (
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">{ChaosSandboxWorkspace._LABEL_TITLE}</h1>
          <p className="text-xs text-neutral-400">Adversarial fault injection, cascade breakers, edge profiling, and incident roulette</p>
        </div>
        <button onClick={this._handleResetAll} className="rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-xs font-semibold">
          Reset Environment
        </button>
      </div>
    );
  }

  private _renderTabNavigation(): React.ReactNode {
    const tabs: { id: ChaosTab; label: string }[] = [
      { id: 'PLAYGROUND', label: '1. Adversarial Playground' },
      { id: 'ARGON', label: '2. Gemini Argon Reviewer' },
      { id: 'CASCADE', label: '3. Agent Cascade Simulator' },
      { id: 'QUANTIZATION', label: '4. Edge & Quantization' },
      { id: 'ROULETTE', label: '5. Incident Roulette' },
    ];
    return (
      <div className="flex gap-2 overflow-x-auto pb-1" data-testid="chaos-tab-bar">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => this.setState({ activeTab: tab.id })} className={`px-3 py-1.5 rounded text-xs transition ${this.state.activeTab === tab.id ? 'bg-purple-600 text-white font-bold' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  private _renderActiveTabContent(): React.ReactNode {
    if (this.state.activeTab === 'PLAYGROUND') return this._renderPlaygroundTab();
    if (this.state.activeTab === 'ARGON') return this._renderArgonTab();
    if (this.state.activeTab === 'CASCADE') return this._renderCascadeTab();
    if (this.state.activeTab === 'QUANTIZATION') return this._renderQuantizationTab();
    return this._renderRouletteTab();
  }

  private _renderPlaygroundTab(): React.ReactNode {
    return (
      <div className="flex flex-col gap-4" data-testid="tab-playground">
        {this._renderPlaygroundControls()}
        {this._renderPlaygroundMetrics()}
      </div>
    );
  }

  private _renderPlaygroundControls(): React.ReactNode {
    return (
      <div className="flex flex-wrap items-center gap-3 bg-neutral-950 p-3 rounded border border-neutral-800">
        <label className="text-xs text-neutral-300">Target:</label>
        <select value={this.state.selectedTargetId} onChange={(e) => this.setState({ selectedTargetId: e.target.value })} className="rounded bg-neutral-900 border border-neutral-700 p-1 text-xs">
          {this.state.edges.map((e) => (<option key={e.id} value={e.id}>Edge: {e.id}</option>))}
          {this.state.nodes.map((n) => (<option key={n.id} value={n.id}>Node: {n.data.label}</option>))}
        </select>
        <label className="text-xs text-neutral-300">Fault:</label>
        <select value={this.state.selectedFaultType} onChange={(e) => this.setState({ selectedFaultType: e.target.value })} className="rounded bg-neutral-900 border border-neutral-700 p-1 text-xs">
          <option value={ChaosConstants.FAULT_NETWORK_PARTITION}>Network Partition</option>
          <option value={ChaosConstants.FAULT_TOKEN_OVERFLOW}>Context Window Overflow</option>
          <option value={ChaosConstants.FAULT_RACE_CONDITION}>Race Condition Jitter</option>
          <option value={ChaosConstants.FAULT_CLOCK_SKEW}>Timestamp Clock Skew</option>
        </select>
        <button onClick={this._handleInjectFault} className="rounded bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs font-bold text-white">
          Inject Fault
        </button>
      </div>
    );
  }

  private _renderPlaygroundMetrics(): React.ReactNode {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded border border-neutral-800 bg-neutral-950 p-3">
          <div className="text-xs font-semibold text-neutral-400">Blast Radius: {this.state.blastRadius}/100</div>
          <div className="w-full bg-neutral-800 h-2 rounded mt-2">
            <div className="bg-rose-500 h-2 rounded" style={{ width: `${this.state.blastRadius}%` }} />
          </div>
        </div>
        <div className="rounded border border-neutral-800 bg-neutral-950 p-3">
          <div className="text-xs font-semibold text-neutral-400">Active Fault Logs</div>
          <ul className="text-xs font-mono text-neutral-300 mt-1 max-h-32 overflow-y-auto">
            {this.state.faultLogs.map((log, idx) => (<li key={idx}>• {log}</li>))}
          </ul>
        </div>
      </div>
    );
  }

  private _renderArgonTab(): React.ReactNode {
    return (
      <div className="flex flex-col gap-4" data-testid="tab-argon">
        <div className="flex justify-between items-center bg-neutral-950 p-3 rounded border border-neutral-800">
          <div>
            <div className="text-sm font-bold text-purple-400">Gemini Argon Reviewer</div>
            <p className="text-xs text-neutral-400">Scans architecture DAG to synthesize targeted killer workload packets.</p>
          </div>
          <button onClick={this._handleAnalyzeArgon} disabled={this.state.isAnalyzingArgon} className="rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-3 py-1.5 text-xs font-bold">
            {this.state.isAnalyzingArgon ? 'Reviewing...' : 'Red-Team Architecture'}
          </button>
        </div>
        {this._renderArgonReport()}
      </div>
    );
  }

  private _renderArgonReport(): React.ReactNode {
    if (!this.state.argonData) return null;
    const packet = this.state.argonData.killerWorkloadPacket;
    return (
      <div className="rounded border border-purple-900 bg-neutral-950 p-4 flex flex-col gap-3" data-testid="argon-report">
        <div className="font-bold text-sm text-purple-300">Targeted Vulnerability: {this.state.argonData.targetedVulnerability}</div>
        <p className="text-xs text-neutral-300">{this.state.argonData.adversarialCritique}</p>
        <div className="rounded bg-neutral-900 border border-neutral-800 p-3 text-xs font-mono">
          <div className="text-purple-400 font-semibold mb-1">Killer Workload Packet ({packet.trafficPattern} @ {packet.burstQPS} QPS)</div>
          <div className="text-neutral-400">{packet.adversarialPayloadDescription}</div>
          <pre className="text-xs text-neutral-300 mt-2 whitespace-pre-wrap">{packet.samplePayloadSnippet}</pre>
        </div>
      </div>
    );
  }

  private _renderCascadeTab(): React.ReactNode {
    return (
      <div className="flex flex-col gap-4" data-testid="tab-cascade">
        {this._renderCascadeControls()}
        {this.state.cascadeResult && this._renderCascadeDetails(this.state.cascadeResult)}
      </div>
    );
  }

  private _renderCascadeControls(): React.ReactNode {
    return (
      <div className="flex items-center justify-between bg-neutral-950 p-3 rounded border border-neutral-800">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={this.state.circuitBreakerEnabled} onChange={(e) => this.setState({ circuitBreakerEnabled: e.target.checked })} />
          Enable Circuit Breaker (Max Depth: 5, Budget: $10.00)
        </label>
        <button onClick={this._handleSimulateCascade} className="rounded bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-bold">
          Simulate Cascade
        </button>
      </div>
    );
  }

  private _renderCascadeDetails(res: CascadeSimulationResult): React.ReactNode {
    return (
      <div className="rounded border border-neutral-800 bg-neutral-950 p-3 flex flex-col gap-2" data-testid="cascade-result">
        <div className="flex justify-between items-center text-xs font-bold">
          <span>Status: {res.systemStatus}</span>
          <span className="font-mono">Tokens: {res.totalTokensUsed} · Cost: ${res.totalCostUsd.toFixed(2)}</span>
        </div>
        {res.tripReason && <div className="text-xs text-amber-400">Intervention: {res.tripReason}</div>}
        <div className="text-xs font-mono text-neutral-400 mt-1 max-h-40 overflow-y-auto">
          {res.iterations.map((iter) => (
            <div key={iter.iterationIndex} className="py-0.5">• Turn {iter.iterationIndex + 1}: {iter.fromAgentId} → {iter.toAgentId} ({iter.message})</div>
          ))}
        </div>
      </div>
    );
  }

  private _renderQuantizationTab(): React.ReactNode {
    return (
      <div className="flex flex-col gap-4" data-testid="tab-quantization">
        {this._renderQuantizationControls()}
        {this.state.quantizationResult && this._renderQuantizationDetails(this.state.quantizationResult)}
      </div>
    );
  }

  private _renderQuantizationControls(): React.ReactNode {
    return (
      <div className="flex flex-wrap items-center gap-3 bg-neutral-950 p-3 rounded border border-neutral-800">
        <label className="text-xs text-neutral-300">Parameters (B):</label>
        <select value={this.state.paramCountBillions} onChange={(e) => this.setState({ paramCountBillions: Number(e.target.value) })} className="rounded bg-neutral-900 border border-neutral-700 p-1 text-xs">
          <option value={7}>7B</option>
          <option value={13}>13B</option>
          <option value={70}>70B</option>
        </select>
        <label className="text-xs text-neutral-300">Precision:</label>
        <select value={this.state.selectedPrecision} onChange={(e) => this.setState({ selectedPrecision: e.target.value as QuantizationPrecision })} className="rounded bg-neutral-900 border border-neutral-700 p-1 text-xs">
          <option value="FP32">FP32</option>
          <option value="FP16">FP16</option>
          <option value="INT8">INT8</option>
          <option value="INT4">INT4</option>
        </select>
        <button onClick={this._handleSimulateQuantization} className="rounded bg-teal-600 hover:bg-teal-500 px-3 py-1.5 text-xs font-bold text-white">
          Profile Envelope
        </button>
      </div>
    );
  }

  private _renderQuantizationDetails(res: EdgeSimResult): React.ReactNode {
    return (
      <div className="rounded border border-neutral-800 bg-neutral-950 p-3 flex flex-col gap-2" data-testid="quantization-result">
        <div className="flex justify-between items-center text-xs">
          <span className={`font-bold ${res.isOom ? 'text-rose-400' : 'text-emerald-400'}`}>
            Memory: {res.memoryFootprintGb} GB / {res.memoryCeilingGb} GB {res.isOom ? '(OOM CRASH!)' : '(Fits Envelope)'}
          </span>
          <span className="text-neutral-400 font-mono">Δ PPL: +{res.perplexityDelta}</span>
        </div>
        <div className="text-xs text-neutral-300">Recommendation: {res.recommendation}</div>
      </div>
    );
  }

  private _renderRouletteTab(): React.ReactNode {
    return (
      <div className="flex flex-col gap-4" data-testid="tab-roulette">
        <div className="flex items-center justify-between bg-neutral-950 p-3 rounded border border-neutral-800">
          <div>
            <div className="text-xs font-bold text-neutral-200">99.9% Monthly Error Budget Remaining</div>
            <div className="text-xs font-mono text-neutral-400">{this.state.errorBudgetMinutes} min / 43.2 min ({this.state.errorBudgetPct}%)</div>
          </div>
          <button onClick={this._handleTriggerIncident} className="rounded bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs font-bold text-white">
            Trigger Incident
          </button>
        </div>
        {this.state.activeIncident && this._renderActiveIncidentPane(this.state.activeIncident)}
      </div>
    );
  }

  private _renderActiveIncidentPane(inc: IncidentEvent): React.ReactNode {
    return (
      <div className="rounded border border-rose-800 bg-rose-950/40 p-4 flex flex-col gap-3" data-testid="active-incident">
        <div className="flex justify-between items-center">
          <span className="font-bold text-rose-300">{inc.title}</span>
          <span className="font-mono text-xs text-rose-400">p99: {inc.currentP99Ms}ms (SLA: {inc.slaP99Ms}ms)</span>
        </div>
        <p className="text-xs text-neutral-300">{inc.description}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
          {inc.remediationChoices.map((c) => (
            <button key={c.id} onClick={() => this._handleApplyMitigation(c.id)} className="rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 p-2 text-left text-xs transition">
              <div className="font-bold text-neutral-200">{c.title}</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">{c.description}</div>
            </button>
          ))}
        </div>
        {this.state.mitigationFeedback && <div className="text-xs text-emerald-400 mt-1">{this.state.mitigationFeedback}</div>}
      </div>
    );
  }

  private _renderExchangeModal(): React.ReactNode {
    return (
      <AiExchangeModal
        isOpen={this.state.isExchangeModalOpen}
        envelope={this.state.argonEnvelope}
        onClose={() => this.setState({ isExchangeModalOpen: false })}
        onImportSuccess={this._handleImportSuccess}
      />
    );
  }

  private _handleInjectFault = (): void => {
    const isEdge = this.state.edges.some((e) => e.id === this.state.selectedTargetId);
    const fault: FaultDescriptor = {
      faultType: this.state.selectedFaultType,
      targetId: this.state.selectedTargetId,
      targetType: isEdge ? 'EDGE' : 'NODE',
    };
    const res = this._faultEngine.injectFault({ nodes: this.state.nodes, edges: this.state.edges }, fault);
    this.setState({
      nodes: res.nodes,
      edges: res.edges,
      blastRadius: res.blastRadiusScore,
      faultLogs: [...this.state.faultLogs, ...res.logs],
    });
  };

  private _handleAnalyzeArgon = async (): Promise<void> => {
    this.setState({ isAnalyzingArgon: true });
    const graph: CanvasGraph = { nodes: this.state.nodes, edges: this.state.edges };
    if (!this._argonReviewer) {
      this._applyFallbackArgonReview();
      return;
    }
    const review = await this._argonReviewer.analyzeVulnerabilities(graph);
    this._applyArgonReviewResult(review);
  };

  private _applyFallbackArgonReview(): void {
    const packet = {
      trafficPattern: 'LONG_CONTEXT_PROMPT_BOMB' as const,
      burstQPS: 25000,
      adversarialPayloadDescription: 'Context window saturation & latency SLA breach',
      samplePayloadSnippet: '{"prompt": "[REPEATED_HIGH_ENTROPY_TOKENS_128K]"}',
    };
    this.setState({
      isAnalyzingArgon: false,
      argonData: {
        adversarialCritique: 'Identified unmitigated throughput bottleneck on inference serving layer.',
        targetedVulnerability: 'Missing concurrency rate limiter on generation node.',
        killerWorkloadPacket: packet,
        predictedSystemFailure: 'Context window saturation & latency SLA breach',
      },
    });
  }

  private _applyArgonReviewResult(review: { data: ArgonReviewData | null; envelope?: LLMExchangeEnvelope | undefined }): void {
    if (review.data) {
      this.setState({ isAnalyzingArgon: false, argonData: review.data, argonEnvelope: review.envelope ?? null });
    } else {
      this.setState({ isAnalyzingArgon: false, argonEnvelope: review.envelope ?? null, isExchangeModalOpen: Boolean(review.envelope) });
    }
  }

  private _handleImportSuccess = (imported: unknown): void => {
    const data = imported as ArgonReviewData;
    this.setState({ argonData: data });
  };

  private _handleSimulateCascade = (): void => {
    const swarm = this._cascadeSimulator.createDefaultAgentSwarm();
    const res = this._cascadeSimulator.simulateCascade(swarm, { enableCircuitBreaker: this.state.circuitBreakerEnabled });
    this.setState({ cascadeResult: res });
  };

  private _handleSimulateQuantization = (): void => {
    const params: EdgeModelParams = { paramCountBillions: this.state.paramCountBillions, precision: this.state.selectedPrecision };
    const res = this._quantizationDebugger.simulateEdgeDeployment(params);
    this.setState({ quantizationResult: res });
  };

  private _handleTriggerIncident = (): void => {
    const inc = this._rouletteEngine.triggerRandomIncident();
    this.setState({
      activeIncident: inc,
      errorBudgetMinutes: this._rouletteEngine.getErrorBudgetRemaining(),
      errorBudgetPct: this._rouletteEngine.getErrorBudgetPercentage(),
      mitigationFeedback: null,
    });
  };

  private _handleApplyMitigation = (choiceId: string): void => {
    const res: MitigationResult = this._rouletteEngine.applyMitigation(choiceId);
    this.setState({
      errorBudgetMinutes: res.remainingBudgetMinutes,
      errorBudgetPct: this._rouletteEngine.getErrorBudgetPercentage(),
      mitigationFeedback: res.feedback,
    });
  };

  private _handleResetAll = (): void => {
    this._rouletteEngine.reset();
    const clean = this._faultEngine.clearFaults({ nodes: this._buildDefaultNodes(), edges: this._buildDefaultEdges() });
    this.setState({
      nodes: clean.nodes,
      edges: clean.edges,
      blastRadius: 0,
      faultLogs: [],
      argonData: null,
      cascadeResult: null,
      quantizationResult: null,
      activeIncident: null,
      errorBudgetMinutes: this._rouletteEngine.getErrorBudgetRemaining(),
      errorBudgetPct: this._rouletteEngine.getErrorBudgetPercentage(),
      mitigationFeedback: null,
    });
  };

  private _buildDefaultNodes(): WorkspaceNode[] {
    return [
      { id: 'node_gateway', type: 'INGRESS_GATEWAY', position: { x: 50, y: 150 }, data: { label: 'API Gateway' } },
      { id: 'node_vdb', type: 'VECTOR_DATABASE', position: { x: 300, y: 150 }, data: { label: 'Qdrant HNSW' } },
      { id: 'node_vllm', type: 'VLLM_INFERENCE_ENGINE', position: { x: 550, y: 150 }, data: { label: 'vLLM Serving' } },
    ];
  }

  private _buildDefaultEdges(): WorkspaceEdge[] {
    return [
      { id: 'edge_1', source: 'node_gateway', target: 'node_vdb', protocol: 'GRPC', data: { p99LatencyMs: 1.2, qps: 1500 } },
      { id: 'edge_2', source: 'node_vdb', target: 'node_vllm', protocol: 'GRPC', data: { p99LatencyMs: 4.5, qps: 1200 } },
    ];
  }
}
