import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GitHubAuthEdgeHandler } from '@/app/api/auth/github/callback/git_hub_auth_edge_handler';
import { Route } from '@/app/api/auth/github/callback/route';

describe('GitHubAuthEdgeHandler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it('test_handlePost_whenCodeMissing_returns400', async () => {
    const handler = new GitHubAuthEdgeHandler();
    const req = new NextRequest('http://localhost:3000/api/auth/github/callback', {
      method: 'POST',
      body: JSON.stringify({ state: 'random_state' }),
    });

    const res = await handler.handlePost(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing OAuth authorization code');
  });

  it('test_handlePost_whenSuccessfulExchange_returns200WithTokenPayload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'ghp_secret_access_token_12345',
        token_type: 'bearer',
        scope: 'repo,workflow,user',
      }),
    });

    const handler = new GitHubAuthEdgeHandler({
      clientId: 'mock_client_id',
      clientSecret: 'mock_client_secret',
      fetchFn: mockFetch,
    });

    const req = new NextRequest('http://localhost:3000/api/auth/github/callback', {
      method: 'POST',
      body: JSON.stringify({ code: 'valid_code', state: 'session_state' }),
    });

    const res = await handler.handlePost(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.accessToken).toBe('ghp_secret_access_token_12345');
    expect(data.tokenType).toBe('bearer');
    expect(data.scope).toBe('repo,workflow,user');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('test_handlePost_whenGitHubReturnsError_returns400WithErrorDescription', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'bad_verification_code',
        error_description: 'The code passed is incorrect or expired.',
      }),
    });

    const handler = new GitHubAuthEdgeHandler({
      clientId: 'id',
      clientSecret: 'secret',
      fetchFn: mockFetch,
    });

    const req = new NextRequest('http://localhost:3000/api/auth/github/callback', {
      method: 'POST',
      body: JSON.stringify({ code: 'expired_code' }),
    });

    const res = await handler.handlePost(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('The code passed is incorrect or expired.');
  });

  it('test_handlePost_whenGitHubReturnsErrorWithoutDescription_returnsDefaultError', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'unknown_oauth_error',
      }),
    });

    const handler = new GitHubAuthEdgeHandler({
      fetchFn: mockFetch,
    });

    const req = new NextRequest('http://localhost:3000/api/auth/github/callback', {
      method: 'POST',
      body: JSON.stringify({ code: 'error_code' }),
    });

    const res = await handler.handlePost(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('GitHub OAuth exchange failed');
  });

  it('test_handlePost_whenFetchThrows_returns500InternalError', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));
    const handler = new GitHubAuthEdgeHandler({
      fetchFn: mockFetch,
    });

    const req = new NextRequest('http://localhost:3000/api/auth/github/callback', {
      method: 'POST',
      body: JSON.stringify({ code: 'valid_code' }),
    });

    const res = await handler.handlePost(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal edge error during GitHub auth');
  });

  it('test_handlePost_usesEnvVarsWhenOptionsOmitted', async () => {
    process.env.GITHUB_CLIENT_ID = 'env_client_id';
    process.env.GITHUB_CLIENT_SECRET = 'env_client_secret';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'ghp_env_token',
        token_type: 'bearer',
        scope: 'repo',
      }),
    });

    const handler = new GitHubAuthEdgeHandler({
      fetchFn: mockFetch,
    });

    const req = new NextRequest('http://localhost:3000/api/auth/github/callback', {
      method: 'POST',
      body: JSON.stringify({ code: 'env_test_code' }),
    });

    const res = await handler.handlePost(req);
    expect(res.status).toBe(200);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.client_id).toBe('env_client_id');
    expect(callBody.client_secret).toBe('env_client_secret');
  });

  it('test_Route_POST_delegatesToHandlerInstance', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/github/callback', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await Route.POST(req);
    expect(res.status).toBe(400);
  });
});

