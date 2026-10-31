// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HeaderDeck } from '@/components/navigation/header_deck';
import { WorkspaceStore } from '@/core/state/workspace_store';

describe('HeaderDeck', () => {
  let store: WorkspaceStore;

  beforeEach(() => {
    vi.restoreAllMocks();
    store = new WorkspaceStore();
  });

  it('test_render_displaysBrandTitleAndAllSixTabs', () => {
    render(
      <HeaderDeck
        activeTab="CANVAS"
        onTabSelect={vi.fn()}
        onOpenAiModal={vi.fn()}
        onOpenExportModal={vi.fn()}
        onOpenHelpModal={vi.fn()}
        store={store}
      />
    );

    expect(screen.getByText('2026 Machine Learning System Design Platform')).toBeDefined();
    expect(screen.getByText('🏗️ Canvas')).toBeDefined();
    expect(screen.getByText('🎙️ AI Interview')).toBeDefined();
    expect(screen.getByText('⚡ Chaos Sandbox')).toBeDefined();
    expect(screen.getByText('📚 Curriculum')).toBeDefined();
    expect(screen.getByText('📊 Telemetry')).toBeDefined();
    expect(screen.getByText('💰 FinOps')).toBeDefined();
  });

  it('test_tabSelect_dispatchesSelectedTabIdentifier', () => {
    const onTabSelect = vi.fn();
    render(
      <HeaderDeck
        activeTab="CANVAS"
        onTabSelect={onTabSelect}
        onOpenAiModal={vi.fn()}
        onOpenExportModal={vi.fn()}
        onOpenHelpModal={vi.fn()}
        store={store}
      />
    );

    const interviewTab = screen.getByText('🎙️ AI Interview');
    fireEvent.click(interviewTab);

    expect(onTabSelect).toHaveBeenCalledWith('INTERVIEW');
  });

  it('test_modalTriggers_firesHelpAiAndExportCallbacks', () => {
    const onHelp = vi.fn();
    const onAi = vi.fn();
    const onExport = vi.fn();

    render(
      <HeaderDeck
        activeTab="CANVAS"
        onTabSelect={vi.fn()}
        onOpenAiModal={onAi}
        onOpenExportModal={onExport}
        onOpenHelpModal={onHelp}
        store={store}
      />
    );

    const helpBtn = screen.getByLabelText(/Help & Guide/i);
    fireEvent.click(helpBtn);
    expect(onHelp).toHaveBeenCalled();

    const aiBtn = screen.getByText('AI Exchange');
    fireEvent.click(aiBtn);
    expect(onAi).toHaveBeenCalled();

    const exportBtn = screen.getByText('Export IaC');
    fireEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalledWith('TERRAFORM');
  });
});
