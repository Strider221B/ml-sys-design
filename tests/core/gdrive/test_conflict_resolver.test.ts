import { describe, expect, it } from 'vitest';
import { ConflictResolver } from '@/core/gdrive/conflict_resolver';
import {
  WorkspaceDocument,
  WorkspaceEdge,
  WorkspaceNode,
} from '@/core/state/workspace_types';

describe('ConflictResolver', () => {
  const resolver = new ConflictResolver();

  const createNode = (id: string, label: string): WorkspaceNode => ({
    id,
    type: 'FEATURE_STORE',
    position: { x: 0, y: 0 },
    data: { label },
  });

  const createEdge = (
    id: string,
    source: string,
    target: string,
    protocol: 'GRPC' | 'REST' = 'GRPC'
  ): WorkspaceEdge => ({
    id,
    source,
    target,
    protocol,
  });

  const createDoc = (
    nodes: WorkspaceNode[],
    edges: WorkspaceEdge[],
    etag = 'etag_default'
  ): WorkspaceDocument => ({
    workspaceId: 'ws_test',
    title: 'Test Workspace',
    lastModifiedIso: '2026-10-31T00:00:00.000Z',
    etag,
    activeModuleId: 'SANDBOX_BUILDER',
    activeScenarioId: null,
    nodes,
    edges,
  });

  it('test_resolve_withDisjointNodesAndEdges_autoMergesSuccessfully', () => {
    const local = createDoc([createNode('n1', 'Node 1')], [createEdge('e1', 'n1', 'n2')]);
    const remote = createDoc(
      [createNode('n2', 'Node 2')],
      [createEdge('e2', 'n2', 'n3')],
      'etag_remote'
    );

    const result = resolver.resolve(local, remote);

    expect(result.hasConflict).toBe(false);
    expect(result.resolutionStrategy).toBe('AUTO_MERGE');
    expect(result.conflictingNodeIds).toHaveLength(0);
    expect(result.conflictingEdgeIds).toHaveLength(0);
    expect(result.mergedDocument.nodes).toHaveLength(2);
    expect(result.mergedDocument.edges).toHaveLength(2);
    expect(result.mergedDocument.etag).toBe('etag_remote');
  });

  it('test_resolve_withIdenticalNodesAndEdges_autoMerges', () => {
    const local = createDoc([createNode('n1', 'Node 1')], [createEdge('e1', 'n1', 'n2')]);
    const remote = createDoc([createNode('n1', 'Node 1')], [createEdge('e1', 'n1', 'n2')]);

    const result = resolver.resolve(local, remote);

    expect(result.hasConflict).toBe(false);
    expect(result.mergedDocument.nodes).toHaveLength(1);
    expect(result.mergedDocument.edges).toHaveLength(1);
  });

  it('test_resolve_withConflictingNodeData_flagsConflictAndRequiresManual', () => {
    const local = createDoc([createNode('n1', 'Local Label')], []);
    const remote = createDoc([createNode('n1', 'Remote Label')], []);

    const result = resolver.resolve(local, remote);

    expect(result.hasConflict).toBe(true);
    expect(result.resolutionStrategy).toBe('MANUAL_REQUIRED');
    expect(result.conflictingNodeIds).toContain('n1');
  });

  it('test_resolve_withConflictingEdgeData_flagsConflictAndRequiresManual', () => {
    const local = createDoc([], [createEdge('e1', 'n1', 'n2', 'GRPC')]);
    const remote = createDoc([], [createEdge('e1', 'n1', 'n2', 'REST')]);

    const result = resolver.resolve(local, remote);

    expect(result.hasConflict).toBe(true);
    expect(result.resolutionStrategy).toBe('MANUAL_REQUIRED');
    expect(result.conflictingEdgeIds).toContain('e1');
  });

  it('test_forceLocal_updatesEtagAndPreservesLocalDoc', () => {
    const local = createDoc([createNode('n1', 'Local Only')], [], 'old_etag');
    const forced = resolver.forceLocal(local, 'new_remote_etag');

    expect(forced.etag).toBe('new_remote_etag');
    expect(forced.nodes).toHaveLength(1);
  });

  it('test_acceptRemote_clonesRemoteDocument', () => {
    const remote = createDoc([createNode('n_remote', 'Remote Only')], [], 'remote_etag');
    const accepted = resolver.acceptRemote(remote);

    expect(accepted.etag).toBe('remote_etag');
    expect(accepted.nodes[0]?.id).toBe('n_remote');
  });
});

