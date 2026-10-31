import { InterviewConstants } from '@/core/interview/interview_constants';
import { WorkspaceEdge, WorkspaceNode } from '@/core/state/workspace_types';

export interface CanvasGraphNodeSummary {
  id: string;
  type: string;
  label: string;
  hardware?: string | undefined;
  qps?: number | undefined;
}

export interface CanvasGraphEdgeSummary {
  id: string;
  source: string;
  target: string;
  protocol?: string | undefined;
}

export interface CanvasGraphPayload {
  nodes: CanvasGraphNodeSummary[];
  edges: CanvasGraphEdgeSummary[];
}

export interface MultimodalEvaluationPayload {
  stepNumber: number;
  stepName: string;
  stepTitle: string;
  spokenTranscript: string;
  canvasTopologySummary: string;
  rawGraph: CanvasGraphPayload;
  additionalContext?: Record<string, unknown> | undefined;
}

/**
 * Combines spoken voice transcripts and visual whiteboard DAG topologies into multimodal evaluation context.
 */
export class MultimodalInputProcessor {
  private static readonly _EMPTY_STRING = '';
  private static readonly _NEWLINE = '\n';
  private static readonly _BULLET = '- ';
  private static readonly _ARROW = ' -> ';
  private static readonly _NO_TRANSCRIPT = '(No spoken commentary provided)';
  private static readonly _NO_NODES = '(No architectural nodes on whiteboard)';
  private static readonly _NO_EDGES = '(No interconnecting edges defined)';

  public constructor() {}

  /**
   * Packages candidate spoken commentary, canvas graph state, and active step into evaluation payload.
   */
  public buildEvaluationPayload(
    stepIndex: number,
    spokenTranscript: string,
    nodes: WorkspaceNode[],
    edges: WorkspaceEdge[],
    additionalContext?: Record<string, unknown>
  ): MultimodalEvaluationPayload {
    const safeIndex = Math.max(0, Math.min(stepIndex, InterviewConstants.MAX_STEP_INDEX));
    const stepNumber = safeIndex + 1;
    const stepName = InterviewConstants.STEPS[safeIndex] ?? InterviewConstants.STEP_1_CLARIFYING_REQUIREMENTS;
    const stepTitle = InterviewConstants.STEP_TITLES[safeIndex] ?? MultimodalInputProcessor._EMPTY_STRING;
    const rawGraph = this._serializeRawGraph(nodes, edges);
    const canvasTopologySummary = this.formatTopologySummary(nodes, edges);

    return {
      stepNumber,
      stepName,
      stepTitle,
      spokenTranscript: spokenTranscript.trim() || MultimodalInputProcessor._NO_TRANSCRIPT,
      canvasTopologySummary,
      rawGraph,
      additionalContext,
    };
  }

  /**
   * Generates concise textual summary of whiteboard node infrastructure and edge protocols.
   */
  public formatTopologySummary(nodes: WorkspaceNode[], edges: WorkspaceEdge[]): string {
    const nodeLines = this._formatNodeSummaries(nodes);
    const edgeLines = this._formatEdgeSummaries(edges);
    return `### Canvas Topology (Nodes: ${nodes.length}, Edges: ${edges.length})\n\nNodes:\n${nodeLines}\n\nInterconnects:\n${edgeLines}`;
  }

  /**
   * Constructs prompt string ready for LLM grading and rubric evaluation.
   */
  public buildCandidatePrompt(payload: MultimodalEvaluationPayload): string {
    const header = `Evaluation for Step ${payload.stepNumber}: ${payload.stepTitle} (${payload.stepName})`;
    const transcriptSec = `### Candidate Spoken Explanation:\n${payload.spokenTranscript}`;
    const topologySec = payload.canvasTopologySummary;
    return `${header}\n\n${transcriptSec}\n\n${topologySec}`;
  }

  private _serializeRawGraph(nodes: WorkspaceNode[], edges: WorkspaceEdge[]): CanvasGraphPayload {
    const nodeSummaries: CanvasGraphNodeSummary[] = nodes.map((node) => ({
      id: node.id,
      type: node.type,
      label: node.data.label,
      hardware: node.data.hardwareProfile,
      qps: node.data.metrics?.qps,
    }));

    const edgeSummaries: CanvasGraphEdgeSummary[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      protocol: edge.protocol,
    }));

    return { nodes: nodeSummaries, edges: edgeSummaries };
  }

  private _formatNodeSummaries(nodes: WorkspaceNode[]): string {
    if (nodes.length === 0) return MultimodalInputProcessor._NO_NODES;
    return nodes
      .map((n) => {
        const hw = n.data.hardwareProfile ? ` [HW: ${n.data.hardwareProfile}]` : MultimodalInputProcessor._EMPTY_STRING;
        return `${MultimodalInputProcessor._BULLET}${n.data.label} (${n.type}, id: ${n.id})${hw}`;
      })
      .join(MultimodalInputProcessor._NEWLINE);
  }

  private _formatEdgeSummaries(edges: WorkspaceEdge[]): string {
    if (edges.length === 0) return MultimodalInputProcessor._NO_EDGES;
    return edges
      .map((e) => `${MultimodalInputProcessor._BULLET}${e.source}${MultimodalInputProcessor._ARROW}${e.target} [${e.protocol}]`)
      .join(MultimodalInputProcessor._NEWLINE);
  }
}
