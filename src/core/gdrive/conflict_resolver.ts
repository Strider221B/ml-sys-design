import {
  WorkspaceDocument,
  WorkspaceEdge,
  WorkspaceNode,
} from '@/core/state/workspace_types';

export interface MergeResult {
  hasConflict: boolean;
  mergedDocument: WorkspaceDocument;
  conflictingNodeIds: string[];
  conflictingEdgeIds: string[];
  resolutionStrategy: 'AUTO_MERGE' | 'MANUAL_REQUIRED';
}

/**
 * Three-way/two-way AST merge resolver for concurrent Google Drive updates on HTTP 412.
 */
export class ConflictResolver {
  private static readonly _STRATEGY_AUTO = 'AUTO_MERGE';
  private static readonly _STRATEGY_MANUAL = 'MANUAL_REQUIRED';

  public constructor() {}

  /**
   * Evaluates local vs remote workspace document deltas and produces merged document.
   */
  public resolve(
    localDoc: WorkspaceDocument,
    remoteDoc: WorkspaceDocument
  ): MergeResult {
    const nodeMerge = this._mergeNodes(localDoc.nodes, remoteDoc.nodes);
    const edgeMerge = this._mergeEdges(localDoc.edges, remoteDoc.edges);

    const hasConflict =
      nodeMerge.conflicts.length > 0 || edgeMerge.conflicts.length > 0;
    const strategy = hasConflict
      ? ConflictResolver._STRATEGY_MANUAL
      : ConflictResolver._STRATEGY_AUTO;

    const mergedDoc = this._assembleMergedDocument(
      localDoc,
      remoteDoc,
      nodeMerge.nodes,
      edgeMerge.edges
    );

    return {
      hasConflict,
      mergedDocument: mergedDoc,
      conflictingNodeIds: nodeMerge.conflicts,
      conflictingEdgeIds: edgeMerge.conflicts,
      resolutionStrategy: strategy,
    };
  }

  /**
   * Forces local version to overwrite remote by adopting remote ETag.
   */
  public forceLocal(
    localDoc: WorkspaceDocument,
    remoteEtag: string
  ): WorkspaceDocument {
    return {
      ...localDoc,
      etag: remoteEtag,
      lastModifiedIso: new Date().toISOString(),
    };
  }

  /**
   * Discards local modifications and adopts remote document in full.
   */
  public acceptRemote(remoteDoc: WorkspaceDocument): WorkspaceDocument {
    return {
      ...remoteDoc,
      nodes: [...remoteDoc.nodes],
      edges: [...remoteDoc.edges],
    };
  }

  private _mergeNodes(
    localNodes: WorkspaceNode[],
    remoteNodes: WorkspaceNode[]
  ): { nodes: WorkspaceNode[]; conflicts: string[] } {
    const merged: WorkspaceNode[] = [];
    const conflicts: string[] = [];
    const remoteMap = new Map(remoteNodes.map((n) => [n.id, n]));
    const localMap = new Map(localNodes.map((n) => [n.id, n]));

    for (const [id, localNode] of localMap.entries()) {
      const remoteNode = remoteMap.get(id);
      if (!remoteNode) {
        merged.push(localNode);
      } else if (this._areNodesEqual(localNode, remoteNode)) {
        merged.push(localNode);
      } else {
        conflicts.push(id);
        merged.push(localNode);
      }
    }
    this._appendDisjointRemoteNodes(merged, remoteMap, localMap);
    return { nodes: merged, conflicts };
  }

  private _appendDisjointRemoteNodes(
    merged: WorkspaceNode[],
    remoteMap: Map<string, WorkspaceNode>,
    localMap: Map<string, WorkspaceNode>
  ): void {
    for (const [id, remoteNode] of remoteMap.entries()) {
      if (!localMap.has(id)) {
        merged.push(remoteNode);
      }
    }
  }

  private _mergeEdges(
    localEdges: WorkspaceEdge[],
    remoteEdges: WorkspaceEdge[]
  ): { edges: WorkspaceEdge[]; conflicts: string[] } {
    const merged: WorkspaceEdge[] = [];
    const conflicts: string[] = [];
    const remoteMap = new Map(remoteEdges.map((e) => [e.id, e]));
    const localMap = new Map(localEdges.map((e) => [e.id, e]));

    for (const [id, localEdge] of localMap.entries()) {
      const remoteEdge = remoteMap.get(id);
      if (!remoteEdge) {
        merged.push(localEdge);
      } else if (this._areEdgesEqual(localEdge, remoteEdge)) {
        merged.push(localEdge);
      } else {
        conflicts.push(id);
        merged.push(localEdge);
      }
    }
    this._appendDisjointRemoteEdges(merged, remoteMap, localMap);
    return { edges: merged, conflicts };
  }

  private _appendDisjointRemoteEdges(
    merged: WorkspaceEdge[],
    remoteMap: Map<string, WorkspaceEdge>,
    localMap: Map<string, WorkspaceEdge>
  ): void {
    for (const [id, remoteEdge] of remoteMap.entries()) {
      if (!localMap.has(id)) {
        merged.push(remoteEdge);
      }
    }
  }

  private _areNodesEqual(nodeA: WorkspaceNode, nodeB: WorkspaceNode): boolean {
    return JSON.stringify(nodeA) === JSON.stringify(nodeB);
  }

  private _areEdgesEqual(edgeA: WorkspaceEdge, edgeB: WorkspaceEdge): boolean {
    return JSON.stringify(edgeA) === JSON.stringify(edgeB);
  }

  private _assembleMergedDocument(
    localDoc: WorkspaceDocument,
    remoteDoc: WorkspaceDocument,
    nodes: WorkspaceNode[],
    edges: WorkspaceEdge[]
  ): WorkspaceDocument {
    return {
      workspaceId: localDoc.workspaceId,
      title: localDoc.title,
      lastModifiedIso: new Date().toISOString(),
      etag: remoteDoc.etag,
      activeModuleId: localDoc.activeModuleId,
      activeScenarioId: localDoc.activeScenarioId,
      nodes,
      edges,
    };
  }
}

