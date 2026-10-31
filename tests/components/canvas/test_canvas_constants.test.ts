import { describe, expect, it } from 'vitest';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

describe('CanvasConstants', () => {
  it('test_constants_initialization_exposesExpectedPaletteAndIdentifiers', () => {
    const instance = new CanvasConstants();
    expect(instance).toBeDefined();

    expect(CanvasConstants.COLOR_HEALTHY).toBe('#009E73');
    expect(CanvasConstants.COLOR_WARNING).toBe('#E69F00');
    expect(CanvasConstants.COLOR_CRITICAL).toBe('#D55E00');
    expect(CanvasConstants.COLOR_INFERENCE).toBe('#0072B2');
    expect(CanvasConstants.COLOR_STORAGE).toBe('#F0E442');
    expect(CanvasConstants.COLOR_AGENT).toBe('#CC79A7');
    expect(CanvasConstants.COLOR_CHAOS).toBe('#8B5CF6');

    expect(CanvasConstants.STATUS_OPTIMAL).toBe('OPTIMAL');
    expect(CanvasConstants.STATUS_BOTTLENECK).toBe('BOTTLENECK');
    expect(CanvasConstants.STATUS_OVERFLOW).toBe('OVERFLOW');
    expect(CanvasConstants.STATUS_CHAOS).toBe('CHAOS_TRIGGERED');

    expect(CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY).toBe('inferenceGateway');
    expect(CanvasConstants.NODE_TYPE_MODEL_WORKER).toBe('modelWorker');
    expect(CanvasConstants.NODE_TYPE_VECTOR_DATABASE).toBe('vectorDatabase');
    expect(CanvasConstants.NODE_TYPE_FEATURE_STORE).toBe('featureStore');
    expect(CanvasConstants.NODE_TYPE_AGENT_SUPERVISOR).toBe('agentSupervisor');
    expect(CanvasConstants.NODE_TYPE_SEMANTIC_GUARDRAIL).toBe('semanticGuardrail');
    expect(CanvasConstants.NODE_TYPE_AGENT_SWARM_GROUP).toBe('agentSwarmGroup');
    expect(CanvasConstants.NODE_TYPE_VLLM_CLUSTER_GROUP).toBe('vllmClusterGroup');

    expect(CanvasConstants.EDGE_TYPE_INTERACTIVE_INFRA).toBe('interactiveInfra');
    expect(CanvasConstants.DEFAULT_NODE_WIDTH).toBe(260);
    expect(CanvasConstants.DEFAULT_NODE_HEIGHT).toBe(160);
    expect(CanvasConstants.CHAOS_LATENCY_MULTIPLIER).toBe(1.4);
  });
});

