// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ArchitectureCanvas } from '@/components/canvas/architecture_canvas';
import { WorkspaceStore } from '@/core/state/workspace_store';
import { SimWorkerController } from '@/workers/sim_worker_controller';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

describe('ArchitectureCanvas', () => {
  beforeEach(() => {
    global.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  });

  it('test_render_initializesWithDefaultHybridRagTemplate', () => {
    const store = new WorkspaceStore();
    render(<ArchitectureCanvas store={store} />);

    expect(screen.getByTestId('architecture-canvas-flow')).toBeDefined();
    expect(screen.getByText('Hybrid Search RAG')).toBeDefined();
  });

  it('test_addNode_appendsNewNodeToCanvas', async () => {
    const onGraphChange = vi.fn();
    render(<ArchitectureCanvas onGraphChange={onGraphChange} initialNodes={[]} initialEdges={[]} />);

    const addWorkerBtn = screen.getByText('+ Model Worker');
    fireEvent.click(addWorkerBtn);

    await waitFor(() => {
      expect(onGraphChange).toHaveBeenCalled();
    });
  });

  it('test_loadTemplate_switchesArchitectureTopology', async () => {
    const store = new WorkspaceStore();
    const updateSpy = vi.spyOn(store, 'updateCanvas');

    render(<ArchitectureCanvas store={store} initialNodes={[]} initialEdges={[]} />);

    const select = screen.getByLabelText('Blueprint:');
    fireEvent.change(select, { target: { value: CanvasConstants.TEMPLATE_MULTI_AGENT } });

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  it('test_clearCanvas_removesAllNodesAndEdges', async () => {
    const store = new WorkspaceStore();
    render(<ArchitectureCanvas store={store} />);

    const clearBtn = screen.getByText('Clear');
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(store.getState().currentWorkspace.nodes.length).toBe(0);
    });
  });

  it('test_keyboardNavigation_handlesDeleteKey', async () => {
    let canvasRef: ArchitectureCanvas | null = null;
    render(
      <ArchitectureCanvas
        ref={(ref) => {
          canvasRef = ref;
        }}
        initialNodes={[
          {
            id: 'node_del',
            type: CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY,
            position: { x: 0, y: 0 },
            data: { label: 'Deletable Node' },
          },
        ]}
        initialEdges={[]}
      />
    );

    expect(canvasRef).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (canvasRef as any)._handleDeleteNode('node_del');

    await waitFor(() => {
      expect(canvasRef!.state.nodes.length).toBe(0);
    });
  });

  it('test_validationError_displaysErrorBannerWhenCycleInjected', async () => {
    let canvasRef: ArchitectureCanvas | null = null;
    render(
      <ArchitectureCanvas
        ref={(ref) => {
          canvasRef = ref;
        }}
        initialNodes={[]}
        initialEdges={[]}
      />
    );

    expect(canvasRef).not.toBeNull();
    const cycleNodes = [
      { id: 'a', type: CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY, position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: CanvasConstants.NODE_TYPE_MODEL_WORKER, position: { x: 100, y: 0 }, data: {} },
    ];
    const cycleEdges = [
      { id: 'e1', source: 'a', target: 'b', type: CanvasConstants.EDGE_TYPE_INTERACTIVE_INFRA },
      { id: 'e2', source: 'b', target: 'a', type: CanvasConstants.EDGE_TYPE_INTERACTIVE_INFRA },
    ];

    canvasRef!.setState({ nodes: cycleNodes, edges: cycleEdges });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (canvasRef as any)._validateAndSync(cycleNodes, cycleEdges);

    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.getAllByText(/Directed cycle detected/).length).toBeGreaterThan(0);
  });

  it('test_simWorkerEvaluation_updatesNodeStatusOnBottleneck', async () => {
    const mockSimWorker = new SimWorkerController();
    vi.spyOn(mockSimWorker, 'evaluateGraph').mockResolvedValue({
      p50LatencyMs: 120,
      p99LatencyMs: 250,
      ttftMs: 50,
      tpotMs: 10,
      monthlyCostUSD: 4000,
      memoryVramGB: 70,
      unstableNodes: ['unstable_node'],
      bottlenecks: [{ nodeId: 'bottleneck_node', reason: 'QUEUE_SATURATION' }],
      executionDurationMs: 5,
    });

    let canvasRef: ArchitectureCanvas | null = null;
    render(
      <ArchitectureCanvas
        ref={(ref) => {
          canvasRef = ref;
        }}
        simWorker={mockSimWorker}
        initialNodes={[
          { id: 'unstable_node', type: CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY, position: { x: 0, y: 0 }, data: {} },
          { id: 'bottleneck_node', type: CanvasConstants.NODE_TYPE_MODEL_WORKER, position: { x: 100, y: 0 }, data: {} },
        ]}
        initialEdges={[]}
      />
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (canvasRef as any)._dispatchSimEvaluation(canvasRef!.state.nodes, []);

    await waitFor(() => {
      const unstable = canvasRef!.state.nodes.find((n) => n.id === 'unstable_node');
      const bottleneck = canvasRef!.state.nodes.find((n) => n.id === 'bottleneck_node');
      expect(unstable?.data.status).toBe(CanvasConstants.STATUS_OVERFLOW);
      expect(bottleneck?.data.status).toBe(CanvasConstants.STATUS_BOTTLENECK);
    });
  });

  it('test_chaosInjection_togglesEdgeLatencyAndMultiplier', async () => {
    let canvasRef: ArchitectureCanvas | null = null;
    render(
      <ArchitectureCanvas
        ref={(ref) => {
          canvasRef = ref;
        }}
        initialNodes={[
          { id: 'n1', type: CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY, position: { x: 0, y: 0 }, data: {} },
          { id: 'n2', type: CanvasConstants.NODE_TYPE_MODEL_WORKER, position: { x: 100, y: 0 }, data: {} },
        ]}
        initialEdges={[
          {
            id: 'edge_chaos_1',
            source: 'n1',
            target: 'n2',
            type: CanvasConstants.EDGE_TYPE_INTERACTIVE_INFRA,
            data: { latencyMs: 1.0, isChaosInjected: false },
          },
        ]}
      />
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (canvasRef as any)._handleInjectChaos('edge_chaos_1');

    await waitFor(() => {
      const edge = canvasRef!.state.edges.find((e) => e.id === 'edge_chaos_1');
      expect(edge?.data?.isChaosInjected).toBe(true);
      expect(edge?.data?.latencyMs).toBeCloseTo(1.4);
    });
  });

  it('test_connectionValidation_handlesVariousScenarios', () => {
    let canvasRef: ArchitectureCanvas | null = null;
    render(
      <ArchitectureCanvas
        ref={(ref) => {
          canvasRef = ref;
        }}
        initialNodes={[
          { id: 'gw1', type: CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY, position: { x: 0, y: 0 }, data: {} },
          { id: 'gw2', type: CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY, position: { x: 50, y: 0 }, data: {} },
          { id: 'worker', type: CanvasConstants.NODE_TYPE_MODEL_WORKER, position: { x: 100, y: 0 }, data: {} },
        ]}
        initialEdges={[]}
      />
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const helper = canvasRef as any;
    expect(helper._handleIsValidConnection({ source: '', target: 'worker' })).toBe(false);
    expect(helper._handleIsValidConnection({ source: 'gw1', target: '' })).toBe(false);
    expect(helper._handleIsValidConnection({ source: 'gw1', target: 'gw1' })).toBe(false);
    expect(helper._handleIsValidConnection({ source: 'gw1', target: 'gw2' })).toBe(false);
    expect(helper._handleIsValidConnection({ source: 'gw1', target: 'worker' })).toBe(true);
    expect(helper._handleIsValidConnection({ source: 'unknown_a', target: 'unknown_b' })).toBe(true);
  });

  it('test_handleConnect_addsValidEdgeAndRejectsInvalid', async () => {
    let canvasRef: ArchitectureCanvas | null = null;
    render(
      <ArchitectureCanvas
        ref={(ref) => {
          canvasRef = ref;
        }}
        initialNodes={[
          { id: 'n1', type: CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY, position: { x: 0, y: 0 }, data: {} },
          { id: 'n2', type: CanvasConstants.NODE_TYPE_MODEL_WORKER, position: { x: 100, y: 0 }, data: {} },
        ]}
        initialEdges={[]}
      />
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const helper = canvasRef as any;
    helper._handleConnect({ source: 'n1', target: 'n1' });
    expect(canvasRef!.state.edges.length).toBe(0);

    helper._handleConnect({ source: 'n1', target: 'n2' });
    await waitFor(() => {
      expect(canvasRef!.state.edges.length).toBe(1);
    });
  });

  it('test_typeResolvers_coverAllWorkspaceAndFlowTypes', () => {
    let canvasRef: ArchitectureCanvas | null = null;
    render(
      <ArchitectureCanvas
        ref={(ref) => {
          canvasRef = ref;
        }}
        initialNodes={[]}
        initialEdges={[]}
      />
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const helper = canvasRef as any;
    expect(helper._resolveWorkspaceNodeType(CanvasConstants.NODE_TYPE_MODEL_WORKER)).toBe('VLLM_INFERENCE_ENGINE');
    expect(helper._resolveWorkspaceNodeType(CanvasConstants.NODE_TYPE_VECTOR_DATABASE)).toBe('VECTOR_DATABASE');
    expect(helper._resolveWorkspaceNodeType(CanvasConstants.NODE_TYPE_FEATURE_STORE)).toBe('FEATURE_STORE');
    expect(helper._resolveWorkspaceNodeType(CanvasConstants.NODE_TYPE_AGENT_SUPERVISOR)).toBe('AGENT_ORCHESTRATOR');
    expect(helper._resolveWorkspaceNodeType(CanvasConstants.NODE_TYPE_AGENT_SWARM_GROUP)).toBe('AGENT_ORCHESTRATOR');
    expect(helper._resolveWorkspaceNodeType(CanvasConstants.NODE_TYPE_SEMANTIC_GUARDRAIL)).toBe('SAFETY_GUARDRAIL');
    expect(helper._resolveWorkspaceNodeType('unknown')).toBe('INGRESS_GATEWAY');

    expect(helper._resolveFlowNodeType('VLLM_INFERENCE_ENGINE')).toBe(CanvasConstants.NODE_TYPE_MODEL_WORKER);
    expect(helper._resolveFlowNodeType('VECTOR_DATABASE')).toBe(CanvasConstants.NODE_TYPE_VECTOR_DATABASE);
    expect(helper._resolveFlowNodeType('FEATURE_STORE')).toBe(CanvasConstants.NODE_TYPE_FEATURE_STORE);
    expect(helper._resolveFlowNodeType('AGENT_ORCHESTRATOR')).toBe(CanvasConstants.NODE_TYPE_AGENT_SUPERVISOR);
    expect(helper._resolveFlowNodeType('SAFETY_GUARDRAIL')).toBe(CanvasConstants.NODE_TYPE_SEMANTIC_GUARDRAIL);
    expect(helper._resolveFlowNodeType('INGRESS_GATEWAY')).toBe(CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY);
  });

  it('test_nodesAndEdgesChangeHandlers_andKeyboardConnect', async () => {
    let canvasRef: ArchitectureCanvas | null = null;
    render(
      <ArchitectureCanvas
        ref={(ref) => {
          canvasRef = ref;
        }}
        initialNodes={[{ id: 'n1', position: { x: 0, y: 0 }, data: {} }]}
        initialEdges={[]}
      />
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const helper = canvasRef as any;
    helper._handleSelectNode('n1');
    await waitFor(() => {
      expect(canvasRef!.state.selectedNodeId).toBe('n1');
    });

    helper._handleKeyboardConnect('n1', 'n2');
    helper._handleKeyDown({
      nativeEvent: new KeyboardEvent('keydown', { key: 'Tab' }),
    });

    expect(canvasRef!.state.selectedNodeId).toBe('n1');
  });

  it('test_simWorkerEvaluation_whenWorkerThrows_handlesGracefully', async () => {
    const errorWorker = new SimWorkerController();
    vi.spyOn(errorWorker, 'evaluateGraph').mockRejectedValue(new Error('Sim worker crashed'));

    let canvasRef: ArchitectureCanvas | null = null;
    render(
      <ArchitectureCanvas
        ref={(ref) => {
          canvasRef = ref;
        }}
        simWorker={errorWorker}
        initialNodes={[{ id: 'node_err', position: { x: 0, y: 0 }, data: {} }]}
        initialEdges={[]}
      />
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (canvasRef as any)._dispatchSimEvaluation(canvasRef!.state.nodes, []);
    // Does not crash
    expect(canvasRef!.state.nodes.length).toBe(1);
  });
});
