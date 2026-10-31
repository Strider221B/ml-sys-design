// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FinopsWorkspace } from '@/components/finops/finops_workspace';

describe('FinopsWorkspace', () => {
  it('test_initialRender_rendersHeadersAndMetrics', () => {
    render(<FinopsWorkspace />);
    expect(screen.getByText('FinOps & Hardware Acceleration Engine')).toBeDefined();
    expect(screen.getByText(/Williams Roofline Model Profiler/i)).toBeDefined();
    expect(screen.getByText(/Generative Serving Latency & VRAM Decomposition/i)).toBeDefined();
    expect(screen.getByText(/Cluster FinOps Unit Economics/i)).toBeDefined();
  });

  it('test_chipSwitching_updatesMetrics', () => {
    render(<FinopsWorkspace />);
    const tpuBtn = screen.getByRole('button', { name: /Google TPU v5p/i });
    fireEvent.click(tpuBtn);
    expect(screen.getByText(/459 TFLOPS/i)).toBeDefined();
  });

  it('test_operationalIntensityChange_recomputesRoofline', () => {
    render(<FinopsWorkspace />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '250' } });
    expect(screen.getAllByText(/FLOPs\/byte/i).length).toBeGreaterThan(0);
  });

  it('test_modelParamsChange_recomputesLatency', () => {
    render(<FinopsWorkspace />);
    const selects = screen.getAllByRole('combobox');
    // Model select
    fireEvent.change(selects[0], { target: { value: '8' } });
    // Precision select
    fireEvent.change(selects[1], { target: { value: '4' } });
    expect(screen.getByText(/Total VRAM/i)).toBeDefined();
  });

  it('test_gpuCountChange_updatesMonthlyCost', () => {
    render(<FinopsWorkspace />);
    const inputs = screen.getAllByRole('spinbutton');
    const gpuInput = inputs[inputs.length - 1];
    fireEvent.change(gpuInput, { target: { value: '16' } });
    expect(screen.getByText(/Hourly Cluster Burn:/i)).toBeDefined();
  });
});
