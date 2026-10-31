import { describe, expect, it, vi } from 'vitest';
import { GisTokenResponse, GoogleAuthClient } from '@/core/gdrive/google_auth_client';

describe('GoogleAuthClient', () => {
  const createMockWindow = (preloaded = false) => {
    let capturedCallback: ((res: GisTokenResponse) => void) | null = null;
    let capturedErrorCallback: ((err: unknown) => void) | null = null;
    const requestAccessTokenMock = vi.fn().mockImplementation(() => {
      // Intentionally manual trigger in tests
    });
    const revokeMock = vi.fn().mockImplementation((_token: string, done: () => void) => {
      done();
    });

    const oauth2 = {
      initTokenClient: vi.fn().mockImplementation((config) => {
        capturedCallback = config.callback;
        capturedErrorCallback = config.error_callback;
        return {
          requestAccessToken: requestAccessTokenMock,
        };
      }),
      revoke: revokeMock,
    };

    const documentMock = {
      createElement: vi.fn().mockImplementation((tag: string) => {
        const el: Record<string, unknown> = { tagName: tag };
        setTimeout(() => {
          if (typeof el['onload'] === 'function') {
            (el['onload'] as () => void)();
          }
        }, 10);
        return el;
      }),
      head: {
        appendChild: vi.fn(),
      },
    };

    const mockWin = {
      document: documentMock,
      google: preloaded ? { accounts: { oauth2 } } : undefined,
    } as unknown as Window;

    return {
      mockWin,
      oauth2,
      requestAccessTokenMock,
      revokeMock,
      triggerResponse: (res: GisTokenResponse) => capturedCallback?.(res),
      triggerError: (err: unknown) => capturedErrorCallback?.(err),
    };
  };

  it('test_initialize_whenWindowUndefined_throwsError', async () => {
    const client = new GoogleAuthClient(undefined);
    if (typeof window === 'undefined') {
      await expect(client.initialize('client_id_123')).rejects.toThrow(
        'Window object is undefined'
      );
    }
  });

  it('test_initialize_loadsScriptWhenNotPresent', async () => {
    const { mockWin, oauth2 } = createMockWindow(false);
    const client = new GoogleAuthClient(mockWin);

    mockWin.document.createElement = vi.fn().mockImplementation(() => {
      const el: Record<string, unknown> = {};
      setTimeout(() => {
        (mockWin as unknown as { google: unknown }).google = { accounts: { oauth2 } };
        if (typeof el['onload'] === 'function') {
          (el['onload'] as () => void)();
        }
      }, 10);
      return el;
    });

    await client.initialize('test_client_id');

    expect(oauth2.initTokenClient).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'test_client_id' })
    );
  });

  it('test_initialize_whenScriptElementMissing_rejects', async () => {
    const { mockWin } = createMockWindow(false);
    const client = new GoogleAuthClient(mockWin);
    mockWin.document.createElement = vi.fn().mockReturnValue(null);

    await expect(client.initialize('test_id')).rejects.toThrow('Window object is undefined');
  });

  it('test_initialize_skipsScriptLoadingWhenAlreadyPresent', async () => {
    const { mockWin, oauth2 } = createMockWindow(true);
    const client = new GoogleAuthClient(mockWin);

    await client.initialize('test_client_id_2');

    expect(mockWin.document.createElement).not.toHaveBeenCalled();
    expect(oauth2.initTokenClient).toHaveBeenCalledTimes(1);
  });

  it('test_initialize_whenScriptError_rejectsPromise', async () => {
    const { mockWin } = createMockWindow(false);
    const client = new GoogleAuthClient(mockWin);

    mockWin.document.createElement = vi.fn().mockImplementation(() => {
      const el: Record<string, unknown> = {};
      setTimeout(() => {
        if (typeof el['onerror'] === 'function') {
          (el['onerror'] as () => void)();
        }
      }, 10);
      return el;
    });

    await expect(client.initialize('test_client_err')).rejects.toThrow(
      'Failed to load Google Identity Services SDK'
    );
  });

  it('test_initialize_whenOauth2UnavailableAfterLoad_throwsError', async () => {
    const { mockWin } = createMockWindow(false);
    const client = new GoogleAuthClient(mockWin);

    // Mock load succeeds but window.google.accounts.oauth2 remains undefined
    await expect(client.initialize('test_missing_oauth2')).rejects.toThrow(
      'Google Identity Services SDK is unavailable'
    );
  });

  it('test_requestAccessToken_whenNotInitialized_throwsError', async () => {
    const { mockWin } = createMockWindow(true);
    const client = new GoogleAuthClient(mockWin);

    await expect(client.requestAccessToken()).rejects.toThrow(
      'GoogleAuthClient has not been initialized'
    );
  });

  it('test_requestAccessToken_resolvesWithValidToken', async () => {
    const { mockWin, triggerResponse } = createMockWindow(true);
    const client = new GoogleAuthClient(mockWin);
    await client.initialize('test_client_id');

    const tokenPromise = client.requestAccessToken();
    triggerResponse({ access_token: 'ya29.ephemeral_access_token_xyz' });
    const token = await tokenPromise;

    expect(token).toBe('ya29.ephemeral_access_token_xyz');
    expect(client.getAccessToken()).toBe('ya29.ephemeral_access_token_xyz');
    expect(client.isAuthenticated()).toBe(true);
  });

  it('test_requestAccessToken_whenResponseContainsError_rejects', async () => {
    const { mockWin, triggerResponse } = createMockWindow(true);
    const client = new GoogleAuthClient(mockWin);
    await client.initialize('test_client_id');

    const tokenPromise = client.requestAccessToken();
    triggerResponse({ error: 'access_denied' });

    await expect(tokenPromise).rejects.toThrow('access_denied');
    expect(client.isAuthenticated()).toBe(false);
  });

  it('test_requestAccessToken_whenResponseHasNeitherTokenNorError_rejectsWithDefault', async () => {
    const { mockWin, triggerResponse } = createMockWindow(true);
    const client = new GoogleAuthClient(mockWin);
    await client.initialize('test_client_id');

    const tokenPromise = client.requestAccessToken();
    triggerResponse({});

    await expect(tokenPromise).rejects.toThrow('OAuth token request failed or returned empty token');
  });

  it('test_requestAccessToken_onErrorCallback_rejects', async () => {
    const { mockWin, triggerError } = createMockWindow(true);
    const client = new GoogleAuthClient(mockWin);
    await client.initialize('test_client_id');

    const tokenPromise = client.requestAccessToken();
    triggerError(new Error('Popup blocked by browser'));

    await expect(tokenPromise).rejects.toThrow('Popup blocked by browser');
  });

  it('test_requestAccessToken_onErrorCallbackWithNonError_rejectsWithFallback', async () => {
    const { mockWin, triggerError } = createMockWindow(true);
    const client = new GoogleAuthClient(mockWin);
    await client.initialize('test_client_id');

    const tokenPromise = client.requestAccessToken();
    triggerError('Generic string error');

    await expect(tokenPromise).rejects.toThrow('OAuth token request failed or returned empty token');
  });

  it('test_revokeToken_callsGisRevokeAndClearsToken', async () => {
    const { mockWin, triggerResponse, revokeMock } = createMockWindow(true);
    const client = new GoogleAuthClient(mockWin);
    await client.initialize('test_client_id');

    const tokenPromise = client.requestAccessToken();
    triggerResponse({ access_token: 'token_to_revoke' });
    await tokenPromise;

    await client.revokeToken('token_to_revoke');

    expect(revokeMock).toHaveBeenCalledWith('token_to_revoke', expect.any(Function));
    expect(client.getAccessToken()).toBeNull();
    expect(client.isAuthenticated()).toBe(false);
  });

  it('test_revokeToken_whenTokenDoesNotMatchCurrent_preservesCurrentToken', async () => {
    const { mockWin, triggerResponse } = createMockWindow(true);
    const client = new GoogleAuthClient(mockWin);
    await client.initialize('test_client_id');

    const tokenPromise = client.requestAccessToken();
    triggerResponse({ access_token: 'current_token' });
    await tokenPromise;

    await client.revokeToken('other_token');
    expect(client.getAccessToken()).toBe('current_token');
  });

  it('test_revokeToken_whenOauth2Missing_doesNotThrow', async () => {
    const client = new GoogleAuthClient(undefined);
    await expect(client.revokeToken('')).resolves.toBeUndefined();
  });

  it('test_clearToken_purgesTokenFromMemory', async () => {
    const { mockWin, triggerResponse } = createMockWindow(true);
    const client = new GoogleAuthClient(mockWin);
    await client.initialize('test_client_id');

    const tokenPromise = client.requestAccessToken();
    triggerResponse({ access_token: 'token_active' });
    await tokenPromise;

    expect(client.isAuthenticated()).toBe(true);
    client.clearToken();
    expect(client.isAuthenticated()).toBe(false);
    expect(client.getAccessToken()).toBeNull();
  });
});
