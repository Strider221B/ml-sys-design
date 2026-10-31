import React from 'react';
import { CurriculumLesson, CurriculumManager, CurriculumModule } from '@/core/curriculum/curriculum_manager';
import { CurriculumTracker } from '@/core/curriculum/curriculum_tracker';
import { ScenarioConstants } from '@/core/scenarios/scenario_constants';
import { ScenarioLoader } from '@/core/scenarios/scenario_loader';
import { ScenarioPluginSchema } from '@/schemas/scenario_plugin_schema';

export interface CurriculumViewProps {
  curriculumManager?: CurriculumManager | undefined;
  curriculumTracker?: CurriculumTracker | undefined;
  scenarioLoader?: ScenarioLoader | undefined;
  onLaunchScenario?: ((scenarioId: string, scenario?: unknown) => void) | undefined;
  onSelectModule?: ((moduleId: string) => void) | undefined;
}

export interface CurriculumViewState {
  activeModuleId: string;
  selectedLessonId: string | null;
  isLoadingScenario: boolean;
  launchError: string | null;
  lastLaunchedId: string | null;
}

/**
 * Interactive curriculum matrix navigator, lesson detail explorer, and scenario launchpad.
 */
export class CurriculumView extends React.Component<CurriculumViewProps, CurriculumViewState> {
  private static readonly _DEFAULT_MODULE = ScenarioConstants.MODULE_1_MLOPS;
  private static readonly _TITLE = '2026 ML System Design Curriculum';
  private static readonly _SUBTITLE = 'Master high-throughput production ML systems and GenAI serving economics.';
  private static readonly _BTN_LAUNCHING = 'Loading Blueprint...';
  private static readonly _BTN_LAUNCH = 'Launch Scenario Drill';
  private static readonly _LBL_COMPLETED = 'COMPLETED';
  private static readonly _LBL_LOCKED = 'LOCKED';
  private static readonly _LBL_UNLOCKED = 'UNLOCKED';
  private static readonly _LBL_PASSING_RUBRIC = 'Pass Rubric: ≥';

  public constructor(props: CurriculumViewProps) {
    super(props);
    this._manager = props.curriculumManager ?? new CurriculumManager();
    this._loader = props.scenarioLoader ?? new ScenarioLoader(new ScenarioPluginSchema());
    this._tracker = props.curriculumTracker ?? null;
    this.state = {
      activeModuleId: CurriculumView._DEFAULT_MODULE,
      selectedLessonId: null,
      isLoadingScenario: false,
      launchError: null,
      lastLaunchedId: null,
    };
  }

  /**
   * Main render dispatch for the curriculum navigation dashboard.
   */
  public override render(): React.ReactNode {
    const modules = this._manager.getAllModules();
    const activeModule = this._manager.getModule(this.state.activeModuleId) ?? modules[0];
    return (
      <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-6 space-y-6 overflow-y-auto" data-testid="curriculum-view">
        {this._renderHeader()}
        {this._renderProgressOverview()}
        {this._renderModuleTabs(modules)}
        {activeModule && this._renderActiveModule(activeModule)}
        {this._renderTransformationsSection()}
      </div>
    );
  }

  private readonly _manager: CurriculumManager;
  private readonly _loader: ScenarioLoader;
  private readonly _tracker: CurriculumTracker | null;

  private _renderHeader(): React.ReactNode {
    return (
      <header className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">{CurriculumView._TITLE}</h1>
        <p className="text-slate-400 mt-1 text-sm">{CurriculumView._SUBTITLE}</p>
        {this.state.launchError && (
          <div className="mt-3 p-3 bg-red-950 border border-red-700 text-red-200 text-sm rounded">
            {this.state.launchError}
          </div>
        )}
      </header>
    );
  }

  private _renderProgressOverview(): React.ReactNode {
    const completedScenarios = this._tracker?.getCompletedScenarios() ?? [];
    const overallPct = this._manager.calculateProgress(completedScenarios);
    const badges = this._tracker?.getEarnedBadges() ?? [];
    return (
      <section className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {this._renderProgressBar(overallPct)}
        {this._renderBadges(badges)}
      </section>
    );
  }

  private _renderProgressBar(overallPct: number): React.ReactNode {
    return (
      <div className="space-y-1 flex-1">
        <div className="flex justify-between text-xs text-slate-400 font-medium">
          <span>Overall Curriculum Mastery</span>
          <span data-testid="overall-progress-pct">{overallPct}%</span>
        </div>
        <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${overallPct}%` }} />
        </div>
      </div>
    );
  }

  private _renderBadges(badges: string[]): React.ReactNode {
    return (
      <div className="flex items-center gap-2 flex-wrap" data-testid="badges-row">
        <span className="text-xs text-slate-400 font-medium">Badges:</span>
        {badges.length === 0 ? (
          <span className="text-xs text-slate-500 italic">None yet</span>
        ) : (
          badges.map((b) => (
            <span key={b} className="px-2 py-0.5 text-xs bg-indigo-900/70 text-indigo-200 border border-indigo-500/40 rounded-full font-mono">
              {b}
            </span>
          ))
        )}
      </div>
    );
  }

  private _renderModuleTabs(modules: CurriculumModule[]): React.ReactNode {
    return (
      <nav className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto" aria-label="Curriculum Modules">
        {modules.map((m) => this._renderSingleModuleTab(m))}
      </nav>
    );
  }

  private _renderSingleModuleTab(m: CurriculumModule): React.ReactNode {
    const isActive = m.moduleId === this.state.activeModuleId;
    const isUnlocked = this._tracker ? this._tracker.isModuleUnlocked(m.moduleId) : true;
    const tabClass = isActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700';
    return (
      <button
        key={m.moduleId}
        type="button"
        onClick={() => this._handleSelectModule(m.moduleId)}
        className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${tabClass} ${!isUnlocked ? 'opacity-60' : ''}`}
        data-testid={`module-tab-${m.moduleId}`}
      >
        {m.title}
        {!isUnlocked && <span className="ml-2 text-xs text-amber-400">({CurriculumView._LBL_LOCKED})</span>}
      </button>
    );
  }

  private _renderActiveModule(mod: CurriculumModule): React.ReactNode {
    const isUnlocked = this._tracker ? this._tracker.isModuleUnlocked(mod.moduleId) : true;
    const badgeClass = isUnlocked ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-amber-950 text-amber-300 border border-amber-700';
    return (
      <div className="space-y-4">
        <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/50 flex justify-between items-start gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{mod.title}</h2>
            <p className="text-slate-300 text-sm mt-1">{mod.summary}</p>
          </div>
          <span className={`px-2.5 py-1 text-xs rounded font-semibold ${badgeClass}`}>
            {isUnlocked ? CurriculumView._LBL_UNLOCKED : CurriculumView._LBL_LOCKED}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {mod.lessons.map((lesson) => this._renderLessonCard(lesson, isUnlocked))}
        </div>
      </div>
    );
  }

  private _renderLessonCard(lesson: CurriculumLesson, isModuleUnlocked: boolean): React.ReactNode {
    const score = this._tracker?.getScoreForScenario(lesson.recommendedScenarioId);
    const isCompleted = score !== undefined && score >= ScenarioConstants.MIN_PASSING_RUBRIC_SCORE;
    return (
      <article key={lesson.lessonId} className="bg-slate-800/80 p-5 rounded-lg border border-slate-700 flex flex-col md:flex-row justify-between gap-4" data-testid={`lesson-card-${lesson.lessonId}`}>
        <div className="space-y-2 flex-1">
          {this._renderLessonHeader(lesson, isCompleted, score)}
          <p className="text-slate-300 text-sm">{lesson.description}</p>
          {this._renderLessonOutcomes(lesson.keyOutcomes)}
        </div>
        <div className="flex flex-col justify-center items-end gap-2 min-w-[200px]">
          <span className="text-xs text-slate-400">
            {CurriculumView._LBL_PASSING_RUBRIC} {ScenarioConstants.MIN_PASSING_RUBRIC_SCORE}
          </span>
          {this._renderLaunchButton(lesson, isModuleUnlocked)}
        </div>
      </article>
    );
  }

  private _renderLessonHeader(lesson: CurriculumLesson, isCompleted: boolean, score?: number): React.ReactNode {
    return (
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-white text-base">{lesson.title}</h3>
        {isCompleted && (
          <span className="px-2 py-0.5 text-xs bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 rounded">
            {CurriculumView._LBL_COMPLETED} ({score}/100)
          </span>
        )}
      </div>
    );
  }

  private _renderLessonOutcomes(outcomes: string[]): React.ReactNode {
    return (
      <ul className="flex flex-wrap gap-2 pt-1">
        {outcomes.map((o) => (
          <li key={o} className="text-xs bg-slate-700/60 text-slate-300 px-2 py-1 rounded">
            • {o}
          </li>
        ))}
      </ul>
    );
  }

  private _renderLaunchButton(lesson: CurriculumLesson, isModuleUnlocked: boolean): React.ReactNode {
    const isBusy = this.state.isLoadingScenario && this.state.lastLaunchedId === lesson.recommendedScenarioId;
    return (
      <button
        type="button"
        disabled={!isModuleUnlocked || isBusy}
        onClick={() => void this._handleLaunchScenario(lesson.recommendedScenarioId)}
        className="w-full md:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
        data-testid={`btn-launch-${lesson.lessonId}`}
      >
        {isBusy ? CurriculumView._BTN_LAUNCHING : CurriculumView._BTN_LAUNCH}
      </button>
    );
  }

  private _renderTransformationsSection(): React.ReactNode {
    const transformations = this._manager.getTransformations();
    return (
      <section className="mt-8 border-t border-slate-800 pt-6">
        <h2 className="text-lg font-semibold text-white mb-3">2026 Core Skill Transformations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {transformations.map((t) => (
            <div key={t.legacySkill} className="bg-slate-800/40 p-3 rounded border border-slate-700/40 text-xs space-y-1">
              <div className="text-slate-400 line-through">Legacy: {t.legacySkill}</div>
              <div className="text-emerald-400 font-medium">2026 Shift: {t.modernSkill2026}</div>
              <div className="text-slate-300 mt-1">{t.industryImpact}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  private _handleSelectModule(moduleId: string): void {
    this.setState({ activeModuleId: moduleId });
    if (this.props.onSelectModule) {
      this.props.onSelectModule(moduleId);
    }
  }

  private async _handleLaunchScenario(scenarioId: string): Promise<void> {
    this.setState({ isLoadingScenario: true, launchError: null, lastLaunchedId: scenarioId });
    try {
      const scenario = await this._loader.loadBuiltinScenario(scenarioId);
      if (this.props.onLaunchScenario) {
        this.props.onLaunchScenario(scenarioId, scenario);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown load error';
      this.setState({ launchError: msg });
    } finally {
      this.setState({ isLoadingScenario: false });
    }
  }
}
