import { describe, expect, it } from 'vitest';
import { KubernetesManifestExporter } from '@/core/exporters/kubernetes_manifest_exporter';
import { WorkspaceDocument } from '@/core/state/workspace_types';

describe('KubernetesManifestExporter', () => {
  const sampleDoc: WorkspaceDocument = {
    workspaceId: 'ws_k8s_test',
    title: 'Distributed vLLM Serving Cluster',
    lastModifiedIso: new Date().toISOString(),
    etag: null,
    activeModuleId: 'SANDBOX_BUILDER',
    activeScenarioId: null,
    nodes: [
      {
        id: 'gateway-ingress',
        type: 'INGRESS_GATEWAY',
        position: { x: 0, y: 0 },
        data: { label: 'Ingress Envoy' },
      },
      {
        id: 'vllm-serving',
        type: 'VLLM_INFERENCE_ENGINE',
        position: { x: 100, y: 0 },
        data: { label: 'vLLM Engine' },
      },
      {
        id: 'qdrant-db',
        type: 'VECTOR_DATABASE',
        position: { x: 200, y: 0 },
        data: { label: 'Qdrant Cluster' },
      },
    ],
    edges: [],
  };

  it('test_exportYaml_compilesFullSuiteOfDeclarativeManifests', () => {
    const exporter = new KubernetesManifestExporter();
    const yaml = exporter.exportYaml(sampleDoc, {
      namespace: 'ml-production',
      includeHpa: true,
      includeNetworkPolicy: true,
    });

    expect(yaml).toContain('apiVersion: v1\nkind: Namespace');
    expect(yaml).toContain('name: ml-production');
    expect(yaml).toContain('kind: Deployment');
    expect(yaml).toContain('image: vllm/vllm-openai:latest');
    expect(yaml).toContain('kind: StatefulSet');
    expect(yaml).toContain('name: qdrant-db');
    expect(yaml).toContain('kind: HorizontalPodAutoscaler');
    expect(yaml).toContain('kind: NetworkPolicy');

    expect(exporter.validateManifestSyntax(yaml)).toBe(true);
    expect(exporter.getManifestCount(yaml)).toBeGreaterThanOrEqual(5);
  });

  it('test_validateManifestSyntax_checksStandardKubernetesFields', () => {
    const exporter = new KubernetesManifestExporter();
    expect(exporter.validateManifestSyntax('')).toBe(false);
    expect(exporter.validateManifestSyntax('foo: bar')).toBe(false);
    expect(
      exporter.validateManifestSyntax('apiVersion: v1\nkind: Service\nmetadata:\n  name: test')
    ).toBe(true);
  });

  it('test_getManifestCount_whenEmptyOrInvalid_returnsZero', () => {
    const exporter = new KubernetesManifestExporter();
    expect(exporter.getManifestCount('')).toBe(0);
  });
});

