/**
 * Canonical constants, step identifiers, default questions, and scoring weights for the AI Interview Simulator.
 */
export class InterviewConstants {
  public static readonly STEP_1_CLARIFYING_REQUIREMENTS = 'CLARIFYING_REQUIREMENTS';
  public static readonly STEP_2_DATA_INGESTION_FEATURES = 'DATA_INGESTION_FEATURES';
  public static readonly STEP_3_MODEL_SELECTION_TRAINING = 'MODEL_SELECTION_TRAINING';
  public static readonly STEP_4_MODEL_EVALUATION = 'MODEL_EVALUATION';
  public static readonly STEP_5_SERVING_SCALABILITY = 'SERVING_SCALABILITY';
  public static readonly STEP_6_MONITORING_RETRAINING = 'MONITORING_RETRAINING';

  public static readonly STEPS = [
    InterviewConstants.STEP_1_CLARIFYING_REQUIREMENTS,
    InterviewConstants.STEP_2_DATA_INGESTION_FEATURES,
    InterviewConstants.STEP_3_MODEL_SELECTION_TRAINING,
    InterviewConstants.STEP_4_MODEL_EVALUATION,
    InterviewConstants.STEP_5_SERVING_SCALABILITY,
    InterviewConstants.STEP_6_MONITORING_RETRAINING,
  ] as const;

  public static readonly STEP_TITLES: readonly string[] = [
    'Clarifying Requirements & Scale Estimation',
    'Data Ingestion & Feature Engineering',
    'Model Selection & Architecture Funnel',
    'Model Evaluation (Offline vs Online A/B)',
    'Serving & Scalability',
    'Monitoring, Drift & Retraining Loops',
  ];

  public static readonly STEP_DEFAULT_QUESTIONS: readonly string[] = [
    "Welcome to your ML System Design Interview. Let's design YouTube's real-time video recommendation system. How would you begin clarifying the requirements and scale (DAU, QPS, Latency SLA)?",
    'How would you design the data ingestion pipeline and feature store? Differentiate real-time clickstream events from historical data, and ensure point-in-time correctness.',
    'Describe the modeling architecture. How do you structure the two-stage funnel (candidate retrieval vs deep ranking)? What loss function and model architectures would you choose?',
    'How will you evaluate the system offline and online? Detail your offline ranking metrics and how you would design online A/B testing with variance reduction (e.g. CUPED).',
    'How do you serve recommendations within the latency SLA (e.g. p99 < 50ms)? Discuss vector search indexing (HNSW), caching, embedding lookups, and hardware constraints.',
    'How will you monitor the production system against semantic drift (PSI) and feedback loops? What is the retraining cadence and rollback strategy?',
  ];

  public static readonly MIN_STEP_INDEX = 0;
  public static readonly MAX_STEP_INDEX = 5;
  public static readonly TOTAL_STEPS = 6;
  public static readonly MIN_PASSING_SCORE = 70;
  public static readonly MAX_SCORE = 100;
  public static readonly MIN_DIMENSION_SCORE = 1;
  public static readonly MAX_DIMENSION_SCORE = 5;
  public static readonly PASSING_DIMENSION_THRESHOLD = 3;

  public static readonly DIMENSION_SCALE_AWARENESS = 'scaleAwareness';
  public static readonly DIMENSION_COMPONENT_SELECTION = 'componentSelection';
  public static readonly DIMENSION_FAILURE_HANDLING = 'failureHandling';
  public static readonly DIMENSION_BUSINESS_ALIGNMENT = 'businessAlignment';

  public static readonly VOICE_LANG_DEFAULT = 'en-US';
  public static readonly VOICE_UNSUPPORTED_MSG = 'Speech recognition not supported in this browser.';

  public static readonly CASE_STUDY_ECOMMERCE = 'ECOMMERCE_RANKING';
  public static readonly CASE_STUDY_FRAUD = 'STREAMING_FRAUD';
  public static readonly CASE_STUDY_GENAI = 'ENTERPRISE_VECTOR_RAG';

  public static readonly FAILURE_DATA_DRIFT = 'DATA_DRIFT';
  public static readonly FAILURE_TRAIN_SERVE_SKEW = 'TRAIN_SERVE_SKEW';
  public static readonly FAILURE_HALLUCINATION_SPIKE = 'HALLUCINATION_SPIKE';

  public static readonly DEFAULT_TARGET_QPS = 10000;
  public static readonly DEFAULT_P99_LATENCY_MS = 50;
  public static readonly DEFAULT_DRIFT_PSI_THRESHOLD = 0.25;

  public constructor() {}
}

