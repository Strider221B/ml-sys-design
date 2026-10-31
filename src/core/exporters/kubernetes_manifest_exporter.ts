import { WorkspaceDocument, WorkspaceNode } from '@/core/state/workspace_types';

export interface KubernetesExportOptions {
  namespace?: string;
  includeHpa?: boolean;
  includeNetworkPolicy?: boolean;
}

/**
 * Compiles visual canvas architectures into multi-document declarative Kubernetes YAML manifests.
 */
export class KubernetesManifestExporter {
  private static readonly _DEFAULT_NAMESPACE = 'ml-system';
  private static readonly _DOC_DELIMITER = '\n---\n';
  private static readonly _HEADER_COMMENT = '# Auto-generated Kubernetes Manifests by 2026 ML System Design Platform\n';

  public constructor() {}

  /**
   * Compiles workspace nodes and configurations into multi-document Kubernetes YAML string.
   */
  public exportYaml(document: WorkspaceDocument, options?: KubernetesExportOptions): string {
    const ns = options?.namespace ?? KubernetesManifestExporter._DEFAULT_NAMESPACE;
    const documents: string[] = [this._buildNamespaceDoc(ns)];

    for (const node of document.nodes) {
      documents.push(this._buildWorkloadDoc(node, ns));
      documents.push(this._buildServiceDoc(node, ns));
      if (options?.includeHpa && node.type === 'VLLM_INFERENCE_ENGINE') {
        documents.push(this._buildHpaDoc(node, ns));
      }
    }

    if (options?.includeNetworkPolicy) {
      documents.push(this._buildNetworkPolicyDoc(ns));
    }

    return KubernetesManifestExporter._HEADER_COMMENT + documents.join(KubernetesManifestExporter._DOC_DELIMITER);
  }

  /**
   * Validates structural YAML document syntax for standard Kubernetes properties.
   */
  public validateManifestSyntax(yamlString: string): boolean {
    if (!yamlString || yamlString.trim().length === 0) return false;
    const hasKind = yamlString.includes('kind:');
    const hasApiVersion = yamlString.includes('apiVersion:');
    const hasMetadata = yamlString.includes('metadata:');
    return hasKind && hasApiVersion && hasMetadata;
  }

  /**
   * Returns count of separate declarative YAML documents separated by delimiter.
   */
  public getManifestCount(yamlString: string): number {
    if (!yamlString || yamlString.trim().length === 0) return 0;
    const parts = yamlString.split(KubernetesManifestExporter._DOC_DELIMITER);
    return parts.filter((p) => p.trim().length > 0 && p.includes('kind:')).length;
  }

  private _buildNamespaceDoc(ns: string): string {
    return `apiVersion: v1
kind: Namespace
metadata:
  name: ${ns}
  labels:
    environment: production
    managed-by: ml-sys-design`;
  }

  private _buildWorkloadDoc(node: WorkspaceNode, ns: string): string {
    const name = this._sanitizeK8sName(node.id);
    const kind = node.type === 'VECTOR_DATABASE' ? 'StatefulSet' : 'Deployment';
    const specBody = this._buildWorkloadSpec(node, name);

    return `apiVersion: apps/v1
kind: ${kind}
metadata:
  name: ${name}
  namespace: ${ns}
  labels:
    app: ${name}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${name}
${specBody}`;
  }

  private _buildWorkloadSpec(node: WorkspaceNode, name: string): string {
    const isVllm = node.type === 'VLLM_INFERENCE_ENGINE';
    const image = isVllm ? 'vllm/vllm-openai:latest' : 'nginx:alpine';
    return `  template:
    metadata:
      labels:
        app: ${name}
    spec:
      containers:
        - name: app
          image: ${image}
          resources:
            limits:
              cpu: "4"
              memory: 16Gi`;
  }

  private _buildServiceDoc(node: WorkspaceNode, ns: string): string {
    const name = this._sanitizeK8sName(node.id);
    const isGateway = node.type === 'INGRESS_GATEWAY';
    const type = isGateway ? 'LoadBalancer' : 'ClusterIP';

    return `apiVersion: v1
kind: Service
metadata:
  name: ${name}-svc
  namespace: ${ns}
spec:
  type: ${type}
  selector:
    app: ${name}
  ports:
    - port: 8000
      targetPort: 8000
      name: http`;
  }

  private _buildHpaDoc(node: WorkspaceNode, ns: string): string {
    const name = this._sanitizeK8sName(node.id);
    return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${name}-hpa
  namespace: ${ns}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${name}
  minReplicas: 2
  maxReplicas: 16
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 75`;
  }

  private _buildNetworkPolicyDoc(ns: string): string {
    return `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ml-default-isolate
  namespace: ${ns}
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: ingress-gateway`;
  }

  private _sanitizeK8sName(rawId: string): string {
    return rawId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
}
