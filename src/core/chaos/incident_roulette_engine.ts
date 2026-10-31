import { ChaosConstants } from '@/core/chaos/chaos_constants';

export interface RemediationChoice {
  id: string;
  title: string;
  description: string;
  effectiveP99Ms: number;
  resolved: boolean;
  immediateBudgetDrainMinutes?: number | undefined;
}

export interface IncidentEvent {
  id: string;
  title: string;
  description: string;
  slaP99Ms: number;
  currentP99Ms: number;
  nominalQps: number;
  currentQps: number;
  remediationChoices: RemediationChoice[];
}

export interface MitigationResult {
  success: boolean;
  resolved: boolean;
  newP99Ms: number;
  budgetDrainedMinutes: number;
  remainingBudgetMinutes: number;
  systemHalted: boolean;
  feedback: string;
}

export interface RouletteTickResult {
  deltaMinutesDrained: number;
  remainingBudgetMinutes: number;
  remainingBudgetPct: number;
  systemHalted: boolean;
}

/**
 * Real-time production disaster countdown tracking SLA error budget burn and remediation outcomes.
 */
export class IncidentRouletteEngine {
  private static readonly _DEFAULT_TOTAL_BUDGET = ChaosConstants.DEFAULT_ERROR_BUDGET_MINUTES;
  private static readonly _ERR_NO_ACTIVE_INCIDENT = 'No active incident in progress';
  private static readonly _ERR_CHOICE_NOT_FOUND = 'Remediation choice not found: ';
  private static readonly _SECONDS_PER_MINUTE = 60;

  public constructor(
    private readonly _totalBudgetMinutes: number = IncidentRouletteEngine._DEFAULT_TOTAL_BUDGET,
    private _remainingBudgetMinutes: number = IncidentRouletteEngine._DEFAULT_TOTAL_BUDGET,
    private _activeIncident: IncidentEvent | null = null,
    private _isSystemHalted: boolean = false
  ) {}

  /**
   * Triggers a random production disaster incident from the incident catalog.
   */
  public triggerRandomIncident(): IncidentEvent {
    const catalog = this.getAllIncidents();
    const selected = catalog[Math.floor(Math.random() * catalog.length)] ?? catalog[0]!;
    this._activeIncident = { ...selected };
    return this._activeIncident;
  }

  /**
   * Triggers a specific production disaster incident by its identifier.
   */
  public triggerIncidentById(incidentId: string): IncidentEvent {
    const catalog = this.getAllIncidents();
    const found = catalog.find((inc) => inc.id === incidentId);
    if (!found) {
      throw new Error(`Incident not found: ${incidentId}`);
    }
    this._activeIncident = { ...found };
    return this._activeIncident;
  }

  /**
   * Applies candidate mitigation choice, recalculating latency and error budget drain.
   */
  public applyMitigation(choiceId: string): MitigationResult {
    if (!this._activeIncident) {
      throw new Error(IncidentRouletteEngine._ERR_NO_ACTIVE_INCIDENT);
    }
    const choice = this._activeIncident.remediationChoices.find((c) => c.id === choiceId);
    if (!choice) {
      throw new Error(`${IncidentRouletteEngine._ERR_CHOICE_NOT_FOUND}${choiceId}`);
    }

    const drain = choice.immediateBudgetDrainMinutes ?? 0;
    this._remainingBudgetMinutes = Math.max(0, this._remainingBudgetMinutes - drain);
    this._activeIncident.currentP99Ms = choice.effectiveP99Ms;

    if (this._remainingBudgetMinutes <= 0) {
      this._isSystemHalted = true;
    }

    const halted = this._isSystemHalted;
    const resolved = choice.resolved && !halted;
    return this._buildMitigationResult(choice, drain, resolved, halted);
  }

  /**
   * Advances simulation time by delta seconds, draining error budget if SLA is violated.
   */
  public tick(deltaSeconds: number): RouletteTickResult {
    if (!this._activeIncident || this._isSystemHalted) {
      return this._buildTickResult(0);
    }

    const deltaMinutes = deltaSeconds / IncidentRouletteEngine._SECONDS_PER_MINUTE;
    const drain = this._calculateDrainRate(deltaMinutes);
    this._remainingBudgetMinutes = Math.max(0, this._remainingBudgetMinutes - drain);

    if (this._remainingBudgetMinutes <= 0) {
      this._isSystemHalted = true;
    }

    return this._buildTickResult(drain);
  }

  /**
   * Returns remaining error budget in minutes.
   */
  public getErrorBudgetRemaining(): number {
    return Number(this._remainingBudgetMinutes.toFixed(2));
  }

  /**
   * Returns remaining error budget as percentage of total monthly budget.
   */
  public getErrorBudgetPercentage(): number {
    const pct = (this._remainingBudgetMinutes / this._totalBudgetMinutes) * 100;
    return Math.max(0, Math.min(100, Number(pct.toFixed(1))));
  }

  /**
   * Returns the currently active disaster event, or null if nominal.
   */
  public getActiveIncident(): IncidentEvent | null {
    return this._activeIncident;
  }

  /**
   * Returns whether error budget has hit 0 and system is halted.
   */
  public isSystemHalted(): boolean {
    return this._isSystemHalted;
  }

  /**
   * Resets error budget and clears active incident.
   */
  public reset(): void {
    this._remainingBudgetMinutes = this._totalBudgetMinutes;
    this._activeIncident = null;
    this._isSystemHalted = false;
  }

  /**
   * Returns complete catalog of production disaster incidents.
   */
  public getAllIncidents(): IncidentEvent[] {
    return [this._createVectorDbIncident(), this._createVllmOomIncident()];
  }

  private _calculateDrainRate(deltaMinutes: number): number {
    if (!this._activeIncident) return 0;
    const latencyExcess = Math.max(
      0,
      (this._activeIncident.currentP99Ms - this._activeIncident.slaP99Ms) /
        this._activeIncident.slaP99Ms
    );
    const qpsRatio = this._activeIncident.currentQps / Math.max(1, this._activeIncident.nominalQps);
    return latencyExcess * qpsRatio * deltaMinutes;
  }

  private _buildMitigationResult(
    choice: RemediationChoice,
    drain: number,
    resolved: boolean,
    halted: boolean
  ): MitigationResult {
    return {
      success: true,
      resolved,
      newP99Ms: choice.effectiveP99Ms,
      budgetDrainedMinutes: drain,
      remainingBudgetMinutes: this.getErrorBudgetRemaining(),
      systemHalted: halted,
      feedback: choice.description,
    };
  }

  private _buildTickResult(drain: number): RouletteTickResult {
    return {
      deltaMinutesDrained: Number(drain.toFixed(3)),
      remainingBudgetMinutes: this.getErrorBudgetRemaining(),
      remainingBudgetPct: this.getErrorBudgetPercentage(),
      systemHalted: this._isSystemHalted,
    };
  }

  private _createVectorDbIncident(): IncidentEvent {
    return {
      id: 'inc_vdb_v2_latency',
      title: 'Vector DB Provider API v2 Latency Spike',
      description: 'Vendor API v2 cold cache caused p99 latency spike from 25ms to 125ms.',
      slaP99Ms: 30,
      currentP99Ms: 125,
      nominalQps: 10000,
      currentQps: 10000,
      remediationChoices: this._buildVectorDbChoices(),
    };
  }

  private _createVllmOomIncident(): IncidentEvent {
    return {
      id: 'inc_vllm_oom_burst',
      title: 'vLLM Serving KV-Cache OOM Exhaustion',
      description: 'Long-context prompt bursts caused memory saturation and 503 worker crash loops.',
      slaP99Ms: 50,
      currentP99Ms: 200,
      nominalQps: 5000,
      currentQps: 5000,
      remediationChoices: this._buildVllmChoices(),
    };
  }

  private _buildVectorDbChoices(): RemediationChoice[] {
    return [
      this._createCacheChoice(),
      this._createFallbackChoice(),
      this._createRestartChoice(),
    ];
  }

  private _buildVllmChoices(): RemediationChoice[] {
    return [
      this._createTruncationChoice(),
      this._createShedTrafficChoice(),
      this._createReplicasChoice(),
    ];
  }

  private _createCacheChoice(): RemediationChoice {
    return {
      id: 'choice_semantic_cache',
      title: 'Insert In-Memory Semantic Cache',
      description: 'Caches 80% of top queries, dropping p99 latency to 15ms and halting drain.',
      effectiveP99Ms: 15,
      resolved: true,
    };
  }

  private _createFallbackChoice(): RemediationChoice {
    return {
      id: 'choice_heuristic_fallback',
      title: 'Deploy Fallback Heuristic Router',
      description: 'Routes non-critical queries to sparse search, reducing p99 to 40ms.',
      effectiveP99Ms: 40,
      resolved: false,
    };
  }

  private _createRestartChoice(): RemediationChoice {
    return {
      id: 'choice_restart_vdb',
      title: 'Restart Vector DB Cluster',
      description: 'Brief 2-minute outage during reboot, then restores nominal 25ms.',
      effectiveP99Ms: 25,
      resolved: true,
      immediateBudgetDrainMinutes: 2.0,
    };
  }

  private _createTruncationChoice(): RemediationChoice {
    return {
      id: 'choice_chunk_truncation',
      title: 'Enforce Dynamic Context Truncation',
      description: 'Caps documents at 4k tokens, stabilizing KV-cache and reducing p99 to 45ms.',
      effectiveP99Ms: 45,
      resolved: true,
    };
  }

  private _createShedTrafficChoice(): RemediationChoice {
    return {
      id: 'choice_shed_traffic',
      title: 'Activate Load Shedder & Rate Limiting',
      description: 'Drops 50% traffic with 429 Retry-After, preventing OOM crashes, p99 at 48ms.',
      effectiveP99Ms: 48,
      resolved: true,
    };
  }

  private _createReplicasChoice(): RemediationChoice {
    return {
      id: 'choice_double_replicas',
      title: 'Auto-scale GPU Pod Replicas',
      description: 'Cold start spin-up takes 3 minutes before relief arrives.',
      effectiveP99Ms: 40,
      resolved: true,
      immediateBudgetDrainMinutes: 3.0,
    };
  }
}
