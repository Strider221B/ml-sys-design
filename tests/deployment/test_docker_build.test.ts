import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('DeploymentConfiguration', () => {
  const rootDir = path.resolve(__dirname, '../..');

  it('test_dockerfile_containsMultiStageNode24AlpineArchitecture', () => {
    const dockerfilePath = path.join(rootDir, 'Dockerfile');
    expect(fs.existsSync(dockerfilePath)).toBe(true);

    const content = fs.readFileSync(dockerfilePath, 'utf-8');
    expect(content).toContain('FROM node:24-alpine AS builder');
    expect(content).toContain('FROM node:24-alpine AS runner');
    expect(content).toContain('ENV NODE_ENV=production');
    expect(content).toContain('ENV NEXT_TELEMETRY_DISABLED=1');
    expect(content).toContain('COPY --from=builder /app/.next/standalone ./');
    expect(content).toContain('COPY --from=builder /app/.next/static ./.next/static');
    expect(content).toContain('COPY --from=builder /app/public ./public');
    expect(content).toContain('EXPOSE 3000');
    expect(content).toContain('CMD ["node", "server.js"]');
  });

  it('test_dockerCompose_definesExpectedServicesAndEnvVariables', () => {
    const composePath = path.join(rootDir, 'docker-compose.yml');
    expect(fs.existsSync(composePath)).toBe(true);

    const content = fs.readFileSync(composePath, 'utf-8');
    expect(content).toContain('container_name: ml_sys_design_2026');
    expect(content).toContain('"3000:3000"');
    expect(content).toContain('NEXT_PUBLIC_GOOGLE_CLIENT_ID');
    expect(content).toContain('GEMINI_API_KEY');
    expect(content).toContain('restart: unless-stopped');
  });

  it('test_vercelConfig_definesSecurityAndHighPerformanceHeaders', () => {
    const vercelPath = path.join(rootDir, 'vercel.json');
    expect(fs.existsSync(vercelPath)).toBe(true);

    const parsed = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));
    expect(parsed.framework).toBe('nextjs');
    expect(parsed.buildCommand).toBe('npm run build');

    const headersList = parsed.headers[0].headers as Array<{ key: string; value: string }>;
    const headerMap = new Map(headersList.map((h) => [h.key, h.value]));

    expect(headerMap.get('X-Frame-Options')).toBe('DENY');
    expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headerMap.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(headerMap.get('Cross-Origin-Embedder-Policy')).toBe('credentialless');

    const csp = headerMap.get('Content-Security-Policy');
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('https://www.googleapis.com');
    expect(csp).toContain('https://generativelanguage.googleapis.com');
    expect(csp).toContain('https://api.github.com');
  });

  it('test_nextConfig_enablesStandaloneBuildOutput', () => {
    const configPath = path.join(rootDir, 'next.config.ts');
    expect(fs.existsSync(configPath)).toBe(true);

    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain("output: 'standalone'");
    expect(content).toContain('reactStrictMode: true');
  });

  it('test_runLocalCiScript_isExecutableShellWrapper', () => {
    const scriptPath = path.join(rootDir, 'scripts/run_local_ci.sh');
    expect(fs.existsSync(scriptPath)).toBe(true);

    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('#!/usr/bin/env bash');
    expect(content).toContain('scripts/local_ci_runner.ts');
  });
});
