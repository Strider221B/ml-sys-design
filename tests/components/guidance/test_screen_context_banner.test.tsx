// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ScreenContextBanner } from '@/components/guidance/screen_context_banner';
import { WorkspaceGuidanceCatalog } from '@/components/guidance/workspace_guidance_catalog';

describe('ScreenContextBanner', () => {
  const catalog = new WorkspaceGuidanceCatalog();

  it('test_render_displaysTitleBadgeAndStepChecklistForActiveTab', () => {
    render(<ScreenContextBanner activeTab="CANVAS" catalog={catalog} />);

    expect(screen.getByText('Architecture Canvas')).toBeDefined();
    expect(screen.getByText('Visual Infrastructure & Latency Simulator')).toBeDefined();
    expect(screen.getByText('Add Components')).toBeDefined();
    expect(screen.getByText('Wire Connections')).toBeDefined();
    expect(screen.getByText('Inspect & Tune')).toBeDefined();
    expect(screen.getByText('Load Hybrid Search RAG')).toBeDefined();
  });

  it('test_render_updatesContentWhenActiveTabChanges', () => {
    const { rerender } = render(<ScreenContextBanner activeTab="CANVAS" catalog={catalog} />);
    expect(screen.getByText('Architecture Canvas')).toBeDefined();

    rerender(<ScreenContextBanner activeTab="INTERVIEW" catalog={catalog} />);
    expect(screen.getByText('AI Interview Simulator')).toBeDefined();
    expect(screen.getByText('Start Step 1: Requirements')).toBeDefined();
  });

  it('test_toggleCollapse_hidesAndShowsChecklistSteps', () => {
    render(<ScreenContextBanner activeTab="CHAOS" catalog={catalog} />);

    expect(screen.getByText('Pick Perturbation')).toBeDefined();

    const collapseBtn = screen.getByText('Collapse Guide [^]');
    fireEvent.click(collapseBtn);

    expect(screen.queryByText('Pick Perturbation')).toBeNull();
    expect(screen.getByText('Show Guide [v]')).toBeDefined();

    const expandBtn = screen.getByText('Show Guide [v]');
    fireEvent.click(expandBtn);

    expect(screen.getByText('Pick Perturbation')).toBeDefined();
  });

  it('test_defaultCollapsed_startsInCollapsedState', () => {
    render(<ScreenContextBanner activeTab="TELEMETRY" catalog={catalog} defaultCollapsed={true} />);

    expect(screen.queryByText('Inspect Waterfall')).toBeNull();
    expect(screen.getByText('Show Guide [v]')).toBeDefined();
  });

  it('test_quickActionClick_triggersCallbackWithDescriptor', () => {
    const onQuickAction = vi.fn();
    render(
      <ScreenContextBanner
        activeTab="CANVAS"
        catalog={catalog}
        onQuickAction={onQuickAction}
      />
    );

    const ragBtn = screen.getByText('Load Hybrid Search RAG');
    fireEvent.click(ragBtn);

    expect(onQuickAction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'load_rag_template',
        actionType: 'LOAD_TEMPLATE',
      })
    );
  });
});

