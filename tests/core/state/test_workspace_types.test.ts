import { describe, expect, it } from 'vitest';
import { WorkspaceTypes } from '@/core/state/workspace_types';

describe('WorkspaceTypes', () => {
  const workspaceTypes = new WorkspaceTypes();

  it('test_defaultSyncState_returnsClean', () => {
    expect(workspaceTypes.defaultSyncState).toBe('CLEAN');
  });

  it('test_createEmptyWorkspace_withDefaultTitle_createsDocument', () => {
    const doc = workspaceTypes.createEmptyWorkspace('ws_101');

    expect(doc.workspaceId).toBe('ws_101');
    expect(doc.title).toBe('Untitled ML Architecture');
    expect(doc.activeModuleId).toBe('SANDBOX_BUILDER');
    expect(doc.activeScenarioId).toBeNull();
    expect(doc.etag).toBeNull();
    expect(doc.nodes).toEqual([]);
    expect(doc.edges).toEqual([]);
  });

  it('test_createEmptyWorkspace_withCustomTitle_createsDocument', () => {
    const doc = workspaceTypes.createEmptyWorkspace('ws_102', 'Custom Project');

    expect(doc.workspaceId).toBe('ws_102');
    expect(doc.title).toBe('Custom Project');
  });

  it('test_createInitialState_createsValidWorkspaceState', () => {
    const state = workspaceTypes.createInitialState('ws_initial');

    expect(state.currentWorkspace.workspaceId).toBe('ws_initial');
    expect(state.syncState).toBe('CLEAN');
    expect(state.lastSyncedIso).toBeNull();
    expect(state.activeCurriculumIndex).toBe(0);
    expect(state.telemetryRingBuffer).toEqual([]);
  });

  it('test_isValidDocument_withValidDocument_returnsTrue', () => {
    const doc = workspaceTypes.createEmptyWorkspace('ws_valid');
    expect(workspaceTypes.isValidDocument(doc)).toBe(true);
  });

  it('test_isValidDocument_withInvalidObjects_returnsFalse', () => {
    expect(workspaceTypes.isValidDocument(null)).toBe(false);
    expect(workspaceTypes.isValidDocument('not an object')).toBe(false);
    expect(workspaceTypes.isValidDocument({})).toBe(false);
    expect(
      workspaceTypes.isValidDocument({
        workspaceId: '',
        title: 'Title',
        activeModuleId: 'SANDBOX',
        nodes: [],
        edges: [],
      })
    ).toBe(false);
  });
});

