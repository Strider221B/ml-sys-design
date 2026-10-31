import React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  NodeChange,
  EdgeChange,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
} from '@xyflow/react';
import { CanvasConstants } from '@/components/canvas/canvas_constants';
import { GraphTopologyValidator } from '@/components/canvas/graph_topology_validator';
import { AriaLiveAnnouncer } from '@/components/canvas/aria_live_announcer';
import { CanvasKeyboardNavigator } from '@/components/canvas/canvas_keyboard_navigator';
import { TemplateCatalog, ArchitectureTemplate } from '@/components/canvas/template_catalog';
import { CanvasToolbar } from '@/components/canvas/canvas_toolbar';
import { InteractiveInfraEdge } from '@/components/canvas/edges/interactive_infra_edge';
import { InferenceGatewayNode } from '@/components/canvas/nodes/inference_gateway_node';
import { ModelWorkerNode } from '@/components/canvas/nodes/model_worker_node';
import { VectorDatabaseNode } from '@/components/canvas/nodes/vector_database_node';
import { FeatureStoreNode } from '@/components/canvas/nodes/feature_store_node';
import { AgentSupervisorNode } from '@/components/canvas/nodes/agent_supervisor_node';
import { SemanticGuardrailNode } from '@/components/canvas/nodes/semantic_guardrail_node';
import { AgentSwarmGroupNode } from '@/components/canvas/subflows/agent_swarm_group_node';
import { VllmClusterGroupNode } from '@/components/canvas/subflows/vllm_cluster_group_node';
import { WorkspaceStore } from '@/core/state/workspace_store';
import { SimWorkerController } from '@/workers/sim_worker_controller';
import { SimulationResult, GraphNodePayload, GraphEdgePayload } from '@/workers/deterministic_sim_worker';
import { NodeType, WorkspaceEdge, WorkspaceNode } from '@/core/state/workspace_types';

export interface ArchitectureCanvasProps {
  store?: WorkspaceStore;
  simWorker?: SimWorkerController;
  validator?: GraphTopologyValidator;
  announcer?: AriaLiveAnnouncer;
  keyboardNavigator?: CanvasKeyboardNavigator;
  catalog?: TemplateCatalog;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  colorMode?: 'system' | 'dark' | 'light';
  onGraphChange?: (nodes: Node[], edges: Edge[]) => void;
}

export interface ArchitectureCanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  validationError: string | null;
  activeTemplateId: string | null;
}

/**
 * Interactive ML Architecture Canvas orchestrating custom node topologies, subflows, and telemetry.
 */
export class ArchitectureCanvas extends React.Component<ArchitectureCanvasProps, ArchitectureCanvasState> {
  private static readonly _DEFAULT_SIM_QPS = 5000;
  private static readonly _DEFAULT_EDGE_LATENCY = 0.4;
  private static readonly _DEFAULT_X = 200;
  private static readonly _DEFAULT_Y = 150;
  private static readonly _POSITION_STEP = 50;

  private static readonly _NODE_TYPES: NodeTypes = {
    [CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY]: InferenceGatewayNode,
    [CanvasConstants.NODE_TYPE_MODEL_WORKER]: ModelWorkerNode,
    [CanvasConstants.NODE_TYPE_VECTOR_DATABASE]: VectorDatabaseNode,
    [CanvasConstants.NODE_TYPE_FEATURE_STORE]: FeatureStoreNode,
    [CanvasConstants.NODE_TYPE_AGENT_SUPERVISOR]: AgentSupervisorNode,
    [CanvasConstants.NODE_TYPE_SEMANTIC_GUARDRAIL]: SemanticGuardrailNode,
    [CanvasConstants.NODE_TYPE_AGENT_SWARM_GROUP]: AgentSwarmGroupNode,
    [CanvasConstants.NODE_TYPE_VLLM_CLUSTER_GROUP]: VllmClusterGroupNode,
  };

  private static readonly _EDGE_TYPES: EdgeTypes = {
    [CanvasConstants.EDGE_TYPE_INTERACTIVE_INFRA]:
      InteractiveInfraEdge as unknown as NonNullable<EdgeTypes[string]>,
  };

  public constructor(props: ArchitectureCanvasProps) {
    super(props);
    this._validator = props.validator ?? new GraphTopologyValidator();
    this._announcer = props.announcer ?? new AriaLiveAnnouncer();
    this._catalog = props.catalog ?? new TemplateCatalog();
    this._simWorker = props.simWorker ?? new SimWorkerController();
    this._keyboardNavigator =
      props.keyboardNavigator ??
      new CanvasKeyboardNavigator({
        onSelectNode: this._handleSelectNode,
        onDeleteSelected: this._handleDeleteNode,
        onConnect: this._handleKeyboardConnect,
        onAnnounce: (msg) => this._announcer.announce(msg),
      });

    this.state = {
      nodes: props.initialNodes ?? [],
      edges: props.initialEdges ?? [],
      selectedNodeId: null,
      validationError: null,
      activeTemplateId: null,
    };
  }

  public override componentDidMount(): void {
    if (this.state.nodes.length === 0 && !this.props.initialNodes) {
      this.loadTemplate(CanvasConstants.TEMPLATE_HYBRID_RAG);
    }
  }

  public override render(): React.ReactNode {
    return (
      <div
        className="relative flex flex-col w-full h-full min-h-[600px] bg-neutral-950 text-neutral-100 select-none outline-none"
        onKeyDown={this._handleKeyDown}
        tabIndex={0}
        role="application"
        aria-label="Interactive ML Architecture Canvas"
      >
        <CanvasToolbar
          activeTemplateId={this.state.activeTemplateId}
          onAddNode={(type) => this.addNode(type)}
          onLoadTemplate={(id) => this.loadTemplate(id)}
          onClearCanvas={() => this.clearCanvas()}
        />
        {this._renderErrorBanner()}
        {this._renderFlow()}
      </div>
    );
  }

  /**
   * Loads a pre-built architecture template into the canvas.
   */
  public loadTemplate(templateId: string): void {
    const template = this._catalog.getTemplate(templateId);
    if (!template) return;
    const { nodes, edges } = this._convertTemplateToFlow(template);
    this.setState({ nodes, edges, activeTemplateId: templateId });
    this._announcer.announce(`Loaded template ${template.name}`);
    this._validateAndSync(nodes, edges);
  }

  /**
   * Inserts a new infrastructure node at the specified or default canvas position.
   */
  public addNode(type: string, position?: { x: number; y: number }): void {
    const pos = position ?? {
      x: ArchitectureCanvas._DEFAULT_X + (this.state.nodes.length * ArchitectureCanvas._POSITION_STEP) % 300,
      y: ArchitectureCanvas._DEFAULT_Y + (this.state.nodes.length * ArchitectureCanvas._POSITION_STEP) % 200,
    };
    const newNode = this._createDefaultNode(type, pos);
    const updatedNodes = [...this.state.nodes, newNode];
    this.setState({ nodes: updatedNodes });
    this._announcer.announce(`Added node ${newNode.data.label ?? type}`);
    this._validateAndSync(updatedNodes, this.state.edges);
  }

  /**
   * Removes currently selected node from the canvas.
   */
  public removeSelected(): void {
    if (!this.state.selectedNodeId) return;
    this._handleDeleteNode(this.state.selectedNodeId);
  }

  /**
   * Clears all canvas nodes and edges.
   */
  public clearCanvas(): void {
    this.setState({ nodes: [], edges: [], validationError: null, selectedNodeId: null });
    this._announcer.announce('Canvas cleared.');
    this._validateAndSync([], []);
  }

  private readonly _validator: GraphTopologyValidator;
  private readonly _announcer: AriaLiveAnnouncer;
  private readonly _catalog: TemplateCatalog;
  private readonly _simWorker: SimWorkerController;
  private readonly _keyboardNavigator: CanvasKeyboardNavigator;

  private _handleNodesChange = (changes: NodeChange[]): void => {
    const nextNodes = applyNodeChanges(changes, this.state.nodes);
    this.setState({ nodes: nextNodes });
    this._validateAndSync(nextNodes, this.state.edges);
  };

  private _handleEdgesChange = (changes: EdgeChange[]): void => {
    const nextEdges = applyEdgeChanges(changes, this.state.edges);
    this.setState({ edges: nextEdges });
    this._validateAndSync(this.state.nodes, nextEdges);
  };

  private _handleConnect = (connection: Connection): void => {
    if (!this._handleIsValidConnection(connection)) return;
    const newEdge = this._createInteractiveEdge(connection);
    const nextEdges = addEdge(newEdge, this.state.edges);
    this.setState({ edges: nextEdges });
    this._announcer.announce(`Connected ${connection.source} to ${connection.target}`);
    this._validateAndSync(this.state.nodes, nextEdges);
  };

  private _handleIsValidConnection = (connection: Edge | Connection): boolean => {
    if (!connection.source || !connection.target) return false;
    if (connection.source === connection.target) return false;
    const sourceNode = this.state.nodes.find((n) => n.id === connection.source);
    const targetNode = this.state.nodes.find((n) => n.id === connection.target);
    if (!sourceNode?.type || !targetNode?.type) return true;
    return this._validator.canConnect(sourceNode.type, targetNode.type);
  };

  private _handleKeyDown = (e: React.KeyboardEvent): void => {
    const nodeIds = this.state.nodes.map((n) => n.id);
    this._keyboardNavigator.handleKeyDown(e.nativeEvent, nodeIds);
  };

  private _handleSelectNode = (nodeId: string): void => {
    this.setState((prev) => ({
      selectedNodeId: nodeId,
      nodes: prev.nodes.map((n) => ({ ...n, selected: n.id === nodeId })),
    }));
  };

  private _handleDeleteNode = (nodeId: string): void => {
    const nextNodes = this.state.nodes.filter((n) => n.id !== nodeId);
    const nextEdges = this.state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    this.setState({ nodes: nextNodes, edges: nextEdges, selectedNodeId: null });
    this._announcer.announce(`Removed node ${nodeId}`);
    this._validateAndSync(nextNodes, nextEdges);
  };

  private _handleKeyboardConnect = (sourceId: string, targetId: string): void => {
    this._handleConnect({
      source: sourceId,
      target: targetId,
      sourceHandle: CanvasConstants.HANDLE_OUT,
      targetHandle: CanvasConstants.HANDLE_IN,
    });
  };

  private _handleInjectChaos = (edgeId: string): void => {
    const nextEdges = this.state.edges.map((edge) => {
      if (edge.id !== edgeId) return edge;
      const currentChaos = Boolean(edge.data?.isChaosInjected);
      const latency = (edge.data?.latencyMs as number) ?? ArchitectureCanvas._DEFAULT_EDGE_LATENCY;
      return {
        ...edge,
        data: {
          ...edge.data,
          isChaosInjected: !currentChaos,
          latencyMs: !currentChaos
            ? latency * CanvasConstants.CHAOS_LATENCY_MULTIPLIER
            : latency / CanvasConstants.CHAOS_LATENCY_MULTIPLIER,
          onInjectChaos: this._handleInjectChaos,
        },
      };
    });
    this.setState({ edges: nextEdges });
    this._announcer.announce(CanvasConstants.ARIA_CHAOS);
    this._validateAndSync(this.state.nodes, nextEdges);
  };

  private _validateAndSync(nodes: Node[], edges: Edge[]): void {
    const nodeIds = nodes.map((n) => n.id);
    const validation = this._validator.validateGraph(nodeIds, edges);
    if (!validation.isValid) {
      this.setState({ validationError: validation.error ?? 'Invalid graph' });
      this._announcer.announce(validation.error ?? 'Graph validation failed', 'assertive');
      return;
    }
    this.setState({ validationError: null });
    if (this.props.onGraphChange) {
      this.props.onGraphChange(nodes, edges);
    }
    this._syncStore(nodes, edges);
    this._dispatchSimEvaluation(nodes, edges);
  }

  private _syncStore(nodes: Node[], edges: Edge[]): void {
    if (!this.props.store) return;
    const wsNodes: WorkspaceNode[] = nodes.map((n) => ({
      id: n.id,
      type: this._resolveWorkspaceNodeType(n.type),
      position: n.position,
      data: (n.data as WorkspaceNode['data']) ?? { label: n.id },
    }));
    const wsEdges: WorkspaceEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      protocol: 'GRPC',
      data: { p99LatencyMs: (e.data?.latencyMs as number) ?? ArchitectureCanvas._DEFAULT_EDGE_LATENCY },
    }));
    this.props.store.updateCanvas(wsNodes, wsEdges);
  }

  private async _dispatchSimEvaluation(nodes: Node[], edges: Edge[]): Promise<void> {
    if (nodes.length === 0) return;
    const nodePayloads: GraphNodePayload[] = nodes.map((n) => ({
      id: n.id,
      type: n.type ?? CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY,
    }));
    const edgePayloads: GraphEdgePayload[] = edges.map((e) => ({
      source: e.source,
      target: e.target,
      latencyMs: (e.data?.latencyMs as number) ?? ArchitectureCanvas._DEFAULT_EDGE_LATENCY,
    }));
    try {
      const result = await this._simWorker.evaluateGraph(nodePayloads, edgePayloads, {
        inputQPS: ArchitectureCanvas._DEFAULT_SIM_QPS,
      });
      this._applySimResult(result);
    } catch {
      // Background worker evaluation error handled gracefully
    }
  }

  private _applySimResult(result: SimulationResult): void {
    const updatedNodes = this.state.nodes.map((node) => {
      const isUnstable = result.unstableNodes.includes(node.id);
      const isBottleneck = result.bottlenecks.some((b) => b.nodeId === node.id);
      let status = CanvasConstants.STATUS_OPTIMAL;
      if (isUnstable) status = CanvasConstants.STATUS_OVERFLOW;
      else if (isBottleneck) status = CanvasConstants.STATUS_BOTTLENECK;

      return {
        ...node,
        data: {
          ...node.data,
          status,
          p99LatencyMs: result.p99LatencyMs,
        },
      };
    });
    this.setState({ nodes: updatedNodes });
  }

  private _convertTemplateToFlow(template: ArchitectureTemplate): { nodes: Node[]; edges: Edge[] } {
    const nodes = this._convertTemplateNodes(template.nodes);
    const edges = this._convertTemplateEdges(template.edges);
    return { nodes, edges };
  }

  private _convertTemplateNodes(wsNodes: WorkspaceNode[]): Node[] {
    return wsNodes.map((wn) => ({
      id: wn.id,
      type: this._resolveFlowNodeType(wn.type),
      position: wn.position,
      data: {
        label: wn.data.label,
        ...wn.data.customConfig,
        status: CanvasConstants.STATUS_OPTIMAL,
      },
    }));
  }

  private _convertTemplateEdges(wsEdges: WorkspaceEdge[]): Edge[] {
    return wsEdges.map((we) => ({
      id: we.id,
      source: we.source,
      target: we.target,
      type: CanvasConstants.EDGE_TYPE_INTERACTIVE_INFRA,
      data: {
        protocol: we.protocol,
        latencyMs: ArchitectureCanvas._DEFAULT_EDGE_LATENCY,
        isChaosInjected: false,
        onInjectChaos: this._handleInjectChaos,
      },
    }));
  }

  private _resolveWorkspaceNodeType(flowType?: string): NodeType {
    switch (flowType) {
      case CanvasConstants.NODE_TYPE_MODEL_WORKER:
        return 'VLLM_INFERENCE_ENGINE';
      case CanvasConstants.NODE_TYPE_VECTOR_DATABASE:
        return 'VECTOR_DATABASE';
      case CanvasConstants.NODE_TYPE_FEATURE_STORE:
        return 'FEATURE_STORE';
      case CanvasConstants.NODE_TYPE_AGENT_SUPERVISOR:
      case CanvasConstants.NODE_TYPE_AGENT_SWARM_GROUP:
        return 'AGENT_ORCHESTRATOR';
      case CanvasConstants.NODE_TYPE_SEMANTIC_GUARDRAIL:
        return 'SAFETY_GUARDRAIL';
      default:
        return 'INGRESS_GATEWAY';
    }
  }

  private _resolveFlowNodeType(wsType: NodeType): string {
    switch (wsType) {
      case 'VLLM_INFERENCE_ENGINE':
        return CanvasConstants.NODE_TYPE_MODEL_WORKER;
      case 'VECTOR_DATABASE':
        return CanvasConstants.NODE_TYPE_VECTOR_DATABASE;
      case 'FEATURE_STORE':
        return CanvasConstants.NODE_TYPE_FEATURE_STORE;
      case 'AGENT_ORCHESTRATOR':
        return CanvasConstants.NODE_TYPE_AGENT_SUPERVISOR;
      case 'SAFETY_GUARDRAIL':
        return CanvasConstants.NODE_TYPE_SEMANTIC_GUARDRAIL;
      default:
        return CanvasConstants.NODE_TYPE_INFERENCE_GATEWAY;
    }
  }

  private _createDefaultNode(type: string, position: { x: number; y: number }): Node {
    const id = `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const label = type.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
    return {
      id,
      type,
      position,
      data: {
        label,
        status: CanvasConstants.STATUS_OPTIMAL,
      },
    };
  }

  private _createInteractiveEdge(connection: Connection): Edge {
    const id = `edge_${connection.source}_${connection.target}_${Date.now()}`;
    return {
      id,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: CanvasConstants.EDGE_TYPE_INTERACTIVE_INFRA,
      data: {
        protocol: 'gRPC',
        latencyMs: ArchitectureCanvas._DEFAULT_EDGE_LATENCY,
        isChaosInjected: false,
        onInjectChaos: this._handleInjectChaos,
      },
    };
  }

  private _renderErrorBanner(): React.ReactNode {
    if (!this.state.validationError) return null;
    return (
      <div
        className="flex items-center justify-between border-b border-rose-800 bg-rose-950/80 px-4 py-1.5 text-xs text-rose-200 z-10"
        role="alert"
      >
        <span>⚠️ {this.state.validationError}</span>
      </div>
    );
  }

  private _renderFlow(): React.ReactNode {
    return (
      <div className="flex-1 w-full h-full relative" data-testid="architecture-canvas-flow">
        <ReactFlow
          nodes={this.state.nodes}
          edges={this.state.edges}
          nodeTypes={ArchitectureCanvas._NODE_TYPES}
          edgeTypes={ArchitectureCanvas._EDGE_TYPES}
          onNodesChange={this._handleNodesChange}
          onEdgesChange={this._handleEdgesChange}
          onConnect={this._handleConnect}
          isValidConnection={this._handleIsValidConnection}
          colorMode={this.props.colorMode ?? 'system'}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    );
  }
}
