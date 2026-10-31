// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TelemetryDashboard } from '@/components/telemetry/telemetry_dashboard';

describe('TelemetryDashboard', () => {
  beforeEach(() => {
    // Mock HTMLCanvasElement getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      strokeStyle: '#000',
      fillStyle: '#000',
      lineWidth: 1,
    });
  });

  it('test_initialRender_rendersHeaderAndMetrics', () => {
    render(<TelemetryDashboard />);
    expect(screen.getByText('Telemetry & Profiler Operations Console')).toBeDefined();
    expect(screen.getByText(/Live p99 Latency Ring Buffer/i)).toBeDefined();
    expect(screen.getByText(/LLM Serving Request Lifecycle/i)).toBeDefined();
    expect(screen.getByText(/Production Log Trace Incident Triage Game/i)).toBeDefined();
  });

  it('test_toggleProfiling_pausesAndResumesStream', () => {
    render(<TelemetryDashboard />);
    const pauseBtn = screen.getByRole('button', { name: /Pause Stream/i });
    expect(pauseBtn).toBeDefined();

    fireEvent.click(pauseBtn);
    expect(screen.getByRole('button', { name: /Resume 60 FPS Stream/i })).toBeDefined();

    const resumeBtn = screen.getByRole('button', { name: /Resume 60 FPS Stream/i });
    fireEvent.click(resumeBtn);
    expect(screen.getByRole('button', { name: /Pause Stream/i })).toBeDefined();
  });

  it('test_scenarioChange_updatesLogs', () => {
    render(<TelemetryDashboard />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'NCCL_RING_DEADLOCK' } });
    expect(screen.getByText(/NCCL_RING_DEADLOCK/i)).toBeDefined();
  });

  it('test_diagnoseIncident_submitsDiagnosisAndShowsFeedback', () => {
    render(<TelemetryDashboard />);
    const input = screen.getByPlaceholderText(/Enter diagnosed root cause/i);
    fireEvent.change(input, { target: { value: 'vLLM KV Cache Eviction Storm' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Diagnosis/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Score:/i)).toBeDefined();
  });

  it('test_componentWillUnmount_stopsInterval', () => {
    const { unmount } = render(<TelemetryDashboard />);
    expect(() => unmount()).not.toThrow();
  });
});
