/**
 * Constants for Pyodide Web Worker execution, causal inference, and data auditing.
 */
export class PyodideConstants {
  public static readonly PYODIDE_CDN_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js';
  public static readonly PACKAGE_NUMPY = 'numpy';
  public static readonly PACKAGE_SCIPY = 'scipy';
  public static readonly DEFAULT_PACKAGES: readonly string[] = ['numpy', 'scipy'];

  public static readonly DEFAULT_AGENT_POPULATION = 1000;
  public static readonly DEFAULT_MINHASH_PERMUTATIONS = 128;
  public static readonly DEFAULT_MINHASH_BANDS = 16;
  public static readonly DEFAULT_MINHASH_ROWS_PER_BAND = 8;
  public static readonly DEFAULT_CONTAMINATION_THRESHOLD = 0.85;
  public static readonly DEFAULT_MIN_SHANNON_ENTROPY = 3.0;
  public static readonly DEFAULT_KAPPA_THRESHOLD = 0.80;
  public static readonly DEFAULT_HIGH_CONFIDENCE_THRESHOLD = 0.90;
  public static readonly MIN_VARIANCE_THRESHOLD = 1e-9;
  public static readonly PERCENT_MULTIPLIER = 100.0;

  public static readonly HACK_LENGTH_EXPLOITATION = 'LENGTH_EXPLOITATION';
  public static readonly HACK_SYCOPHANCY = 'SYCOPHANCY';
  public static readonly HACK_REPETITIVE_LOOP = 'REPETITIVE_LOOP';
  public static readonly HACK_NULL_OUTPUT = 'NULL_OUTPUT';
  public static readonly HACK_SAFETY_EVASION = 'SAFETY_EVASION';

  public static readonly OBJECTIVE_MAXIMIZE = 'maximize';
  public static readonly OBJECTIVE_MINIMIZE = 'minimize';

  public static readonly QUEUE_SILVER_STORE = 'SILVER_STORE';
  public static readonly QUEUE_GOLD_STORE = 'GOLD_STORE';
  public static readonly QUEUE_HUMAN_REVIEW = 'HUMAN_REVIEW';
  public static readonly QUEUE_COMMITTEE_REVIEW = 'COMMITTEE_REVIEW';
  public static readonly QUEUE_SENIOR_ARBITRATION = 'SENIOR_ARBITRATION';

  public constructor() {}
}

