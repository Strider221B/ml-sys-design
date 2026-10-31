export type WorkspaceTab =
  | 'CANVAS'
  | 'INTERVIEW'
  | 'CHAOS'
  | 'CURRICULUM'
  | 'TELEMETRY'
  | 'FINOPS';

export type SyncVisualState =
  | 'UNAUTHENTICATED'
  | 'SYNCED'
  | 'DIRTY'
  | 'CONFLICT';

export interface GuidanceChecklistStep {
  stepNumber: number;
  title: string;
  instruction: string;
}

export interface QuickActionDescriptor {
  id: string;
  label: string;
  icon: string;
  actionType: string;
  payload?: unknown | undefined;
}

export interface WorkspaceGuidanceItem {
  tab: WorkspaceTab;
  title: string;
  badge: string;
  checklist: GuidanceChecklistStep[];
  quickActions: QuickActionDescriptor[];
}

export interface InspectorNodeData {
  id: string;
  type: string;
  label: string;
  qps: number;
  batchSize: number;
  quantizationBits: number;
  chipId: string;
  timeoutMs: number;
  promptTokens?: number | undefined;
  outputTokens?: number | undefined;
  vramUsageGb?: number | undefined;
  monthlyCostUsd?: number | undefined;
  ttftMs?: number | undefined;
  tpotMs?: number | undefined;
  recallAtK?: number | undefined;
}

/**
 * Data contracts and type validators for workspace guidance, onboarding, and sync controls.
 */
export class GuidanceTypes {
  private static readonly _DEFAULT_TAB: WorkspaceTab = 'CANVAS';
  private static readonly _DEFAULT_SYNC_STATE: SyncVisualState = 'UNAUTHENTICATED';
  private static readonly _VALID_TABS: readonly WorkspaceTab[] = [
    'CANVAS',
    'INTERVIEW',
    'CHAOS',
    'CURRICULUM',
    'TELEMETRY',
    'FINOPS',
  ];
  private static readonly _VALID_SYNC_STATES: readonly SyncVisualState[] = [
    'UNAUTHENTICATED',
    'SYNCED',
    'DIRTY',
    'CONFLICT',
  ];

  public constructor() {}

  /**
   * Returns default fallback workspace tab.
   */
  public get defaultTab(): WorkspaceTab {
    return GuidanceTypes._DEFAULT_TAB;
  }

  /**
   * Returns default fallback sync visual state.
   */
  public get defaultSyncState(): SyncVisualState {
    return GuidanceTypes._DEFAULT_SYNC_STATE;
  }

  /**
   * Validates whether a candidate string is a supported workspace tab.
   */
  public isValidTab(candidate: string): candidate is WorkspaceTab {
    return GuidanceTypes._VALID_TABS.includes(candidate as WorkspaceTab);
  }

  /**
   * Validates whether a candidate string is a supported sync visual state.
   */
  public isValidSyncState(candidate: string): candidate is SyncVisualState {
    return GuidanceTypes._VALID_SYNC_STATES.includes(candidate as SyncVisualState);
  }

  /**
   * Returns all available workspace tabs.
   */
  public getAllTabs(): WorkspaceTab[] {
    return [...GuidanceTypes._VALID_TABS];
  }
}
