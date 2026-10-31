// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { InterviewWorkspace } from '@/components/interview/interview_workspace';
import { InterviewRubricEvaluator, RubricEvaluationData } from '@/core/interview/interview_rubric_evaluator';
import { InterviewStateMachine } from '@/core/interview/interview_state_machine';
import { VoiceInputHandler } from '@/core/interview/voice_input_handler';
import { LLMExchangeEnvelope } from '@/schemas/exchange_envelope_schema';

describe('InterviewWorkspace', () => {
  const samplePassingEvaluation: RubricEvaluationData = {
    stepNumber: 1,
    stepCompleted: true,
    stepScore: 88,
    interviewerSpeech: 'Excellent scale estimates and latency SLA targets.',
    feedback: {
      strengths: ['Accurate QPS calculation'],
      missingConsiderations: [],
      bottlenecksIdentified: [],
    },
    dimensionScores: {
      scaleAwareness: 4,
      componentSelection: 4,
      failureHandling: 4,
      businessAlignment: 4,
    },
    suggestedNextQuestions: ['Discuss data ingestion pipeline.'],
  };

  const sampleEnvelope: LLMExchangeEnvelope = {
    envelopeVersion: '2026.1.0',
    envelopeId: 'env_interview_1',
    moduleId: 'AI_INTERVIEW_SIMULATOR',
    useCaseId: 'interview_step_1',
    timestamp: new Date().toISOString(),
    promptPayload: {
      systemInstruction: 'sys',
      userPrompt: 'user',
      serializedContext: {},
      copyPasteReadyMarkdown: 'markdown',
    },
    expectedResponseSchema: {},
    llmResponse: null,
    metadata: {
      source: 'DIRECT_GEMINI_API',
      modelIdentifier: 'gemini-2.5-flash',
      executionLatencyMs: 120,
      validationErrors: [],
    },
  };

  beforeEach(() => {
    vi.stubGlobal('SpeechRecognition', vi.fn().mockImplementation(() => ({
      continuous: true,
      interimResults: true,
      lang: 'en-US',
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      onresult: null,
      onerror: null,
      onend: null,
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('test_render_displaysHeaderStepperAndPanes', () => {
    render(<InterviewWorkspace />);

    expect(screen.getByText('ML System Design Interview Simulator')).toBeDefined();
    expect(screen.getByTestId('interview-stepper')).toBeDefined();
    expect(screen.getByText('Active Whiteboard Topology')).toBeDefined();
    expect(screen.getByText('Interviewer Prompt')).toBeDefined();
    expect(screen.getByText('Submit for AI Evaluation')).toBeDefined();
  });

  it('test_candidateTextInput_updatesTextAreaValue', () => {
    render(<InterviewWorkspace />);

    const textarea = screen.getByPlaceholderText(/Type or speak your architectural justifications/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Targeting 50k QPS with Redis clustering.' } });

    expect(textarea.value).toBe('Targeting 50k QPS with Redis clustering.');
  });

  it('test_voiceRecordingToggle_togglesListeningState', () => {
    render(<InterviewWorkspace />);

    const voiceBtn = screen.getByText('Start Voice Recording');
    fireEvent.click(voiceBtn);

    expect(screen.getByText('Stop Recording')).toBeDefined();

    fireEvent.click(screen.getByText('Stop Recording'));
    expect(screen.getByText('Start Voice Recording')).toBeDefined();
  });

  it('test_submitEvaluation_whenPassing_displaysScorecardAndAllowsAdvancing', async () => {
    const mockEvaluator = {
      evaluateStep: vi.fn().mockResolvedValue({
        status: 'SUCCESS',
        data: samplePassingEvaluation,
        envelope: sampleEnvelope,
      }),
      calculatePassing: vi.fn().mockReturnValue(true),
    } as unknown as InterviewRubricEvaluator;

    const onStepChange = vi.fn();
    const onEvaluationComplete = vi.fn();

    render(
      <InterviewWorkspace
        evaluator={mockEvaluator}
        onStepChange={onStepChange}
        onEvaluationComplete={onEvaluationComplete}
      />
    );

    const submitBtn = screen.getByText('Submit for AI Evaluation');
    await fireEvent.click(submitBtn);

    expect(await screen.findByTestId('rubric-scorecard')).toBeDefined();
    expect(screen.getByText('Rubric Score: 88/100')).toBeDefined();
    expect(screen.getByText('Step Passed! You may advance.')).toBeDefined();
    expect(onEvaluationComplete).toHaveBeenCalledWith(samplePassingEvaluation);

    const advanceBtn = screen.getByText('Advance to Next Step');
    fireEvent.click(advanceBtn);

    expect(onStepChange).toHaveBeenCalledWith(1);
  });

  it('test_submitEvaluation_whenFallbackRequired_opensExchangeModal', async () => {
    const mockEvaluator = {
      evaluateStep: vi.fn().mockResolvedValue({
        status: 'MANUAL_FALLBACK_REQUIRED',
        data: null,
        envelope: sampleEnvelope,
        error: 'Rate limit 429',
      }),
      calculatePassing: vi.fn().mockReturnValue(false),
    } as unknown as InterviewRubricEvaluator;

    render(<InterviewWorkspace evaluator={mockEvaluator} />);

    const submitBtn = screen.getByText('Submit for AI Evaluation');
    await fireEvent.click(submitBtn);

    expect(await screen.findByText('Air-Gap AI Exchange')).toBeDefined();
  });

  it('test_injectFailureDrill_displaysFailureScenarioBanner', () => {
    render(<InterviewWorkspace />);

    const drillBtn = screen.getByText('Inject Failure Drill');
    fireEvent.click(drillBtn);

    const banner = screen.getByTestId('failure-banner');
    expect(banner).toBeDefined();
    expect(screen.getByText(/Failure Injected:/)).toBeDefined();
  });

  it('test_voiceRecognitionCallback_updatesCandidateText', () => {
    let capturedCallback: ((res: { transcript: string; isFinal: boolean; confidence: number }) => void) | null = null;
    const mockVoiceHandler = {
      startListening: vi.fn().mockImplementation((cb) => {
        capturedCallback = cb;
        return true;
      }),
      stopListening: vi.fn(),
      isSupported: vi.fn().mockReturnValue(true),
      getStatus: vi.fn().mockReturnValue('IDLE'),
      getTranscript: vi.fn().mockReturnValue(''),
      resetTranscript: vi.fn(),
      setTranscript: vi.fn(),
      setLanguage: vi.fn(),
    } as unknown as VoiceInputHandler;

    render(<InterviewWorkspace voiceHandler={mockVoiceHandler} />);

    fireEvent.click(screen.getByText('Start Voice Recording'));
    expect(capturedCallback).not.toBeNull();

    act(() => {
      if (capturedCallback) {
        (capturedCallback as (res: { transcript: string; isFinal: boolean; confidence: number }) => void)({
          transcript: 'Streaming features with Kafka',
          isFinal: true,
          confidence: 0.9,
        });
      }
    });

    const textarea = screen.getByPlaceholderText(/Type or speak your architectural justifications/) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Streaming features with Kafka');
  });

  it('test_submitEvaluation_whenNoEvaluatorProvided_doesNotThrow', async () => {
    render(<InterviewWorkspace evaluator={undefined} />);
    const submitBtn = screen.getByText('Submit for AI Evaluation');
    await fireEvent.click(submitBtn);
    expect(screen.queryByTestId('rubric-scorecard')).toBeNull();
  });

  it('test_exchangeModalCloseAndImport_updatesStateAndFiresCallback', async () => {
    const mockEvaluator = {
      evaluateStep: vi.fn().mockResolvedValue({
        status: 'MANUAL_FALLBACK_REQUIRED',
        data: null,
        envelope: sampleEnvelope,
        error: 'Rate limit 429',
      }),
      calculatePassing: vi.fn().mockReturnValue(false),
    } as unknown as InterviewRubricEvaluator;

    const onEvaluationComplete = vi.fn();
    render(
      <InterviewWorkspace
        evaluator={mockEvaluator}
        onEvaluationComplete={onEvaluationComplete}
      />
    );

    await fireEvent.click(screen.getByText('Submit for AI Evaluation'));
    const airGapBtn = await screen.findByText('Air-Gap AI Exchange');
    fireEvent.click(airGapBtn);

    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);

    fireEvent.click(airGapBtn);
    const textarea = screen.getByPlaceholderText(/Paste raw LLM response/);
    fireEvent.change(textarea, {
      target: { value: JSON.stringify(samplePassingEvaluation) },
    });
    fireEvent.click(screen.getByText('Import & Validate Response'));

    expect(onEvaluationComplete).toHaveBeenCalledWith(samplePassingEvaluation);
    expect(await screen.findByTestId('rubric-scorecard')).toBeDefined();
  });

  it('test_submitEvaluation_whenErrorWithoutEnvelope_setsFailureStatus', async () => {
    const mockEvaluator = {
      evaluateStep: vi.fn().mockResolvedValue({
        status: 'FAILED',
        data: null,
      }),
      calculatePassing: vi.fn().mockReturnValue(false),
    } as unknown as InterviewRubricEvaluator;

    render(<InterviewWorkspace evaluator={mockEvaluator} />);
    await fireEvent.click(screen.getByText('Submit for AI Evaluation'));

    expect(screen.queryByTestId('rubric-scorecard')).toBeNull();
    expect(screen.queryByText('Air-Gap AI Exchange')).toBeNull();
  });

  it('test_advanceStep_whenTransitionFails_doesNotAdvanceState', () => {
    const mockStateMachine = {
      getCurrentStepIndex: vi.fn().mockReturnValue(5),
      getCurrentStepName: vi.fn().mockReturnValue('MONITORING_RETRAINING'),
      getCurrentTitle: vi.fn().mockReturnValue('Step 6'),
      getCurrentQuestion: vi.fn().mockReturnValue('Final question'),
      transitionToNext: vi.fn().mockReturnValue({ success: false, currentStepIndex: 5 }),
      resetSession: vi.fn(),
    } as unknown as InterviewStateMachine;

    const mockEvaluator = {
      evaluateStep: vi.fn().mockResolvedValue({
        status: 'SUCCESS',
        data: samplePassingEvaluation,
        envelope: sampleEnvelope,
      }),
      calculatePassing: vi.fn().mockReturnValue(true),
    } as unknown as InterviewRubricEvaluator;

    const onStepChange = vi.fn();
    render(
      <InterviewWorkspace
        stateMachine={mockStateMachine}
        evaluator={mockEvaluator}
        onStepChange={onStepChange}
      />
    );

    fireEvent.click(screen.getByText('Submit for AI Evaluation'));
  });

  it('test_resetSession_resetsWorkspaceToStepZero', () => {
    const onStepChange = vi.fn();
    render(<InterviewWorkspace initialStepIndex={2} onStepChange={onStepChange} />);

    const resetBtn = screen.getByText('Reset Session');
    fireEvent.click(resetBtn);

    expect(onStepChange).toHaveBeenCalledWith(0);
  });
});
