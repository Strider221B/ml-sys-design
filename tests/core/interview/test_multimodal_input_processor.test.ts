import { describe, expect, it } from 'vitest';
import { MultimodalInputProcessor } from '@/core/interview/multimodal_input_processor';
import { WorkspaceEdge, WorkspaceNode } from '@/core/state/workspace_types';

describe('MultimodalInputProcessor', () => {
  const sampleNodes: WorkspaceNode[] = [
    {
      id: 'node_1',
      type: 'INGRESS_GATEWAY',
      position: { x: 0, y: 0 },
      data: { label: 'API Gateway', hardwareProfile: 'NVIDIA_L4', metrics: { qps: 5000, p50LatencyMs: 2, p99LatencyMs: 10, gpuMemoryMb: 2000, costPerHourUsd: 1.5 } },
    },
    {
      id: 'node_2',
      type: 'VECTOR_DATABASE',
      position: { x: 100, y: 0 },
      data: { label: 'Milvus Cluster' },
    },
  ];

  const sampleEdges: WorkspaceEdge[] = [
    {
      id: 'edge_1',
      source: 'node_1',
      target: 'node_2',
      protocol: 'GRPC',
    },
  ];

  it('test_buildEvaluationPayload_withFullContext_createsPayload', () => {
    const processor = new MultimodalInputProcessor();
    const payload = processor.buildEvaluationPayload(
      1,
      'We use Kafka for streaming clickstream data',
      sampleNodes,
      sampleEdges,
      { candidateExperience: 'Senior' }
    );

    expect(payload.stepNumber).toBe(2);
    expect(payload.stepName).toBe('DATA_INGESTION_FEATURES');
    expect(payload.stepTitle).toContain('Data Ingestion');
    expect(payload.spokenTranscript).toBe('We use Kafka for streaming clickstream data');
    expect(payload.rawGraph.nodes).toHaveLength(2);
    expect(payload.rawGraph.edges).toHaveLength(1);
    expect(payload.additionalContext).toEqual({ candidateExperience: 'Senior' });
  });

  it('test_buildEvaluationPayload_emptyTranscript_usesFallback', () => {
    const processor = new MultimodalInputProcessor();
    const payload = processor.buildEvaluationPayload(0, '   ', [], []);

    expect(payload.spokenTranscript).toContain('No spoken commentary provided');
    expect(payload.rawGraph.nodes).toHaveLength(0);
    expect(payload.rawGraph.edges).toHaveLength(0);
  });

  it('test_buildEvaluationPayload_boundsClamping_handlesNegativeAndOverflow', () => {
    const processor = new MultimodalInputProcessor();
    const low = processor.buildEvaluationPayload(-5, 'text', [], []);
    expect(low.stepNumber).toBe(1);

    const high = processor.buildEvaluationPayload(20, 'text', [], []);
    expect(high.stepNumber).toBe(6);
  });

  it('test_formatTopologySummary_whenEmpty_returnsFallbackStrings', () => {
    const processor = new MultimodalInputProcessor();
    const summary = processor.formatTopologySummary([], []);

    expect(summary).toContain('(No architectural nodes on whiteboard)');
    expect(summary).toContain('(No interconnecting edges defined)');
  });

  it('test_formatTopologySummary_whenPopulated_includesLabelsAndProtocols', () => {
    const processor = new MultimodalInputProcessor();
    const summary = processor.formatTopologySummary(sampleNodes, sampleEdges);

    expect(summary).toContain('API Gateway');
    expect(summary).toContain('NVIDIA_L4');
    expect(summary).toContain('Milvus Cluster');
    expect(summary).toContain('node_1 -> node_2 [GRPC]');
  });

  it('test_buildCandidatePrompt_assemblesSections', () => {
    const processor = new MultimodalInputProcessor();
    const payload = processor.buildEvaluationPayload(2, 'We chose two-tower retrieval', sampleNodes, sampleEdges);
    const prompt = processor.buildCandidatePrompt(payload);

    expect(prompt).toContain('Evaluation for Step 3: Model Selection & Architecture Funnel');
    expect(prompt).toContain('We chose two-tower retrieval');
    expect(prompt).toContain('Canvas Topology (Nodes: 2, Edges: 1)');
  });
});

