// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { AgentSwarmGroupNode } from '@/components/canvas/subflows/agent_swarm_group_node';
import { VllmClusterGroupNode } from '@/components/canvas/subflows/vllm_cluster_group_node';
import { CanvasConstants } from '@/components/canvas/canvas_constants';

describe('CanvasSubflowGroupNodes', () => {
  const baseNodeProps = {
    id: 'subflow_group_1',
    type: 'group',
    selected: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 50,
    positionAbsoluteY: 50,
    dragging: false,
    draggable: true,
    selectable: true,
    deletable: true,
  };

  it('test_agentSwarmGroupNode_rendersContainerWithSwarmDetails', () => {
    const { rerender } = render(
      <ReactFlowProvider>
        <AgentSwarmGroupNode
          {...baseNodeProps}
          selected={true}
          data={{
            label: 'Customer Support Swarm',
            memberCount: 6,
            consensusPolicy: 'Unanimous Agreement',
            status: CanvasConstants.STATUS_OPTIMAL,
          }}
        />
      </ReactFlowProvider>
    );

    expect(screen.getByText('Customer Support Swarm')).toBeDefined();
    expect(screen.getByText('6 agents')).toBeDefined();
    expect(screen.getByText('Policy: Unanimous Agreement')).toBeDefined();
    expect(screen.getByText('extent: parent')).toBeDefined();

    rerender(
      <ReactFlowProvider>
        <AgentSwarmGroupNode {...baseNodeProps} data={{}} />
      </ReactFlowProvider>
    );
    expect(screen.getByText('Agent Swarm Subflow')).toBeDefined();
    expect(screen.getByText('4 agents')).toBeDefined();
  });

  it('test_vllmClusterGroupNode_rendersContainerWithClusterDetails', () => {
    const { rerender } = render(
      <ReactFlowProvider>
        <VllmClusterGroupNode
          {...baseNodeProps}
          selected={true}
          data={{
            label: 'Primary GPU Inference Pod',
            replicaCount: 16,
            totalVramGb: 1280,
            parallelismMode: 'TP=8 · PP=2',
            status: CanvasConstants.STATUS_OPTIMAL,
          }}
        />
      </ReactFlowProvider>
    );

    expect(screen.getByText('Primary GPU Inference Pod')).toBeDefined();
    expect(screen.getByText('16x GPUs (1280 GB)')).toBeDefined();
    expect(screen.getByText('TP=8 · PP=2')).toBeDefined();
    expect(screen.getByText('extent: parent')).toBeDefined();

    rerender(
      <ReactFlowProvider>
        <VllmClusterGroupNode {...baseNodeProps} data={{}} />
      </ReactFlowProvider>
    );
    expect(screen.getByText('vLLM GPU Cluster')).toBeDefined();
    expect(screen.getByText('8x GPUs (640 GB)')).toBeDefined();
  });
});
