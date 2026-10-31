// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { InferenceGatewayNode } from '@/components/canvas/nodes/inference_gateway_node';
import { ModelWorkerNode } from '@/components/canvas/nodes/model_worker_node';
import { VectorDatabaseNode } from '@/components/canvas/nodes/vector_database_node';
import { FeatureStoreNode } from '@/components/canvas/nodes/feature_store_node';
import { AgentSupervisorNode } from '@/components/canvas/nodes/agent_supervisor_node';
import { SemanticGuardrailNode } from '@/components/canvas/nodes/semantic_guardrail_node';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

describe('CustomInfrastructureNodes', () => {
  const baseNodeProps = {
    id: 'test_node_id',
    type: 'custom',
    selected: false,
    zIndex: 1,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
    draggable: true,
    selectable: true,
    deletable: true,
  };

  it('test_inferenceGatewayNode_rendersAllStatuses', () => {
    const statuses = [
      CanvasConstants.STATUS_OPTIMAL,
      CanvasConstants.STATUS_BOTTLENECK,
      CanvasConstants.STATUS_OVERFLOW,
      CanvasConstants.STATUS_CHAOS,
    ];

    for (const status of statuses) {
      const { unmount } = render(
        <ReactFlowProvider>
          <InferenceGatewayNode
            {...baseNodeProps}
            selected={status === CanvasConstants.STATUS_OPTIMAL}
            data={{
              label: 'Ingress GW',
              rateLimitQps: 10000,
              timeoutMs: 150,
              qps: 8500,
              p99LatencyMs: 18.2,
              status,
            }}
          />
        </ReactFlowProvider>
      );
      expect(screen.getByText('Ingress GW')).toBeDefined();
      unmount();
    }
  });

  it('test_modelWorkerNode_rendersAllStatuses', () => {
    const statuses = [
      CanvasConstants.STATUS_OPTIMAL,
      CanvasConstants.STATUS_BOTTLENECK,
      CanvasConstants.STATUS_OVERFLOW,
      CanvasConstants.STATUS_CHAOS,
    ];

    for (const status of statuses) {
      const { unmount } = render(
        <ReactFlowProvider>
          <ModelWorkerNode
            {...baseNodeProps}
            selected={true}
            data={{
              label: 'LLM Engine',
              modelName: 'DeepSeek-R1',
              hardwareSku: '8x B200',
              quantization: 'FP8',
              vramUsedGb: 140,
              vramTotalGb: 192,
              ttftMs: 45.0,
              tpotMs: 8.5,
              status,
            }}
          />
        </ReactFlowProvider>
      );
      expect(screen.getByText('LLM Engine (DeepSeek-R1)')).toBeDefined();
      unmount();
    }
  });

  it('test_vectorDatabaseNode_rendersAllStatuses', () => {
    const statuses = [
      CanvasConstants.STATUS_OPTIMAL,
      CanvasConstants.STATUS_BOTTLENECK,
      CanvasConstants.STATUS_OVERFLOW,
      CanvasConstants.STATUS_CHAOS,
    ];

    for (const status of statuses) {
      const { unmount } = render(
        <ReactFlowProvider>
          <VectorDatabaseNode
            {...baseNodeProps}
            data={{
              label: 'Milvus Cluster',
              indexType: 'IVF_FLAT',
              dimension: 768,
              shardCount: 8,
              topKRecallPct: 99.1,
              memoryGb: 64,
              status,
            }}
          />
        </ReactFlowProvider>
      );
      expect(screen.getByText('Milvus Cluster')).toBeDefined();
      unmount();
    }
  });

  it('test_featureStoreNode_rendersAllStatusesAndDisabledStreaming', () => {
    const statuses = [
      CanvasConstants.STATUS_OPTIMAL,
      CanvasConstants.STATUS_BOTTLENECK,
      CanvasConstants.STATUS_OVERFLOW,
      CanvasConstants.STATUS_CHAOS,
    ];

    for (const status of statuses) {
      const { unmount } = render(
        <ReactFlowProvider>
          <FeatureStoreNode
            {...baseNodeProps}
            data={{
              label: 'Online Redis Store',
              storageBackend: 'Redis Cluster',
              p99ReadLatencyMs: 0.9,
              ttlSeconds: 3600,
              streamingIngestion: false,
              status,
            }}
          />
        </ReactFlowProvider>
      );
      expect(screen.getByText('Disabled')).toBeDefined();
      unmount();
    }
  });

  it('test_agentSupervisorNode_rendersAllStatuses', () => {
    const statuses = [
      CanvasConstants.STATUS_OPTIMAL,
      CanvasConstants.STATUS_BOTTLENECK,
      CanvasConstants.STATUS_OVERFLOW,
      CanvasConstants.STATUS_CHAOS,
    ];

    for (const status of statuses) {
      const { unmount } = render(
        <ReactFlowProvider>
          <AgentSupervisorNode
            {...baseNodeProps}
            data={{
              label: 'Autonomous Lead',
              maxCycles: 8,
              consensusThreshold: 0.95,
              circuitBreakerStatus: 'TRIPPED',
              workerCount: 5,
              status,
            }}
          />
        </ReactFlowProvider>
      );
      expect(screen.getByText('Autonomous Lead')).toBeDefined();
      unmount();
    }
  });

  it('test_semanticGuardrailNode_rendersAllStatusesAndDisabledPii', () => {
    const statuses = [
      CanvasConstants.STATUS_OPTIMAL,
      CanvasConstants.STATUS_BOTTLENECK,
      CanvasConstants.STATUS_OVERFLOW,
      CanvasConstants.STATUS_CHAOS,
    ];

    for (const status of statuses) {
      const { unmount } = render(
        <ReactFlowProvider>
          <SemanticGuardrailNode
            {...baseNodeProps}
            data={{
              label: 'Safety Firewall',
              guardrailModel: 'NeMo-Guardrails',
              toxicityThreshold: 0.9,
              piiMasking: false,
              latencyOverheadMs: 15.0,
              status,
            }}
          />
        </ReactFlowProvider>
      );
      expect(screen.getByText('Disabled')).toBeDefined();
      unmount();
    }
  });
});
