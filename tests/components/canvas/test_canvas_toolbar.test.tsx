// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CanvasToolbar } from '@/components/canvas/canvas_toolbar';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

describe('CanvasToolbar', () => {
  it('test_render_displaysNodeAddButtonsAndTemplateDropdown', () => {
    const onAddNode = vi.fn();
    const onLoadTemplate = vi.fn();
    const onClearCanvas = vi.fn();

    render(
      <CanvasToolbar
        activeTemplateId={CanvasConstants.TEMPLATE_HYBRID_RAG}
        onAddNode={onAddNode}
        onLoadTemplate={onLoadTemplate}
        onClearCanvas={onClearCanvas}
      />
    );

    expect(screen.getByText('Add:')).toBeDefined();
    expect(screen.getByText('+ Gateway')).toBeDefined();
    expect(screen.getByText('+ Model Worker')).toBeDefined();
    expect(screen.getByText('+ Vector DB')).toBeDefined();
    expect(screen.getByText('+ Feature Store')).toBeDefined();
    expect(screen.getByText('+ Supervisor')).toBeDefined();
    expect(screen.getByText('+ Guardrail')).toBeDefined();

    const select = screen.getByLabelText('Blueprint:') as HTMLSelectElement;
    expect(select.value).toBe(CanvasConstants.TEMPLATE_HYBRID_RAG);
  });

  it('test_onAddNode_whenButtonClicked_triggersCallbackWithNodeType', () => {
    const onAddNode = vi.fn();
    render(
      <CanvasToolbar
        activeTemplateId={null}
        onAddNode={onAddNode}
        onLoadTemplate={vi.fn()}
        onClearCanvas={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('+ Gateway'));
    expect(onAddNode).toHaveBeenCalledWith(CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY);

    fireEvent.click(screen.getByText('+ Supervisor'));
    expect(onAddNode).toHaveBeenCalledWith(CanvasConstants.NODE_TYPE_AGENT_SUPERVISOR);
  });

  it('test_templateSelectAndClear_triggersCorrespondingCallbacks', () => {
    const onLoadTemplate = vi.fn();
    const onClearCanvas = vi.fn();

    render(
      <CanvasToolbar
        activeTemplateId={null}
        onAddNode={vi.fn()}
        onLoadTemplate={onLoadTemplate}
        onClearCanvas={onClearCanvas}
      />
    );

    const select = screen.getByLabelText('Blueprint:');
    fireEvent.change(select, { target: { value: CanvasConstants.TEMPLATE_MULTI_AGENT } });
    expect(onLoadTemplate).toHaveBeenCalledWith(CanvasConstants.TEMPLATE_MULTI_AGENT);

    fireEvent.click(screen.getByText('Clear'));
    expect(onClearCanvas).toHaveBeenCalledTimes(1);
  });
});

