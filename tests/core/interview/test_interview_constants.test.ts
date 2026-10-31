import { describe, expect, it } from 'vitest';
import { InterviewConstants } from '@/core/interview/interview_constants';

describe('InterviewConstants', () => {
  it('test_instantiate_createsInstanceWithExpectedDefaults', () => {
    const constants = new InterviewConstants();
    expect(constants).toBeDefined();

    expect(InterviewConstants.STEP_1_CLARIFYING_REQUIREMENTS).toBe('CLARIFYING_REQUIREMENTS');
    expect(InterviewConstants.STEP_2_DATA_INGESTION_FEATURES).toBe('DATA_INGESTION_FEATURES');
    expect(InterviewConstants.STEP_3_MODEL_SELECTION_TRAINING).toBe('MODEL_SELECTION_TRAINING');
    expect(InterviewConstants.STEP_4_MODEL_EVALUATION).toBe('MODEL_EVALUATION');
    expect(InterviewConstants.STEP_5_SERVING_SCALABILITY).toBe('SERVING_SCALABILITY');
    expect(InterviewConstants.STEP_6_MONITORING_RETRAINING).toBe('MONITORING_RETRAINING');

    expect(InterviewConstants.STEPS).toHaveLength(6);
    expect(InterviewConstants.STEP_TITLES).toHaveLength(6);
    expect(InterviewConstants.STEP_DEFAULT_QUESTIONS).toHaveLength(6);

    expect(InterviewConstants.MIN_STEP_INDEX).toBe(0);
    expect(InterviewConstants.MAX_STEP_INDEX).toBe(5);
    expect(InterviewConstants.TOTAL_STEPS).toBe(6);
    expect(InterviewConstants.MIN_PASSING_SCORE).toBe(70);
    expect(InterviewConstants.MAX_SCORE).toBe(100);
    expect(InterviewConstants.MIN_DIMENSION_SCORE).toBe(1);
    expect(InterviewConstants.MAX_DIMENSION_SCORE).toBe(5);
    expect(InterviewConstants.PASSING_DIMENSION_THRESHOLD).toBe(3);

    expect(InterviewConstants.DIMENSION_SCALE_AWARENESS).toBe('scaleAwareness');
    expect(InterviewConstants.DIMENSION_COMPONENT_SELECTION).toBe('componentSelection');
    expect(InterviewConstants.DIMENSION_FAILURE_HANDLING).toBe('failureHandling');
    expect(InterviewConstants.DIMENSION_BUSINESS_ALIGNMENT).toBe('businessAlignment');

    expect(InterviewConstants.VOICE_LANG_DEFAULT).toBe('en-US');
    expect(InterviewConstants.VOICE_UNSUPPORTED_MSG).toContain('not supported');

    expect(InterviewConstants.CASE_STUDY_ECOMMERCE).toBe('ECOMMERCE_RANKING');
    expect(InterviewConstants.CASE_STUDY_FRAUD).toBe('STREAMING_FRAUD');
    expect(InterviewConstants.CASE_STUDY_GENAI).toBe('ENTERPRISE_VECTOR_RAG');

    expect(InterviewConstants.FAILURE_DATA_DRIFT).toBe('DATA_DRIFT');
    expect(InterviewConstants.FAILURE_TRAIN_SERVE_SKEW).toBe('TRAIN_SERVE_SKEW');
    expect(InterviewConstants.FAILURE_HALLUCINATION_SPIKE).toBe('HALLUCINATION_SPIKE');

    expect(InterviewConstants.DEFAULT_TARGET_QPS).toBe(10000);
    expect(InterviewConstants.DEFAULT_P99_LATENCY_MS).toBe(50);
    expect(InterviewConstants.DEFAULT_DRIFT_PSI_THRESHOLD).toBe(0.25);
  });
});

