import { describe, expect, it, vi } from 'vitest';
import { FetchFunction, GithubPublisher } from '@/core/exporters/github_publisher';

describe('GithubPublisher', () => {
  it('test_publishPortfolio_whenRepositoryExists_commitsFilesAndEnablesPages', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes('/repos/testuser/ml-portfolio/pages')) {
        return Promise.resolve(new Response(JSON.stringify({ status: 'built' }), { status: 200 }));
      }
      if (urlStr.includes('/contents/')) {
        return Promise.resolve(new Response(JSON.stringify({ content: {} }), { status: 201 }));
      }
      if (urlStr.includes('/repos/testuser/ml-portfolio')) {
        return Promise.resolve(new Response(JSON.stringify({ id: 123 }), { status: 200 }));
      }
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }) as FetchFunction;

    const publisher = new GithubPublisher(mockFetch);
    const result = await publisher.publishPortfolio({
      token: 'ghp_fake_token_12345',
      repositoryName: 'testuser/ml-portfolio',
      files: [
        { path: 'README.md', content: '# Architecture' },
        { path: 'architecture.tf', content: 'terraform {}' },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.pagesUrl).toBe('https://testuser.github.io/ml-portfolio/');
    expect(result.repositoryUrl).toBe('https://github.com/testuser/ml-portfolio');
    expect(result.commitSha).toBeDefined();
  });

  it('test_publishPortfolio_whenRepositoryDoesNotExist_createsRepositoryFirst', async () => {
    let repoCreated = false;
    const mockFetch = vi.fn().mockImplementation((url: string | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes('/user/repos')) {
        repoCreated = true;
        return Promise.resolve(new Response(JSON.stringify({ name: 'ml-new-repo' }), { status: 201 }));
      }
      if (urlStr.includes('/repos/testuser/ml-new-repo/pages')) {
        return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
      }
      if (urlStr.includes('/contents/')) {
        return Promise.resolve(new Response(JSON.stringify({}), { status: 201 }));
      }
      if (urlStr.includes('/repos/testuser/ml-new-repo')) {
        return Promise.resolve(new Response('Not found', { status: 404 }));
      }
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }) as FetchFunction;

    const publisher = new GithubPublisher(mockFetch);
    const result = await publisher.publishPortfolio({
      token: 'ghp_fake_token_12345',
      repositoryName: 'testuser/ml-new-repo',
      files: [{ path: 'README.md', content: '# Readme' }],
    });

    expect(repoCreated).toBe(true);
    expect(result.success).toBe(true);
    expect(result.pagesUrl).toBe('https://testuser.github.io/ml-new-repo/');
  });

  it('test_publishPortfolio_whenRepositoryNameInvalid_throwsError', async () => {
    const publisher = new GithubPublisher();
    await expect(
      publisher.publishPortfolio({
        token: 'ghp_fake_token',
        repositoryName: 'invalid_repo_name_without_slash',
        files: [],
      })
    ).rejects.toThrow('Invalid repository format');
  });

  it('test_createRepository_whenApiFails_throwsError', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes('/user/repos')) {
        return Promise.resolve(new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' }));
      }
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }) as FetchFunction;

    const publisher = new GithubPublisher(mockFetch);
    await expect(
      publisher.publishPortfolio({
        token: 'bad_token',
        repositoryName: 'user/failing-repo',
        files: [],
      })
    ).rejects.toThrow('Failed to publish to GitHub: Unauthorized');
  });
});
