import { describe, expect, it } from 'vitest';
import { TerraformHclExporter } from '@/core/exporters/terraform_hcl_exporter';
import { WorkspaceDocument } from '@/core/state/workspace_types';

describe('TerraformHclExporter', () => {
  const sampleDoc: WorkspaceDocument = {
    workspaceId: 'ws_tf_test',
    title: 'Enterprise Multi-Modal Pipeline',
    lastModifiedIso: new Date().toISOString(),
    etag: null,
    activeModuleId: 'SANDBOX_BUILDER',
    activeScenarioId: null,
    nodes: [
      {
        id: 'node_gw',
        type: 'INGRESS_GATEWAY',
        position: { x: 0, y: 0 },
        data: { label: 'Ingress Envoy' },
      },
      {
        id: 'node_vllm',
        type: 'VLLM_INFERENCE_ENGINE',
        position: { x: 100, y: 0 },
        data: { label: 'vLLM Serving', hardwareProfile: 'p4de.24xlarge' },
      },
      {
        id: 'node_vdb',
        type: 'VECTOR_DATABASE',
        position: { x: 200, y: 0 },
        data: { label: 'Qdrant Shard' },
      },
      {
        id: 'node_redis',
        type: 'FEATURE_STORE',
        position: { x: 300, y: 0 },
        data: { label: 'Redis Cache' },
      },
      {
        id: 'node_waf',
        type: 'SAFETY_GUARDRAIL',
        position: { x: 400, y: 0 },
        data: { label: 'AWS WAF Guard' },
      },
      {
        id: 'node_generic',
        type: 'AGENT_ORCHESTRATOR',
        position: { x: 500, y: 0 },
        data: { label: 'Agent Node' },
      },
    ],
    edges: [],
  };

  it('test_exportHcl_generatesValidHclForNodeArchitecture', () => {
    const exporter = new TerraformHclExporter();
    const hcl = exporter.exportHcl(sampleDoc, { environment: 'prod', includeOutputs: true });

    expect(hcl).toContain('terraform {');
    expect(hcl).toContain('resource "aws_lb" "node_gw"');
    expect(hcl).toContain('resource "aws_instance" "node_vllm"');
    expect(hcl).toContain('instance_type = "p4de.24xlarge"');
    expect(hcl).toContain('resource "helm_release" "node_vdb"');
    expect(hcl).toContain('resource "aws_elasticache_cluster" "node_redis"');
    expect(hcl).toContain('resource "aws_wafv2_web_acl" "node_waf"');
    expect(hcl).toContain('resource "aws_instance" "node_generic"');
    expect(hcl).toContain('output "node_gw_id"');

    expect(exporter.validateHclSyntax(hcl)).toBe(true);
  });

  it('test_validateHclSyntax_detectsMalformedHcl', () => {
    const exporter = new TerraformHclExporter();
    expect(exporter.validateHclSyntax('')).toBe(false);
    expect(exporter.validateHclSyntax('terraform { unclosed')).toBe(false);
    expect(exporter.validateHclSyntax('hello world')).toBe(false);
  });

  it('test_getSupportedResourceTypes_returnsAllMappedTypes', () => {
    const exporter = new TerraformHclExporter();
    const types = exporter.getSupportedResourceTypes();
    expect(types).toContain('INGRESS_GATEWAY');
    expect(types).toContain('VLLM_INFERENCE_ENGINE');
    expect(types).toContain('VECTOR_DATABASE');
    expect(types).toContain('SAFETY_GUARDRAIL');
  });
});

