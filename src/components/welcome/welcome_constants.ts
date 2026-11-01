import { WorkspaceTabId } from '@/core/state/welcome_types';

export interface ArchitecturalPillarConfig {
  id: string;
  title: string;
  badge: string;
  description: string;
  icon: string;
}

export interface WorkspaceOverviewCard {
  tabId: WorkspaceTabId;
  title: string;
  badge: string;
  description: string;
  icon: string;
}

/**
 * Constants, copies, and configurations for global welcome screens and mock overlays.
 */
export class WelcomeConstants {
  public static readonly HERO_TITLE = '2026 Machine Learning System Design Platform';
  public static readonly HERO_SUBTITLE =
    'Deterministic Interactive Simulation, Real-Time Observability & AI Interview Preparation Engine.';
  public static readonly HERO_BADGE = 'Staff & Principal ML Architecture';

  public static readonly BTN_TAKE_TOUR = 'Take Interactive Tour';
  public static readonly BTN_SKIP_TO_CANVAS = 'Skip to Canvas';
  public static readonly CHECKBOX_DONT_SHOW_AGAIN = "Don't show this welcome screen again";

  public static readonly BTN_SKIP_GUIDE_START_BLANK = 'Skip Guide & Start Blank';
  public static readonly CHECKBOX_DONT_SHOW_COMPONENT = "Don't show this guide again for this screen";
  public static readonly BTN_SHOW_MOCK_EXAMPLE = '(?) Show Mock Example';

  public static readonly ARIA_WELCOME_MODAL = 'Global Application Welcome Dialog';
  public static readonly ARIA_COMPONENT_OVERLAY = 'Component Mock Walkthrough Overlay';

  public static readonly ARCHITECTURAL_PILLARS: readonly ArchitecturalPillarConfig[] = [
    {
      id: 'pillar_simulation',
      title: 'Deterministic Simulation',
      badge: 'M/G/c & Roofline',
      description:
        'Real ML systems modeling (queuing theory, Roofline compute bounds, p99 latencies, TTFT/TPOT), not static whiteboard diagrams.',
      icon: '⚙️',
    },
    {
      id: 'pillar_ssot',
      title: 'Zero Local Persistence & Drive SSOT',
      badge: 'Zero Cookies / LocalStorage',
      description:
        'Strictly zero local storage or cookies. Connect your Google Drive in 1 click to auto-save to your private /ML_System_Design_2026_SSOT/ folder.',
      icon: '🔒',
    },
    {
      id: 'pillar_ai_gateway',
      title: 'Dual-Mode AI Engine',
      badge: 'Gemini Streaming + Air-Gapped',
      description:
        'Direct Gemini Free Tier streaming API with instant failover to air-gapped manual prompt export (copy-paste with zero API keys required).',
      icon: '⚡',
    },
  ];

  public static readonly WORKSPACE_CARDS: readonly WorkspaceOverviewCard[] = [
    {
      tabId: 'CANVAS',
      title: 'Architecture Canvas',
      badge: 'Interactive Topology',
      description: 'Visual blueprinting and real-time deterministic simulation of distributed ML systems.',
      icon: '🏗️',
    },
    {
      tabId: 'INTERVIEW',
      title: 'AI Interview Simulator',
      badge: '6-Step FAANG Defense',
      description: 'Structured mock ML design defense against an AI interviewer using Staff/Principal rubrics.',
      icon: '🎙️',
    },
    {
      tabId: 'CHAOS',
      title: 'Chaos Sandbox',
      badge: 'Adversarial Attacks',
      description: 'Stress-test resilience against Poisson traffic bursts, OOM cascades, and edge failures.',
      icon: '⚡',
    },
    {
      tabId: 'CURRICULUM',
      title: 'Curriculum Explorer',
      badge: '13 Production Blueprints',
      description: 'Explore production case studies from 10M QPS streaming fraud to multi-modal RecSys.',
      icon: '📚',
    },
    {
      tabId: 'TELEMETRY',
      title: 'Real-Time Telemetry',
      badge: '60 FPS Profiler',
      description: 'Observe latency waterfalls, KV-cache fragmentation, and buffer saturation in real time.',
      icon: '📊',
    },
    {
      tabId: 'FINOPS',
      title: 'FinOps Workspace',
      badge: 'Hardware & Cloud ROI',
      description: 'Size GPU clusters (H100 vs A100 vs TPU v5e), model INT4 AWQ savings, and export cost specs.',
      icon: '💰',
    },
  ];

  public constructor() {}

  /**
   * Returns architectural pillars configuration.
   */
  public getPillars(): readonly ArchitecturalPillarConfig[] {
    return WelcomeConstants.ARCHITECTURAL_PILLARS;
  }

  /**
   * Returns 6 operational workspace overview cards.
   */
  public getWorkspaceCards(): readonly WorkspaceOverviewCard[] {
    return WelcomeConstants.WORKSPACE_CARDS;
  }
}

