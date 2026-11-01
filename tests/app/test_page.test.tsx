// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Page from '@/app/page';

describe('Page Root Workspace', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('test_render_displaysHeaderGuidanceAndCanvasByDefault', () => {
    render(Page.renderPage());

    expect(screen.getAllByText('2026 Machine Learning System Design Platform')[0]).toBeDefined();
    expect(screen.getAllByText('Architecture Canvas')[0]).toBeDefined();
    expect(screen.getByText('Add Components')).toBeDefined();
  });

  it('test_tabSwitching_updatesActiveWorkspaceView', () => {
    render(<Page />);

    // Switch to Interview
    fireEvent.click(screen.getByText('🎙️ AI Interview'));
    expect(screen.getAllByText('AI Interview Simulator')[0]).toBeDefined();

    // Switch to Chaos
    fireEvent.click(screen.getByText('⚡ Chaos Sandbox'));
    expect(screen.getAllByText('Chaos Sandbox')[0]).toBeDefined();

    // Switch to Curriculum
    fireEvent.click(screen.getByText('📚 Curriculum'));
    expect(screen.getByText('2026 Core Curriculum')).toBeDefined();

    // Switch to Telemetry
    fireEvent.click(screen.getByText('📊 Telemetry'));
    expect(screen.getByText('Telemetry & Profiler')).toBeDefined();

    // Switch to FinOps
    fireEvent.click(screen.getByText('💰 FinOps'));
    expect(screen.getByText('FinOps Unit Economics')).toBeDefined();
  });

  it('test_quickActions_switchesToAppropriateWorkspaceTab', () => {
    render(<Page />);

    // Trigger interview quick action from Canvas banner
    const interviewActionBtn = screen.getByText('Load Hybrid Search RAG');
    fireEvent.click(interviewActionBtn);
    expect(screen.getAllByText('Architecture Canvas')[0]).toBeDefined();
  });

  it('test_modals_opensAndClosesHelpAndExportModals', async () => {
    render(<Page />);

    // Open Help modal
    const helpBtn = screen.getByLabelText(/Help & Guide/i);
    fireEvent.click(helpBtn);
    const tourBtn = screen.getByText('Take Interactive Tour');
    fireEvent.click(tourBtn);
    expect(screen.getByText('Platform Onboarding & Guide')).toBeDefined();

    // Close Help modal
    fireEvent.click(screen.getByLabelText('Close dialog'));
    expect(screen.queryByText('Platform Onboarding & Guide')).toBeNull();

    // Open Export modal
    const exportBtn = screen.getByText('Export IaC');
    await act(async () => {
      fireEvent.click(exportBtn);
    });
    expect(screen.getByText('Export Infrastructure & Portfolio')).toBeDefined();

    // Switch export tab in modal
    const k8sBtn = screen.getByText('Kubernetes YAML');
    await act(async () => {
      fireEvent.click(k8sBtn);
    });
    expect(k8sBtn.className).toContain('bg-indigo-600');

    // Copy to clipboard
    const copyBtn = screen.getByText('Copy to Clipboard');
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // Close Export modal
    fireEvent.click(screen.getByText('✕'));
    expect(screen.queryByText('Export Infrastructure & Portfolio')).toBeNull();
  });

  it('test_inspectorNodeLifecycle_handlesUpdatesDuplicatesAndDeletions', () => {
    const pageRef = React.createRef<Page>();
    render(<Page ref={pageRef} />);

    act(() => {
      pageRef.current?.setState({
        selectedNode: {
          id: 'node_test_1',
          type: 'modelWorker',
          label: 'Test Worker',
          qps: 3000,
          batchSize: 4,
          quantizationBits: 16,
          chipId: 'NVIDIA_H100_SXM5',
          timeoutMs: 300,
        },
      });
    });

    expect(screen.getByText('Test Worker')).toBeDefined();

    // Duplicate
    fireEvent.click(screen.getByText('Duplicate'));
    expect(screen.getByText('Test Worker (Copy)')).toBeDefined();

    // Delete
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.queryByText('Test Worker (Copy)')).toBeNull();
  });
});
