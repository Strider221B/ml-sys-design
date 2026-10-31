import React from 'react';
import { AiExchangeModal } from '@/components/ai_exchange/ai_exchange_modal';
import { CaseStudyManager } from '@/core/case_studies/case_study_manager';
import { FailureModeSimulator, FailureScenario, FailureType } from '@/core/case_studies/failure_mode_simulator';
import { InterviewConstants } from '@/core/interview/interview_constants';
import { InterviewRubricEvaluator, RubricEvaluationData } from '@/core/interview/interview_rubric_evaluator';
import { InterviewStateMachine, TransitionResult } from '@/core/interview/interview_state_machine';
import { MultimodalInputProcessor } from '@/core/interview/multimodal_input_processor';
import { VoiceInputHandler, VoiceRecognitionResult } from '@/core/interview/voice_input_handler';
import { WorkspaceEdge, WorkspaceNode } from '@/core/state/workspace_types';
import { LLMExchangeEnvelope } from '@/schemas/exchange_envelope_schema';

export interface InterviewWorkspaceProps {
  initialStepIndex?: number | undefined;
  evaluator?: InterviewRubricEvaluator | undefined;
  voiceHandler?: VoiceInputHandler | undefined;
  inputProcessor?: MultimodalInputProcessor | undefined;
  stateMachine?: InterviewStateMachine | undefined;
  caseStudyManager?: CaseStudyManager | undefined;
  failureSimulator?: FailureModeSimulator | undefined;
  nodes?: WorkspaceNode[] | undefined;
  edges?: WorkspaceEdge[] | undefined;
  onStepChange?: ((stepIndex: number) => void) | undefined;
  onEvaluationComplete?: ((data: RubricEvaluationData) => void) | undefined;
}

export interface InterviewWorkspaceState {
  currentStepIndex: number;
  candidateText: string;
  isListening: boolean;
  isEvaluating: boolean;
  evaluationData: RubricEvaluationData | null;
  statusMessage: string | null;
  activeEnvelope: LLMExchangeEnvelope | null;
  isExchangeModalOpen: boolean;
  activeBlueprintId: string | null;
  activeFailureScenario: FailureScenario | null;
}

/**
 * Main interactive workspace pairing architectural whiteboard with AI interview rubric evaluation.
 */
export class InterviewWorkspace extends React.Component<InterviewWorkspaceProps, InterviewWorkspaceState> {
  private static readonly _EMPTY_STRING = '';
  private static readonly _LABEL_TITLE = 'ML System Design Interview Simulator';
  private static readonly _LABEL_SUBMIT = 'Submit for AI Evaluation';
  private static readonly _LABEL_EVALUATING = 'Evaluating Submission...';
  private static readonly _LABEL_NEXT_STEP = 'Advance to Next Step';
  private static readonly _LABEL_AIR_GAP = 'Air-Gap AI Exchange';
  private static readonly _LABEL_VOICE_START = 'Start Voice Recording';
  private static readonly _LABEL_VOICE_STOP = 'Stop Recording';
  private static readonly _LABEL_INJECT_DRILL = 'Inject Failure Drill';
  private static readonly _LABEL_RESET = 'Reset Session';
  private static readonly _LABEL_PASSED = 'Step Passed! You may advance.';
  private static readonly _LABEL_FAILED = 'Step Did Not Pass. Review feedback and retry.';
  private static readonly _MIN_PASSING_SCORE = InterviewConstants.MIN_PASSING_SCORE;

  public constructor(props: InterviewWorkspaceProps) {
    super(props);
    this._stateMachine = props.stateMachine ?? new InterviewStateMachine(props.initialStepIndex ?? 0);
    this._inputProcessor = props.inputProcessor ?? new MultimodalInputProcessor();
    this._voiceHandler = props.voiceHandler ?? new VoiceInputHandler();
    this._caseStudyManager = props.caseStudyManager ?? new CaseStudyManager();
    this._failureSimulator = props.failureSimulator ?? new FailureModeSimulator();
    this._evaluator = props.evaluator ?? null;

    this.state = {
      currentStepIndex: this._stateMachine.getCurrentStepIndex(),
      candidateText: InterviewWorkspace._EMPTY_STRING,
      isListening: false,
      isEvaluating: false,
      evaluationData: null,
      statusMessage: null,
      activeEnvelope: null,
      isExchangeModalOpen: false,
      activeBlueprintId: InterviewConstants.CASE_STUDY_ECOMMERCE,
      activeFailureScenario: null,
    };
  }

  public override render(): React.ReactNode {
    return (
      <div className="flex flex-col h-full w-full bg-neutral-950 text-neutral-100 p-4 gap-4" data-testid="interview-workspace">
        {this._renderHeader()}
        {this._renderStepper()}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
          {this._renderWhiteboardSummaryPane()}
          {this._renderInterviewerChatPane()}
        </div>
        {this._renderExchangeModal()}
      </div>
    );
  }

  private readonly _stateMachine: InterviewStateMachine;
  private readonly _inputProcessor: MultimodalInputProcessor;
  private readonly _voiceHandler: VoiceInputHandler;
  private readonly _caseStudyManager: CaseStudyManager;
  private readonly _failureSimulator: FailureModeSimulator;
  private readonly _evaluator: InterviewRubricEvaluator | null;

  private _renderHeader(): React.ReactNode {
    return (
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{InterviewWorkspace._LABEL_TITLE}</h1>
          <p className="text-xs text-neutral-400">{this._stateMachine.getCurrentTitle()}</p>
        </div>
        <div className="flex items-center gap-2">
          {this._renderHeaderControls()}
        </div>
      </div>
    );
  }

  private _renderHeaderControls(): React.ReactNode {
    return (
      <>
        <button
          onClick={this._handleInjectFailureDrill}
          className="rounded bg-amber-700/60 hover:bg-amber-600 px-3 py-1.5 text-xs font-semibold"
        >
          {InterviewWorkspace._LABEL_INJECT_DRILL}
        </button>
        <button
          onClick={this._handleReset}
          className="rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-xs font-semibold"
        >
          {InterviewWorkspace._LABEL_RESET}
        </button>
      </>
    );
  }

  private _renderStepper(): React.ReactNode {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-1" data-testid="interview-stepper">
        {InterviewConstants.STEPS.map((stepKey, idx) => this._renderStepBadge(stepKey, idx))}
      </div>
    );
  }

  private _renderStepBadge(stepKey: string, idx: number): React.ReactNode {
    const isActive = idx === this.state.currentStepIndex;
    const isCompleted = idx < this.state.currentStepIndex;
    const baseClass = 'px-3 py-1 rounded text-xs font-mono transition-colors';
    const stateClass = isActive
      ? 'bg-indigo-600 text-white font-bold ring-1 ring-indigo-400'
      : isCompleted
      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
      : 'bg-neutral-900 text-neutral-500 border border-neutral-800';

    return (
      <div key={stepKey} className={`${baseClass} ${stateClass}`}>
        {idx + 1}. {InterviewConstants.STEP_TITLES[idx]}
      </div>
    );
  }

  private _renderWhiteboardSummaryPane(): React.ReactNode {
    const nodes = this.props.nodes ?? [];
    const edges = this.props.edges ?? [];
    const summary = this._inputProcessor.formatTopologySummary(nodes, edges);

    return (
      <div className="flex flex-col rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 overflow-y-auto">
        <h2 className="text-sm font-bold text-neutral-300 mb-2">Active Whiteboard Topology</h2>
        <pre className="text-xs font-mono text-neutral-400 whitespace-pre-wrap flex-1">{summary}</pre>
        {this._renderFailureBanner()}
      </div>
    );
  }

  private _renderFailureBanner(): React.ReactNode {
    if (!this.state.activeFailureScenario) return null;
    const scenario = this.state.activeFailureScenario;
    return (
      <div className="mt-3 rounded border border-rose-800 bg-rose-950/50 p-3 text-xs" data-testid="failure-banner">
        <div className="font-bold text-rose-300">Failure Injected: {scenario.title}</div>
        <p className="text-rose-200 mt-1">{scenario.description}</p>
        <div className="text-neutral-400 mt-2">PSI: {scenario.impact.psiMetricValue} | Latency: +{scenario.impact.latencyDeltaMs}ms</div>
      </div>
    );
  }

  private _renderInterviewerChatPane(): React.ReactNode {
    return (
      <div className="flex flex-col rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 overflow-y-auto gap-4">
        <div className="rounded border border-indigo-900/60 bg-indigo-950/30 p-3">
          <div className="text-xs font-bold text-indigo-400">Interviewer Prompt</div>
          <p className="text-sm mt-1 text-neutral-200">{this._stateMachine.getCurrentQuestion()}</p>
        </div>
        {this._renderCandidateInputArea()}
        {this._renderFeedbackScorecard()}
        {this._renderActionButtons()}
      </div>
    );
  }

  private _renderCandidateInputArea(): React.ReactNode {
    return (
      <div className="flex flex-col gap-2">
        {this._renderInputAreaHeader()}
        <textarea
          id="candidate-notes"
          rows={4}
          value={this.state.candidateText}
          onChange={this._handleCandidateTextChange}
          placeholder="Type or speak your architectural justifications, scale calculations, and trade-offs..."
          className="w-full rounded border border-neutral-700 bg-neutral-950 p-3 text-xs font-mono text-neutral-200 focus:outline-none focus:border-indigo-500"
        />
      </div>
    );
  }

  private _renderInputAreaHeader(): React.ReactNode {
    const voiceLabel = this.state.isListening
      ? InterviewWorkspace._LABEL_VOICE_STOP
      : InterviewWorkspace._LABEL_VOICE_START;
    const btnClass = this.state.isListening ? 'bg-rose-600' : 'bg-neutral-800 hover:bg-neutral-700';

    return (
      <div className="flex justify-between items-center">
        <label htmlFor="candidate-notes" className="text-xs font-semibold text-neutral-400">Candidate Explanation & Notes</label>
        <button onClick={this._handleToggleVoice} className={`rounded px-2.5 py-1 text-xs font-semibold ${btnClass}`}>
          {voiceLabel}
        </button>
      </div>
    );
  }

  private _renderFeedbackScorecard(): React.ReactNode {
    if (!this.state.evaluationData) return null;
    const data = this.state.evaluationData;
    const isPassing = data.stepScore >= InterviewWorkspace._MIN_PASSING_SCORE;

    return (
      <div className="rounded border border-neutral-800 bg-neutral-950/80 p-3 text-xs gap-2 flex flex-col" data-testid="rubric-scorecard">
        <div className="flex justify-between items-center">
          <span className="font-bold text-neutral-200">Rubric Score: {data.stepScore}/100</span>
          <span className={`font-semibold ${isPassing ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isPassing ? InterviewWorkspace._LABEL_PASSED : InterviewWorkspace._LABEL_FAILED}
          </span>
        </div>
        <p className="text-neutral-300 italic">{data.interviewerSpeech}</p>
        {this._renderDimensionScores(data)}
      </div>
    );
  }

  private _renderDimensionScores(data: RubricEvaluationData): React.ReactNode {
    return (
      <div className="grid grid-cols-2 gap-2 text-neutral-400 pt-2 border-t border-neutral-800">
        <div>Scale Awareness: {data.dimensionScores.scaleAwareness}/5</div>
        <div>Component Selection: {data.dimensionScores.componentSelection}/5</div>
        <div>Failure Handling: {data.dimensionScores.failureHandling}/5</div>
        <div>Business Alignment: {data.dimensionScores.businessAlignment}/5</div>
      </div>
    );
  }

  private _renderActionButtons(): React.ReactNode {
    const isPassing = (this.state.evaluationData?.stepScore ?? 0) >= InterviewWorkspace._MIN_PASSING_SCORE;
    return (
      <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
        <button
          onClick={this._handleSubmitEvaluation}
          disabled={this.state.isEvaluating}
          className="rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-xs font-bold"
        >
          {this.state.isEvaluating ? InterviewWorkspace._LABEL_EVALUATING : InterviewWorkspace._LABEL_SUBMIT}
        </button>
        {this._renderSecondaryActions(isPassing)}
      </div>
    );
  }

  private _renderSecondaryActions(isPassing: boolean): React.ReactNode {
    return (
      <div className="flex gap-2">
        {this.state.activeEnvelope && (
          <button
            onClick={() => this.setState({ isExchangeModalOpen: true })}
            className="rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2 text-xs font-semibold"
          >
            {InterviewWorkspace._LABEL_AIR_GAP}
          </button>
        )}
        {isPassing && (
          <button
            onClick={this._handleAdvanceStep}
            className="rounded bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold"
          >
            {InterviewWorkspace._LABEL_NEXT_STEP}
          </button>
        )}
      </div>
    );
  }

  private _renderExchangeModal(): React.ReactNode {
    return (
      <AiExchangeModal
        isOpen={this.state.isExchangeModalOpen}
        envelope={this.state.activeEnvelope}
        onClose={() => this.setState({ isExchangeModalOpen: false })}
        onImportSuccess={this._handleImportSuccess}
      />
    );
  }

  private _handleCandidateTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    this.setState({ candidateText: e.target.value });
  };

  private _handleToggleVoice = (): void => {
    if (this.state.isListening) {
      this._voiceHandler.stopListening();
      this.setState({ isListening: false });
    } else {
      const started = this._voiceHandler.startListening((res: VoiceRecognitionResult) => {
        this.setState({ candidateText: res.transcript });
      });
      this.setState({ isListening: started });
    }
  };

  private _handleSubmitEvaluation = async (): Promise<void> => {
    if (!this._evaluator) return;
    this.setState({ isEvaluating: true, statusMessage: null });
    const payload = this._inputProcessor.buildEvaluationPayload(
      this.state.currentStepIndex,
      this.state.candidateText,
      this.props.nodes ?? [],
      this.props.edges ?? []
    );

    const result = await this._evaluator.evaluateStep(payload);
    this._processEvaluationResult(result.data, result.envelope, result.error);
  };

  private _processEvaluationResult(
    data: RubricEvaluationData | null,
    envelope?: LLMExchangeEnvelope,
    error?: string
  ): void {
    if (data) {
      this.setState({
        isEvaluating: false,
        evaluationData: data,
        activeEnvelope: envelope ?? null,
      });
      this.props.onEvaluationComplete?.(data);
    } else {
      this.setState({
        isEvaluating: false,
        activeEnvelope: envelope ?? null,
        isExchangeModalOpen: Boolean(envelope),
        statusMessage: error ?? 'Evaluation failed',
      });
    }
  }

  private _handleImportSuccess = (imported: unknown): void => {
    const data = imported as RubricEvaluationData;
    this.setState({ evaluationData: data });
    this.props.onEvaluationComplete?.(data);
  };

  private _handleAdvanceStep = (): void => {
    const score = this.state.evaluationData?.stepScore ?? 0;
    const res: TransitionResult = this._stateMachine.transitionToNext({
      stepIndex: this.state.currentStepIndex,
      score,
    });
    if (res.success) {
      this.setState({
        currentStepIndex: res.currentStepIndex,
        candidateText: InterviewWorkspace._EMPTY_STRING,
        evaluationData: null,
      });
      this.props.onStepChange?.(res.currentStepIndex);
    }
  };

  private _handleInjectFailureDrill = (): void => {
    const scenario = this._failureSimulator.injectFailure(
      this.state.activeBlueprintId ?? InterviewConstants.CASE_STUDY_ECOMMERCE,
      InterviewConstants.FAILURE_DATA_DRIFT as FailureType
    );
    this.setState({ activeFailureScenario: scenario });
  };

  private _handleReset = (): void => {
    this._stateMachine.resetSession();
    this.setState({
      currentStepIndex: 0,
      candidateText: InterviewWorkspace._EMPTY_STRING,
      evaluationData: null,
      activeFailureScenario: null,
      statusMessage: null,
    });
    this.props.onStepChange?.(0);
  };
}
