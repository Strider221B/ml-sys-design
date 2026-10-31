// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChaosSandboxWorkspace } from '@/components/chaos/chaos_sandbox_workspace';
import { GeminiArgonReviewer } from '@/core/chaos/gemini_argon_reviewer';
import { IncidentRouletteEngine } from '@/core/chaos/incident_roulette_engine';
import { LLMExchangeEnvelope } from '@/schemas/exchange_envelope_schema';

describe('ChaosSandboxWorkspace', () => {
  it('test_render_displaysHeaderAndInitialPlaygroundTab', () => {
    render(<ChaosSandboxWorkspace />);

    expect(screen.getByText('Chaos Engineering & Failure Sandbox')).toBeDefined();
    expect(screen.getByTestId('chaos-tab-bar')).toBeDefined();
    expect(screen.getByTestId('tab-playground')).toBeDefined();
    expect(screen.getByText('Inject Fault')).toBeDefined();
  });

  it('test_tabNavigation_switchesActiveTabPanes', () => {
    render(<ChaosSandboxWorkspace />);

    fireEvent.click(screen.getByText('2. Gemini Argon Reviewer'));
    expect(screen.getByTestId('tab-argon')).toBeDefined();

    fireEvent.click(screen.getByText('3. Agent Cascade Simulator'));
    expect(screen.getByTestId('tab-cascade')).toBeDefined();

    fireEvent.click(screen.getByText('4. Edge & Quantization'));
    expect(screen.getByTestId('tab-quantization')).toBeDefined();

    fireEvent.click(screen.getByText('5. Incident Roulette'));
    expect(screen.getByTestId('tab-roulette')).toBeDefined();
  });

  it('test_playground_injectFault_updatesBlastRadiusAndLogs', () => {
    render(<ChaosSandboxWorkspace initialTab="PLAYGROUND" />);

    const injectBtn = screen.getByText('Inject Fault');
    fireEvent.click(injectBtn);

    expect(screen.getByText(/Blast Radius: \d+\/100/)).toBeDefined();
    expect(screen.getByText(/• Injected/)).toBeDefined();
  });

  it('test_argon_analyzeVulnerabilities_rendersAdversarialReport', async () => {
    const mockArgon = {
      analyzeVulnerabilities: vi.fn().mockResolvedValue({
        status: 'SUCCESS',
        data: {
          adversarialCritique: 'Critical vector partition bottleneck',
          targetedVulnerability: 'Unprotected HNSW cluster',
          killerWorkloadPacket: {
            trafficPattern: 'SKEWED_HASH_KEY_COLLISION',
            burstQPS: 50000,
            adversarialPayloadDescription: 'Cluster centroid overload',
            samplePayloadSnippet: '{"query": [1.0]}',
          },
          predictedSystemFailure: 'Shard crash',
        },
      }),
      generateDeterministicKillerWorkload: vi.fn(),
      scanVulnerabilitiesHeuristic: vi.fn(),
    } as unknown as GeminiArgonReviewer;

    render(<ChaosSandboxWorkspace initialTab="ARGON" argonReviewer={mockArgon} />);

    const reviewBtn = screen.getByText('Red-Team Architecture');
    await fireEvent.click(reviewBtn);

    expect(await screen.findByTestId('argon-report')).toBeDefined();
    expect(screen.getByText(/Targeted Vulnerability: Unprotected HNSW cluster/)).toBeDefined();
  });

  it('test_argon_whenFallbackRequired_opensExchangeModal', async () => {
    const sampleEnvelope: LLMExchangeEnvelope = {
      envelopeVersion: '2026.1.0',
      envelopeId: 'env_argon_modal',
      moduleId: 'CHAOS_MONKEY_ARGON',
      useCaseId: 'argon_test',
      timestamp: new Date().toISOString(),
      promptPayload: {
        systemInstruction: 'sys',
        userPrompt: 'prompt',
        serializedContext: {},
        copyPasteReadyMarkdown: 'markdown',
      },
      expectedResponseSchema: {},
      llmResponse: null,
      metadata: {
        source: 'DIRECT_GEMINI_API',
        modelIdentifier: 'gemini-1.5-flash',
        executionLatencyMs: 0,
        validationErrors: [],
      },
    };

    const mockArgon = {
      analyzeVulnerabilities: vi.fn().mockResolvedValue({
        status: 'MANUAL_FALLBACK_REQUIRED',
        data: null,
        envelope: sampleEnvelope,
      }),
      generateDeterministicKillerWorkload: vi.fn(),
      scanVulnerabilitiesHeuristic: vi.fn(),
    } as unknown as GeminiArgonReviewer;

    render(<ChaosSandboxWorkspace initialTab="ARGON" argonReviewer={mockArgon} />);

    await fireEvent.click(screen.getByText('Red-Team Architecture'));

    expect(await screen.findByRole('dialog')).toBeDefined();

    const textarea = screen.getByPlaceholderText(/Paste raw LLM response/);
    const validData = {
      adversarialCritique: 'Imported critique',
      targetedVulnerability: 'Imported vulnerability',
      killerWorkloadPacket: {
        trafficPattern: 'POISSON_BURST',
        burstQPS: 20000,
        adversarialPayloadDescription: 'Imported description',
        samplePayloadSnippet: '{}',
      },
      predictedSystemFailure: 'Imported crash',
    };
    fireEvent.change(textarea, { target: { value: JSON.stringify(validData) } });
    fireEvent.click(screen.getByText('Import & Validate Response'));

    expect(await screen.findByTestId('argon-report')).toBeDefined();
  });

  it('test_cascadeSimulator_runsSimulationAndDisplaysResult', () => {
    render(<ChaosSandboxWorkspace initialTab="CASCADE" />);

    const runBtn = screen.getByText('Simulate Cascade');
    fireEvent.click(runBtn);

    expect(screen.getByTestId('cascade-result')).toBeDefined();
    expect(screen.getByText(/Status: HALTED_GRACEFULLY/)).toBeDefined();
  });

  it('test_quantizationDebugger_profilesHardwareEnvelope', () => {
    render(<ChaosSandboxWorkspace initialTab="QUANTIZATION" />);

    const profileBtn = screen.getByText('Profile Envelope');
    fireEvent.click(profileBtn);

    expect(screen.getByTestId('quantization-result')).toBeDefined();
    expect(screen.getByText(/Memory:/)).toBeDefined();
  });

  it('test_incidentRoulette_triggersIncidentAndAppliesMitigation', () => {
    const rouletteEngine = new IncidentRouletteEngine();
    vi.spyOn(rouletteEngine, 'triggerRandomIncident').mockImplementation(() =>
      rouletteEngine.triggerIncidentById('inc_vdb_v2_latency')
    );
    render(<ChaosSandboxWorkspace initialTab="ROULETTE" rouletteEngine={rouletteEngine} />);

    const triggerBtn = screen.getByText('Trigger Incident');
    fireEvent.click(triggerBtn);

    expect(screen.getByTestId('active-incident')).toBeDefined();

    const cacheChoice = screen.getByText('Insert In-Memory Semantic Cache');
    fireEvent.click(cacheChoice);

    expect(screen.getAllByText(/halting drain/).length).toBeGreaterThan(0);
  });

  it('test_resetEnvironment_clearsStateBackToPristine', () => {
    render(<ChaosSandboxWorkspace initialTab="PLAYGROUND" />);

    fireEvent.click(screen.getByText('Inject Fault'));
    expect(screen.getByText(/Blast Radius: \d+\/100/)).toBeDefined();

    const resetBtn = screen.getByText('Reset Environment');
    fireEvent.click(resetBtn);

    expect(screen.getByText('Blast Radius: 0/100')).toBeDefined();
  });
});
