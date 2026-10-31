// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceInputHandler, VoiceRecognitionResult } from '@/core/interview/voice_input_handler';

interface MockSpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

describe('VoiceInputHandler', () => {
  let mockRecognitionInstance: MockSpeechRecognitionInstance;

  beforeEach(() => {
    mockRecognitionInstance = {
      continuous: false,
      interimResults: false,
      lang: 'en-US',
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      onresult: null,
      onerror: null,
      onend: null,
    };

    const MockConstructor = vi.fn().mockImplementation(() => mockRecognitionInstance);
    vi.stubGlobal('SpeechRecognition', MockConstructor);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('test_isSupported_whenSpeechRecognitionPresent_returnsTrue', () => {
    const handler = new VoiceInputHandler();
    expect(handler.isSupported()).toBe(true);
    expect(handler.getStatus()).toBe('IDLE');
  });

  it('test_isSupported_whenNoApiAvailable_returnsFalse', () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    vi.stubGlobal('webkitSpeechRecognition', undefined);

    const handler = new VoiceInputHandler();
    expect(handler.isSupported()).toBe(false);
    expect(handler.getStatus()).toBe('UNSUPPORTED');
  });

  it('test_setTranscript_and_resetTranscript_mutatesBuffer', () => {
    const handler = new VoiceInputHandler();
    handler.setTranscript('Initial speech');
    expect(handler.getTranscript()).toBe('Initial speech');

    handler.resetTranscript();
    expect(handler.getTranscript()).toBe('');
  });

  it('test_setLanguage_updatesConfiguredLanguage', () => {
    const handler = new VoiceInputHandler('en-US');
    handler.startListening();
    handler.setLanguage('fr-FR');
    expect(mockRecognitionInstance.lang).toBe('fr-FR');
  });

  it('test_startListening_whenUnsupported_invokesErrorCallback', () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    vi.stubGlobal('webkitSpeechRecognition', undefined);

    const handler = new VoiceInputHandler();
    const errorCallback = vi.fn();
    const started = handler.startListening(undefined, errorCallback);

    expect(started).toBe(false);
    expect(handler.getStatus()).toBe('UNSUPPORTED');
    expect(errorCallback).toHaveBeenCalledWith(expect.stringContaining('not supported'));
  });

  it('test_startListening_whenSupported_configuresAndStarts', () => {
    const handler = new VoiceInputHandler();
    const onResult = vi.fn();
    const onError = vi.fn();

    const started = handler.startListening(onResult, onError);
    expect(started).toBe(true);
    expect(handler.getStatus()).toBe('LISTENING');
    expect(mockRecognitionInstance.start).toHaveBeenCalled();
    expect(mockRecognitionInstance.continuous).toBe(true);
    expect(mockRecognitionInstance.interimResults).toBe(true);
  });

  it('test_startListening_whenStartThrows_setsErrorStatus', () => {
    mockRecognitionInstance.start.mockImplementation(() => {
      throw new Error('Microphone permission denied');
    });

    const handler = new VoiceInputHandler();
    const onError = vi.fn();
    const started = handler.startListening(undefined, onError);

    expect(started).toBe(false);
    expect(handler.getStatus()).toBe('ERROR');
    expect(onError).toHaveBeenCalledWith('Microphone permission denied');
  });

  it('test_handleSpeechResult_accumulatesFinalAndCallsCallback', () => {
    const handler = new VoiceInputHandler();
    const results: VoiceRecognitionResult[] = [];
    handler.startListening((res) => results.push(res));

    const mockEvent = {
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          0: { transcript: 'Hello world', confidence: 0.95 },
        },
      ],
    };

    mockRecognitionInstance.onresult?.(mockEvent);
    expect(handler.getTranscript()).toBe('Hello world');
    expect(results).toHaveLength(1);
    expect(results[0]?.isFinal).toBe(true);

    const secondEvent = {
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          0: { transcript: 'from system design', confidence: 0.9 },
        },
      ],
    };
    mockRecognitionInstance.onresult?.(secondEvent);
    expect(handler.getTranscript()).toBe('Hello world from system design');
  });

  it('test_handleSpeechResult_handlesInterimResults', () => {
    const handler = new VoiceInputHandler();
    let latest: VoiceRecognitionResult | undefined;
    handler.startListening((res) => {
      latest = res;
    });

    const mockEvent = {
      resultIndex: 0,
      results: [
        {
          isFinal: false,
          0: { transcript: 'Interim speech...', confidence: 0.8 },
        },
      ],
    };

    mockRecognitionInstance.onresult?.(mockEvent);
    expect(latest).toBeDefined();
    expect(latest?.transcript).toBe('Interim speech...');
    expect(latest?.isFinal).toBe(false);
  });

  it('test_handleSpeechError_and_onend_updatesStatus', () => {
    const handler = new VoiceInputHandler();
    const onError = vi.fn();
    handler.startListening(undefined, onError);

    mockRecognitionInstance.onerror?.({ error: 'network-timeout' });
    expect(handler.getStatus()).toBe('ERROR');
    expect(onError).toHaveBeenCalledWith('network-timeout');

    mockRecognitionInstance.onend?.();
    expect(handler.getStatus()).toBe('IDLE');
  });

  it('test_stopListening_stopsActiveInstance', () => {
    const handler = new VoiceInputHandler();
    handler.startListening();
    expect(handler.getStatus()).toBe('LISTENING');

    handler.stopListening();
    expect(mockRecognitionInstance.stop).toHaveBeenCalled();
    expect(handler.getStatus()).toBe('IDLE');
  });
});
