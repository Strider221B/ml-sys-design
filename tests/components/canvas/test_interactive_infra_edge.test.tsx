// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Position } from '@xyflow/react';
import { InteractiveInfraEdge } from '@/components/canvas/edges/interactive_infra_edge';

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@xyflow/react');
  return {
    ...actual,
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="edge-label-container">{children}</div>
    ),
  };
});

describe('InteractiveInfraEdge', () => {
  const baseProps = {
    id: 'edge_test_1',
    source: 'node_1',
    target: 'node_2',
    sourceX: 100,
    sourceY: 100,
    targetX: 300,
    targetY: 100,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    animated: false,
    selected: false,
  };

  it('test_render_displaysProtocolAndLatencyBadges', () => {
    render(
      <svg>
        <InteractiveInfraEdge
          {...baseProps}
          data={{
            protocol: 'gRPC',
            latencyMs: 0.8,
            qps: 1500,
            isChaosInjected: false,
          }}
        />
      </svg>
    );

    expect(screen.getByText(/gRPC \(0.8ms\) · 1500 QPS/)).toBeDefined();
    expect(screen.getByText('⚡ Chaos')).toBeDefined();
  });

  it('test_render_whenDefaultData_rendersFallbackMetrics', () => {
    render(
      <svg>
        <InteractiveInfraEdge {...baseProps} data={{}} />
      </svg>
    );

    expect(screen.getByText(/gRPC \(0.4ms\)/)).toBeDefined();
    expect(screen.getByText('⚡ Chaos')).toBeDefined();
  });

  it('test_chaosButton_whenClicked_callsOnInjectChaosCallback', () => {
    const onChaos = vi.fn();
    render(
      <svg>
        <InteractiveInfraEdge
          {...baseProps}
          data={{
            protocol: 'REST',
            latencyMs: 1.2,
            isChaosInjected: false,
            onInjectChaos: onChaos,
          }}
        />
      </svg>
    );

    const chaosBtn = screen.getByRole('button', {
      name: 'Inject chaos fault on connection edge_test_1',
    });
    fireEvent.click(chaosBtn);

    expect(onChaos).toHaveBeenCalledWith('edge_test_1');
  });

  it('test_render_whenChaosInjected_showsDegradedBadge', () => {
    render(
      <svg>
        <InteractiveInfraEdge
          {...baseProps}
          data={{
            protocol: 'KAFKA',
            latencyMs: 3.5,
            isChaosInjected: true,
          }}
        />
      </svg>
    );

    expect(screen.getByText('💥 Degraded')).toBeDefined();
  });
});
