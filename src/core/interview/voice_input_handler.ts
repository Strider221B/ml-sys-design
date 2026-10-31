import { InterviewConstants } from '@/core/interview/interview_constants';

export interface VoiceRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export type SpeechStatus = 'IDLE' | 'LISTENING' | 'ERROR' | 'UNSUPPORTED';

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

/**
 * Speech-to-text audio input controller integrating browser Web Speech API with fallback.
 */
export class VoiceInputHandler {
  private static readonly _STATUS_IDLE: SpeechStatus = 'IDLE';
  private static readonly _STATUS_LISTENING: SpeechStatus = 'LISTENING';
  private static readonly _STATUS_ERROR: SpeechStatus = 'ERROR';
  private static readonly _STATUS_UNSUPPORTED: SpeechStatus = 'UNSUPPORTED';
  private static readonly _EMPTY_STRING = '';
  private static readonly _SPACE = ' ';
  private static readonly _DEFAULT_CONFIDENCE = 1.0;

  public constructor(private _language: string = InterviewConstants.VOICE_LANG_DEFAULT) {
    this._status = this.isSupported() ? VoiceInputHandler._STATUS_IDLE : VoiceInputHandler._STATUS_UNSUPPORTED;
  }

  /**
   * Checks whether the browser runtime supports Web Speech Recognition.
   */
  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as Record<string, unknown>;
    return Boolean(win['SpeechRecognition'] || win['webkitSpeechRecognition']);
  }

  /**
   * Current speech engine lifecycle status.
   */
  public getStatus(): SpeechStatus {
    return this._status;
  }

  /**
   * Full accumulated spoken transcript.
   */
  public getTranscript(): string {
    return this._accumulatedTranscript;
  }

  /**
   * Sets target recognition language locale (e.g. 'en-US').
   */
  public setLanguage(language: string): void {
    this._language = language;
    if (this._recognitionInstance) {
      this._recognitionInstance.lang = language;
    }
  }

  /**
   * Manually sets or replaces the active transcript text.
   */
  public setTranscript(transcript: string): void {
    this._accumulatedTranscript = transcript;
  }

  /**
   * Clears accumulated transcript buffer.
   */
  public resetTranscript(): void {
    this._accumulatedTranscript = VoiceInputHandler._EMPTY_STRING;
  }

  /**
   * Starts listening to microphone audio stream.
   */
  public startListening(
    onResult?: (result: VoiceRecognitionResult) => void,
    onError?: (err: string) => void
  ): boolean {
    if (!this.isSupported()) {
      this._status = VoiceInputHandler._STATUS_UNSUPPORTED;
      onError?.(InterviewConstants.VOICE_UNSUPPORTED_MSG);
      return false;
    }
    return this._initializeAndStart(onResult, onError);
  }

  /**
   * Stops microphone audio capture and flushes recognition.
   */
  public stopListening(): void {
    if (this._recognitionInstance && this._status === VoiceInputHandler._STATUS_LISTENING) {
      this._recognitionInstance.stop();
      this._status = VoiceInputHandler._STATUS_IDLE;
    }
  }

  private _status: SpeechStatus;
  private _accumulatedTranscript: string = VoiceInputHandler._EMPTY_STRING;
  private _recognitionInstance: SpeechRecognitionInstance | null = null;

  private _initializeAndStart(
    onResult?: (result: VoiceRecognitionResult) => void,
    onError?: (err: string) => void
  ): boolean {
    try {
      this._recognitionInstance = this._createNativeInstance();
      this._configureRecognition(this._recognitionInstance, onResult, onError);
      this._recognitionInstance.start();
      this._status = VoiceInputHandler._STATUS_LISTENING;
      return true;
    } catch (err: unknown) {
      this._status = VoiceInputHandler._STATUS_ERROR;
      const msg = err instanceof Error ? err.message : String(err);
      onError?.(msg);
      return false;
    }
  }

  private _createNativeInstance(): SpeechRecognitionInstance {
    const win = window as unknown as Record<string, new () => SpeechRecognitionInstance>;
    const ConstructorClass = win['SpeechRecognition'] || win['webkitSpeechRecognition'];
    return new ConstructorClass();
  }

  private _configureRecognition(
    instance: SpeechRecognitionInstance,
    onResult?: (result: VoiceRecognitionResult) => void,
    onError?: (err: string) => void
  ): void {
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = this._language;
    instance.onresult = (e: SpeechRecognitionEventLike) => this._handleSpeechResult(e, onResult);
    instance.onerror = (e: SpeechRecognitionErrorEventLike) => this._handleSpeechError(e, onError);
    instance.onend = () => {
      this._status = VoiceInputHandler._STATUS_IDLE;
    };
  }

  private _handleSpeechResult(
    event: SpeechRecognitionEventLike,
    onResult?: (result: VoiceRecognitionResult) => void
  ): void {
    let interimText = VoiceInputHandler._EMPTY_STRING;
    let confidence = VoiceInputHandler._DEFAULT_CONFIDENCE;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const item = event.results[i];
      if (!item || !item[0]) continue;
      const piece = item[0].transcript;
      confidence = item[0].confidence || VoiceInputHandler._DEFAULT_CONFIDENCE;
      if (item.isFinal) {
        this._appendFinalTranscript(piece);
      } else {
        interimText += piece;
      }
    }
    const current = interimText || this._accumulatedTranscript;
    onResult?.({ transcript: current, isFinal: !interimText, confidence });
  }

  private _appendFinalTranscript(piece: string): void {
    const separator = this._accumulatedTranscript.length > 0 ? VoiceInputHandler._SPACE : VoiceInputHandler._EMPTY_STRING;
    this._accumulatedTranscript += `${separator}${piece.trim()}`;
  }

  private _handleSpeechError(
    event: SpeechRecognitionErrorEventLike,
    onError?: (err: string) => void
  ): void {
    this._status = VoiceInputHandler._STATUS_ERROR;
    onError?.(event.error);
  }
}

