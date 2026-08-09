import { describe, it, expect } from 'vitest';
import { DiagramPatchPreviewGenerator } from '../DiagramPatchPreviewGenerator';
import { DiagramGraph } from '@/types/ai-diagram';
import { DiagramPatch } from '../DiagramPatch';

describe('DiagramPatchPreviewGenerator', () => {
  const mockGraph: DiagramGraph = {
    type: 'FLOWCHART',
    nodes: [
      { id: 'auth', label: 'Auth Service', type: 'process' },
      { id: 'db', label: 'PostgreSQL', type: 'database' }
    ],
    edges: [
      { id: 'auth-db', source: 'auth', target: 'db', label: 'calls' }
    ],
    metadata: {}
  };

  it('generates an ADD_NODE preview', () => {
    const patch: DiagramPatch = {
      operations: [
        { op: 'ADD_NODE', node: { id: 'redis', label: 'Redis', type: 'database' } }
      ]
    };

    const preview = DiagramPatchPreviewGenerator.generatePreview(mockGraph, patch);
    expect(preview.totalChanges).toBe(1);
    expect(preview.additions).toEqual([
      { kind: 'ADD_NODE', nodeId: 'redis', label: 'Redis', nodeType: 'database' }
    ]);
  });

  it('generates a REMOVE_NODE preview', () => {
    const patch: DiagramPatch = {
      operations: [
        { op: 'REMOVE_NODE', nodeId: 'auth' }
      ]
    };

    const preview = DiagramPatchPreviewGenerator.generatePreview(mockGraph, patch);
    expect(preview.totalChanges).toBe(1);
    expect(preview.removals).toEqual([
      { kind: 'REMOVE_NODE', nodeId: 'auth', label: 'Auth Service' }
    ]);
  });

  it('generates an UPDATE_NODE preview for label change', () => {
    const patch: DiagramPatch = {
      operations: [
        { op: 'UPDATE_NODE', nodeId: 'auth', changes: { label: 'Authentication Service' } }
      ]
    };

    const preview = DiagramPatchPreviewGenerator.generatePreview(mockGraph, patch);
    expect(preview.totalChanges).toBe(1);
    expect(preview.updates).toEqual([
      { 
        kind: 'UPDATE_NODE', 
        nodeId: 'auth', 
        label: 'Auth Service', 
        beforeLabel: 'Auth Service', 
        afterLabel: 'Authentication Service',
        beforeType: undefined,
        afterType: undefined
      }
    ]);
  });

  it('generates an UPDATE_NODE preview for type change', () => {
    const patch: DiagramPatch = {
      operations: [
        { op: 'UPDATE_NODE', nodeId: 'auth', changes: { type: 'database' } }
      ]
    };

    const preview = DiagramPatchPreviewGenerator.generatePreview(mockGraph, patch);
    expect(preview.totalChanges).toBe(1);
    expect(preview.updates).toEqual([
      { 
        kind: 'UPDATE_NODE', 
        nodeId: 'auth', 
        label: 'Auth Service', 
        beforeLabel: undefined, 
        afterLabel: undefined,
        beforeType: 'process',
        afterType: 'database'
      }
    ]);
  });

  it('generates an ADD_EDGE preview', () => {
    const patch: DiagramPatch = {
      operations: [
        { op: 'ADD_NODE', node: { id: 'redis', label: 'Redis', type: 'database' } },
        { op: 'ADD_EDGE', edge: { id: 'auth-redis', source: 'auth', target: 'redis', label: 'caches' } }
      ]
    };

    const preview = DiagramPatchPreviewGenerator.generatePreview(mockGraph, patch);
    expect(preview.totalChanges).toBe(2);
    expect(preview.connectionChanges).toEqual([
      { kind: 'ADD_EDGE', edgeId: 'auth-redis', sourceLabel: 'Auth Service', targetLabel: 'Redis', label: 'caches' }
    ]);
  });

  it('generates a REMOVE_EDGE preview', () => {
    const patch: DiagramPatch = {
      operations: [
        { op: 'REMOVE_EDGE', edgeId: 'auth-db' }
      ]
    };

    const preview = DiagramPatchPreviewGenerator.generatePreview(mockGraph, patch);
    expect(preview.totalChanges).toBe(1);
    expect(preview.connectionChanges).toEqual([
      { kind: 'REMOVE_EDGE', edgeId: 'auth-db', sourceLabel: 'Auth Service', targetLabel: 'PostgreSQL', label: 'calls' }
    ]);
  });

  it('generates an UPDATE_EDGE preview', () => {
    const patch: DiagramPatch = {
      operations: [
        { op: 'UPDATE_EDGE', edgeId: 'auth-db', changes: { label: 'reads' } }
      ]
    };

    const preview = DiagramPatchPreviewGenerator.generatePreview(mockGraph, patch);
    expect(preview.totalChanges).toBe(1);
    expect(preview.connectionChanges).toEqual([
      { 
        kind: 'UPDATE_EDGE', 
        edgeId: 'auth-db', 
        sourceLabel: 'Auth Service', 
        targetLabel: 'PostgreSQL', 
        beforeLabel: 'calls',
        afterLabel: 'reads'
      }
    ]);
  });

  it('handles multiple operations correctly (ordering and grouping)', () => {
    const patch: DiagramPatch = {
      operations: [
        { op: 'ADD_NODE', node: { id: 'redis', label: 'Redis', type: 'database' } },
        { op: 'REMOVE_EDGE', edgeId: 'auth-db' },
        { op: 'ADD_EDGE', edge: { id: 'auth-redis', source: 'auth', target: 'redis' } },
        { op: 'ADD_EDGE', edge: { id: 'redis-db', source: 'redis', target: 'db' } }
      ]
    };

    const preview = DiagramPatchPreviewGenerator.generatePreview(mockGraph, patch);
    expect(preview.totalChanges).toBe(4);
    expect(preview.additions.length).toBe(1);
    expect(preview.removals.length).toBe(0);
    expect(preview.updates.length).toBe(0);
    expect(preview.connectionChanges.length).toBe(3);
  });

  it('handles no-op patches', () => {
    const patch: DiagramPatch = { operations: [] };
    const preview = DiagramPatchPreviewGenerator.generatePreview(mockGraph, patch);
    
    expect(preview.totalChanges).toBe(0);
    expect(preview.additions.length).toBe(0);
    expect(preview.removals.length).toBe(0);
    expect(preview.updates.length).toBe(0);
    expect(preview.connectionChanges.length).toBe(0);
  });

  it('fails cleanly on unknown node removal', () => {
    const patch: DiagramPatch = { operations: [{ op: 'REMOVE_NODE', nodeId: 'unknown' }] };
    expect(() => DiagramPatchPreviewGenerator.generatePreview(mockGraph, patch)).toThrow(/Cannot remove unknown node 'unknown'/);
  });

  it('fails cleanly on unknown edge removal', () => {
    const patch: DiagramPatch = { operations: [{ op: 'REMOVE_EDGE', edgeId: 'unknown-edge' }] };
    expect(() => DiagramPatchPreviewGenerator.generatePreview(mockGraph, patch)).toThrow(/Cannot remove unknown edge 'unknown-edge'/);
  });

  it('maintains immutability of inputs', () => {
    const patch: DiagramPatch = {
      operations: [
        { op: 'ADD_NODE', node: { id: 'redis', label: 'Redis', type: 'database' } },
        { op: 'REMOVE_EDGE', edgeId: 'auth-db' }
      ]
    };
    
    const patchString = JSON.stringify(patch);
    const graphString = JSON.stringify(mockGraph);
    
    DiagramPatchPreviewGenerator.generatePreview(mockGraph, patch);
    
    expect(JSON.stringify(patch)).toBe(patchString);
    expect(JSON.stringify(mockGraph)).toBe(graphString);
  });
});
