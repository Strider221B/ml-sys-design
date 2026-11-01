import { WorkspaceTab } from '@/core/state/guidance_types';

export type WorkspaceTabId = WorkspaceTab;

export type MockActionType =
  | 'LOAD_CANVAS_RAG'
  | 'LOAD_INTERVIEW_YOUTUBE'
  | 'SIMULATE_CHAOS_BURST'
  | 'LOAD_CURRICULUM_FRAUD'
  | 'SIMULATE_TELEMETRY_SPIKE'
  | 'LOAD_FINOPS_LLAMA';

export interface WalkthroughStep {
  stepNumber: number;
  title: string;
  narrative: string;
  highlightMetric?: string;
}

export interface MockActionPayload {
  actionType: MockActionType;
  data?: Record<string, unknown>;
}

export interface ComponentMockWalkthrough {
  tabId: WorkspaceTabId;
  componentTitle: string;
  mentalModel: string;
  scenarioTitle: string;
  steps: WalkthroughStep[];
  primaryActionLabel: string;
  primaryActionPayload: MockActionPayload;
}

export interface UserGuidancePreferences {
  hasSeenAppWelcome: boolean;
  dismissedComponentWelcomes: Record<WorkspaceTabId, boolean>;
}

/**
 * Encapsulates types, default factories, and validators for welcome screens and mock overlays.
 */
export class WelcomeTypes {
  private static readonly _VALID_TABS: readonly WorkspaceTabId[] = [
    'CANVAS',
    'INTERVIEW',
    'CHAOS',
    'CURRICULUM',
    'TELEMETRY',
    'FINOPS',
  ];

  private static readonly _VALID_ACTION_TYPES: readonly MockActionType[] = [
    'LOAD_CANVAS_RAG',
    'LOAD_INTERVIEW_YOUTUBE',
    'SIMULATE_CHAOS_BURST',
    'LOAD_CURRICULUM_FRAUD',
    'SIMULATE_TELEMETRY_SPIKE',
    'LOAD_FINOPS_LLAMA',
  ];

  public constructor() {}

  /**
   * Creates initial default user guidance preferences.
   */
  public createDefaultPreferences(): UserGuidancePreferences {
    return {
      hasSeenAppWelcome: false,
      dismissedComponentWelcomes: {
        CANVAS: false,
        INTERVIEW: false,
        CHAOS: false,
        CURRICULUM: false,
        TELEMETRY: false,
        FINOPS: false,
      },
    };
  }

  /**
   * Returns supported workspace tab IDs.
   */
  public getValidTabs(): readonly WorkspaceTabId[] {
    return WelcomeTypes._VALID_TABS;
  }

  /**
   * Returns supported mock action types.
   */
  public getValidActionTypes(): readonly MockActionType[] {
    return WelcomeTypes._VALID_ACTION_TYPES;
  }

  /**
   * Validates whether candidate string is a supported workspace tab.
   */
  public isValidTab(candidate: string): candidate is WorkspaceTabId {
    return WelcomeTypes._VALID_TABS.includes(candidate as WorkspaceTabId);
  }

  /**
   * Validates whether candidate string is a supported mock action type.
   */
  public isValidActionType(candidate: string): candidate is MockActionType {
    return WelcomeTypes._VALID_ACTION_TYPES.includes(candidate as MockActionType);
  }
}

