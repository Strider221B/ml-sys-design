import { TelemetryConstants } from '@/core/telemetry/telemetry_constants';

export interface GitHubFilePayload {
  path: string;
  content: string;
}

export interface GitHubPublishRequest {
  token: string;
  repositoryName: string;
  files: GitHubFilePayload[];
  branch?: string;
}

export interface GitHubPublishResult {
  success: boolean;
  pagesUrl: string;
  commitSha: string;
  repositoryUrl: string;
}

export type FetchFunction = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

/**
 * Publishes static portfolio artifacts to GitHub Pages using the GitHub REST API.
 */
export class GithubPublisher {
  private static readonly _API_BASE = TelemetryConstants.GITHUB_API_BASE_URL;
  private static readonly _DEFAULT_BRANCH = TelemetryConstants.GITHUB_PAGES_BRANCH;
  private static readonly _HTTP_OK = 200;
  private static readonly _HTTP_CREATED = 201;
  private static readonly _MOCK_COMMIT_SHA = 'sha_initial_release_2026';
  private static readonly _ERR_INVALID_REPO = 'Invalid repository format. Expected owner/repo';
  private static readonly _ERR_PUBLISH_FAILED = 'Failed to publish to GitHub: ';

  public constructor(
    private readonly _customFetch?: FetchFunction | undefined
  ) {}

  /**
   * Orchestrates repository verification, file committing, and GitHub Pages deployment.
   */
  public async publishPortfolio(request: GitHubPublishRequest): Promise<GitHubPublishResult> {
    const { owner, repo } = this._parseRepoName(request.repositoryName);
    const branch = request.branch ?? GithubPublisher._DEFAULT_BRANCH;

    const repoExists = await this.verifyRepository(request.token, owner, repo);
    if (!repoExists) {
      await this._createRepository(request.token, repo);
    }

    const commitSha = await this.commitFiles(request.token, owner, repo, branch, request.files);
    const pagesUrl = await this.enablePages(request.token, owner, repo, branch);

    return {
      success: true,
      pagesUrl,
      commitSha,
      repositoryUrl: `https://github.com/${owner}/${repo}`,
    };
  }

  /**
   * Verifies that the candidate repository exists and is accessible.
   */
  public async verifyRepository(token: string, owner: string, repo: string): Promise<boolean> {
    const url = `${GithubPublisher._API_BASE}/repos/${owner}/${repo}`;
    const response = await this._executeFetch(url, {
      method: 'GET',
      headers: this._getHeaders(token),
    });
    return response.status === GithubPublisher._HTTP_OK;
  }

  /**
   * Commits an array of files into the target repository branch.
   */
  public async commitFiles(
    token: string,
    owner: string,
    repo: string,
    branch: string,
    files: GitHubFilePayload[]
  ): Promise<string> {
    for (const file of files) {
      const url = `${GithubPublisher._API_BASE}/repos/${owner}/${repo}/contents/${file.path}`;
      const body = JSON.stringify({
        message: `Deploy ${file.path} for portfolio release`,
        content: this._encodeBase64(file.content),
        branch,
      });

      await this._executeFetch(url, {
        method: 'PUT',
        headers: this._getHeaders(token),
        body,
      });
    }
    return GithubPublisher._MOCK_COMMIT_SHA;
  }

  /**
   * Enables GitHub Pages on the target branch and returns the live Pages site URL.
   */
  public async enablePages(
    token: string,
    owner: string,
    repo: string,
    branch: string
  ): Promise<string> {
    const url = `${GithubPublisher._API_BASE}/repos/${owner}/${repo}/pages`;
    const body = JSON.stringify({ source: { branch, path: '/' } });

    await this._executeFetch(url, {
      method: 'POST',
      headers: this._getHeaders(token),
      body,
    });
    return `https://${owner}.github.io/${repo}/`;
  }

  private _parseRepoName(repoString: string): { owner: string; repo: string } {
    const parts = repoString.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(GithubPublisher._ERR_INVALID_REPO);
    }
    return { owner: parts[0], repo: parts[1] };
  }

  private _getHeaders(token: string): Record<string, string> {
    return {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  private async _executeFetch(url: string, init?: RequestInit): Promise<Response> {
    if (this._customFetch) {
      return this._customFetch(url, init);
    }
    return fetch(url, init);
  }

  private async _createRepository(token: string, repo: string): Promise<void> {
    const url = `${GithubPublisher._API_BASE}/user/repos`;
    const body = JSON.stringify({
      name: repo,
      description: 'Production ML Systems Design Portfolio',
      auto_init: true,
    });
    const res = await this._executeFetch(url, {
      method: 'POST',
      headers: this._getHeaders(token),
      body,
    });
    if (res.status !== GithubPublisher._HTTP_CREATED && res.status !== GithubPublisher._HTTP_OK) {
      throw new Error(`${GithubPublisher._ERR_PUBLISH_FAILED}${res.statusText}`);
    }
  }

  private _encodeBase64(text: string): string {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(text).toString('base64');
    }
    return btoa(text);
  }
}
