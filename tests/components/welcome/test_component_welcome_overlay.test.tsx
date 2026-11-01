// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ComponentWelcomeOverlay } from '@/components/welcome/component_welcome_overlay';
import { WelcomeConstants } from '@/components/welcome/welcome_constants';
import { WorkspaceStore } from '@/core/state/workspace_store';

describe('ComponentWelcomeOverlay', () => {
  let store: WorkspaceStore;

  beforeEach(() => {
    store = new WorkspaceStore();
  });

  it('test_render_whenClosed_returnsNull', () => {
    const { container } = render(
      <ComponentWelcomeOverlay isOpen={false} tabId="CANVAS" onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('test_render_whenOpen_rendersTitleStepsAndPrimaryAction', () => {
    render(
      <ComponentWelcomeOverlay
        isOpen={true}
        tabId="CANVAS"
        store={store}
        onClose={vi.fn()}
      />
    );

    expect(
      screen.getByText('Architecture Canvas: Visual Systems Modeling & Latency Simulation')
    ).toBeDefined();
    expect(
      screen.getByText('Enterprise Hybrid Search Retrieval-Augmented Generation (RAG)')
    ).toBeDefined();
    expect(screen.getByText('Load Mock RAG Example')).toBeDefined();
    expect(screen.getByText('5,000 QPS / 200ms timeout')).toBeDefined();
  });

  it('test_handleDismiss_whenCheckboxUnchecked_callsOnCloseWithFalse', () => {
    const onClose = vi.fn();
    render(
      <ComponentWelcomeOverlay
        isOpen={true}
        tabId="CANVAS"
        store={store}
        onClose={onClose}
      />
    );

    const dismissBtn = screen.getByText(WelcomeConstants.BTN_SKIP_GUIDE_START_BLANK);
    fireEvent.click(dismissBtn);

    expect(onClose).toHaveBeenCalledWith(false);
  });

  it('test_handleDismiss_whenCheckboxChecked_callsOnCloseWithTrue', () => {
    const onClose = vi.fn();
    render(
      <ComponentWelcomeOverlay
        isOpen={true}
        tabId="CANVAS"
        store={store}
        onClose={onClose}
      />
    );

    const checkbox = screen.getByLabelText(WelcomeConstants.CHECKBOX_DONT_SHOW_COMPONENT);
    fireEvent.click(checkbox);

    const dismissBtn = screen.getByText(WelcomeConstants.BTN_SKIP_GUIDE_START_BLANK);
    fireEvent.click(dismissBtn);

    expect(onClose).toHaveBeenCalledWith(true);
  });

  it('test_executeAction_dispatchesToStoreAndCallsCallbacks', async () => {
    const onClose = vi.fn();
    const onExecuteAction = vi.fn();

    render(
      <ComponentWelcomeOverlay
        isOpen={true}
        tabId="CANVAS"
        store={store}
        onClose={onClose}
        onExecuteAction={onExecuteAction}
      />
    );

    const actionBtn = screen.getByText('Load Mock RAG Example');
    await act(async () => {
      fireEvent.click(actionBtn);
    });

    expect(onExecuteAction).toHaveBeenCalledWith({ actionType: 'LOAD_CANVAS_RAG' });
    expect(onClose).toHaveBeenCalledWith(false);
    expect(store.getState().currentWorkspace.nodes.length).toBeGreaterThan(0);
  });

  it('test_render_forChaosTab_rendersBurstAttackDetails', () => {
    render(
      <ComponentWelcomeOverlay
        isOpen={true}
        tabId="CHAOS"
        store={store}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Simulate This Burst Attack')).toBeDefined();
    expect(screen.getByText('12,000 QPS burst')).toBeDefined();
  });
});

