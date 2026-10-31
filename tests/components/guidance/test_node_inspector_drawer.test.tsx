// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NodeInspectorDrawer } from '@/components/guidance/node_inspector_drawer';
import { MathConstants } from '@/core/math/math_constants';
import { InspectorNodeData } from '@/core/state/guidance_types';

describe('NodeInspectorDrawer', () => {
  const sampleNode: InspectorNodeData = {
    id: 'node_vllm_1',
    type: 'modelWorker',
    label: 'vLLM Inference Cluster',
    qps: 5000,
    batchSize: 8,
    quantizationBits: 4,
    chipId: MathConstants.CHIP_NVIDIA_H100_SXM5,
    timeoutMs: 250,
    recallAtK: 0.92,
  };

  it('test_render_whenClosedOrNoNode_rendersNothing', () => {
    const { container: closedContainer } = render(
      <NodeInspectorDrawer isOpen={false} selectedNode={sampleNode} onClose={vi.fn()} />
    );
    expect(closedContainer.firstChild).toBeNull();

    const { container: nullNodeContainer } = render(
      <NodeInspectorDrawer isOpen={true} selectedNode={null} onClose={vi.fn()} />
    );
    expect(nullNodeContainer.firstChild).toBeNull();
  });

  it('test_render_whenOpen_displaysNodeDetailsParametersAndLiveImpact', () => {
    render(<NodeInspectorDrawer isOpen={true} selectedNode={sampleNode} onClose={vi.fn()} />);

    expect(screen.getByText('vLLM Inference Cluster')).toBeDefined();
    expect(screen.getByText(/node_vllm_1/)).toBeDefined();
    expect(screen.getByText('Live Impact Preview')).toBeDefined();
    expect(screen.getByText(/Prefill TTFT/i)).toBeDefined();
    expect(screen.getByText(/Decode TPOT/i)).toBeDefined();
    expect(screen.getByText(/VRAM Delta/i)).toBeDefined();
  });

  it('test_parameterInputs_triggerUpdateNodeCallbacks', () => {
    const onUpdateNode = vi.fn();
    render(
      <NodeInspectorDrawer
        isOpen={true}
        selectedNode={sampleNode}
        onClose={vi.fn()}
        onUpdateNode={onUpdateNode}
      />
    );

    const qpsInput = screen.getByLabelText(/Ingress QPS/i);
    fireEvent.change(qpsInput, { target: { value: '8000' } });
    expect(onUpdateNode).toHaveBeenCalledWith({ qps: 8000 });

    const batchInput = screen.getByLabelText(/Batch Size/i);
    fireEvent.change(batchInput, { target: { value: '16' } });
    expect(onUpdateNode).toHaveBeenCalledWith({ batchSize: 16 });

    const int8Btn = screen.getByText('INT8');
    fireEvent.click(int8Btn);
    expect(onUpdateNode).toHaveBeenCalledWith({ quantizationBits: 8 });

    const chipSelect = screen.getByLabelText('Accelerator SKU');
    fireEvent.change(chipSelect, { target: { value: MathConstants.CHIP_AMD_MI300X } });
    expect(onUpdateNode).toHaveBeenCalledWith({ chipId: MathConstants.CHIP_AMD_MI300X });
  });

  it('test_actionButtons_fireDuplicateDisconnectAndDelete', () => {
    const onDuplicate = vi.fn();
    const onDisconnect = vi.fn();
    const onDelete = vi.fn();

    render(
      <NodeInspectorDrawer
        isOpen={true}
        selectedNode={sampleNode}
        onClose={vi.fn()}
        onDuplicateNode={onDuplicate}
        onDisconnectEdges={onDisconnect}
        onDeleteNode={onDelete}
      />
    );

    fireEvent.click(screen.getByText('Duplicate'));
    expect(onDuplicate).toHaveBeenCalledWith('node_vllm_1');

    fireEvent.click(screen.getByText('Disconnect'));
    expect(onDisconnect).toHaveBeenCalledWith('node_vllm_1');

    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('node_vllm_1');
  });

  it('test_closeActions_dismissViaCloseButtonAndEscapeKey', () => {
    const onClose = vi.fn();
    render(<NodeInspectorDrawer isOpen={true} selectedNode={sampleNode} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Close Inspector'));
    expect(onClose).toHaveBeenCalledTimes(1);

    const drawer = screen.getByRole('dialog');
    fireEvent.keyDown(drawer, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('test_minimalNode_usesFallbacksAndDefaults', () => {
    const minimalNode: InspectorNodeData = {
      id: 'node_min_1',
      type: 'gateway',
      label: 'Minimal Gateway',
      qps: 1000,
      batchSize: 1,
      quantizationBits: 16,
      chipId: '',
      timeoutMs: 100,
      promptTokens: 1024,
      outputTokens: 256,
    };

    render(<NodeInspectorDrawer isOpen={true} selectedNode={minimalNode} onClose={vi.fn()} />);

    expect(screen.getByText('Minimal Gateway')).toBeDefined();
    expect(screen.getByText(/0.88 top-k precision/i)).toBeDefined();
  });
});
