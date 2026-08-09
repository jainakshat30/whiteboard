import { describe, expect, test } from 'vitest';
import { DiagramPatchEngine } from '../DiagramPatchEngine';
import { DiagramPatch } from '../DiagramPatch';
import { DiagramGraph } from '@/types/ai-diagram';
import { LayoutFactory } from '../../layout/LayoutFactory';
import { DiagramMapper } from '../../mapper/DiagramMapper';

describe('DiagramPatchEngine', () => {
  const createBaseGraph = (): DiagramGraph => ({
    nodes: [
      { id: 'auth', label: 'Auth Service', type: 'process' },
      { id: 'db', label: 'Database', type: 'database' },
      { id: 'api', label: 'API Gateway', type: 'process' }
    ],
    edges: [
      { id: 'api-auth', source: 'api', target: 'auth' },
      { id: 'auth-db', source: 'auth', target: 'db', label: 'queries' }
    ],
    type: 'FLOWCHART',
    metadata: {}
  });

  describe('Valid Transformations', () => {
    test('1. Empty patch', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = { operations: [] };
      const result = DiagramPatchEngine.apply(graph, patch);
      expect(result).toEqual(graph);
      expect(result).not.toBe(graph); // deep copy check
    });

    test('2. Add node', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'ADD_NODE', node: { id: 'redis', label: 'Cache', type: 'database' } }]
      };
      const result = DiagramPatchEngine.apply(graph, patch);
      expect(result.nodes).toHaveLength(4);
      expect(result.nodes.find(n => n.id === 'redis')).toBeDefined();
    });

    test('3. Remove node (after explicit edge removal)', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [
          { op: 'REMOVE_EDGE', edgeId: 'auth-db' },
          { op: 'REMOVE_NODE', nodeId: 'db' }
        ]
      };
      const result = DiagramPatchEngine.apply(graph, patch);
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
    });

    test('4,5,6. Update node label, type, metadata', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [
          { op: 'UPDATE_NODE', nodeId: 'auth', changes: { label: 'New Auth', type: 'decision', metadata: { x: 1 } } }
        ]
      };
      const result = DiagramPatchEngine.apply(graph, patch);
      const authNode = result.nodes.find(n => n.id === 'auth');
      expect(authNode?.label).toBe('New Auth');
      expect(authNode?.type).toBe('decision');
      expect(authNode?.metadata).toEqual({ x: 1 });
    });

    test('7. Add edge', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'ADD_EDGE', edge: { id: 'db-api', source: 'db', target: 'api' } }]
      };
      const result = DiagramPatchEngine.apply(graph, patch);
      expect(result.edges).toHaveLength(3);
      expect(result.edges.find(e => e.id === 'db-api')).toBeDefined();
    });

    test('8. Remove edge', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'REMOVE_EDGE', edgeId: 'api-auth' }]
      };
      const result = DiagramPatchEngine.apply(graph, patch);
      expect(result.edges).toHaveLength(1);
    });

    test('9,10. Update edge label and metadata', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'UPDATE_EDGE', edgeId: 'auth-db', changes: { label: 'reads', metadata: { heavy: true } } }]
      };
      const result = DiagramPatchEngine.apply(graph, patch);
      const edge = result.edges.find(e => e.id === 'auth-db');
      expect(edge?.label).toBe('reads');
      expect(edge?.metadata).toEqual({ heavy: true });
    });

    test('11,12. Multiple sequential operations & add/connect node', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [
          { op: 'ADD_NODE', node: { id: 'redis', label: 'Cache', type: 'database' } },
          { op: 'REMOVE_EDGE', edgeId: 'auth-db' },
          { op: 'ADD_EDGE', edge: { id: 'auth-redis', source: 'auth', target: 'redis' } },
          { op: 'ADD_EDGE', edge: { id: 'redis-db', source: 'redis', target: 'db' } }
        ]
      };
      const result = DiagramPatchEngine.apply(graph, patch);
      expect(result.nodes).toHaveLength(4);
      expect(result.edges).toHaveLength(3);
      
      // Original graph check for immutability
      expect(graph.nodes).toHaveLength(3);
      expect(graph.edges).toHaveLength(2);
    });
  });

  describe('Invalid Transformations & Safety', () => {
    test('15,16,18. Invalid node reference / Duplicate IDs', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'ADD_NODE', node: { id: 'api', label: 'dup', type: 'process' } }]
      };
      expect(() => DiagramPatchEngine.apply(graph, patch)).toThrow(/already exists/i);
    });

    test('17. Invalid edge reference', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'ADD_EDGE', edge: { id: 'e1', source: 'auth', target: 'missing' } }]
      };
      expect(() => DiagramPatchEngine.apply(graph, patch)).toThrow(/does not exist/i);
    });

    test('19. Dependent-edge deletion failure (prevents silent deletion)', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'REMOVE_NODE', nodeId: 'auth' }]
      };
      // Expect specific engine logic error to bubble up
      expect(() => DiagramPatchEngine.apply(graph, patch)).toThrow(/dependent edge 'api-auth' still exists/);
    });

    test('20,21. Graph immutability and no partial mutation after failure', () => {
      const graph = createBaseGraph();
      const clone = JSON.parse(JSON.stringify(graph));
      const patch: DiagramPatch = {
        operations: [
          { op: 'ADD_NODE', node: { id: 'redis', label: 'Cache', type: 'database' } }, // succeeds
          { op: 'REMOVE_NODE', nodeId: 'auth' } // fails
        ]
      };
      
      expect(() => DiagramPatchEngine.apply(graph, patch)).toThrow();
      
      // 100% immutable
      expect(graph).toEqual(clone);
    });
    
    test('22,23,24. Existing unrelated nodes/edges and semantic IDs preserved', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [
          { op: 'UPDATE_NODE', nodeId: 'api', changes: { label: 'New API' } }
        ]
      };
      const result = DiagramPatchEngine.apply(graph, patch);
      
      // Node was updated
      expect(result.nodes.find(n => n.id === 'api')?.label).toBe('New API');
      
      // Everything else remains untouched
      expect(result.nodes.find(n => n.id === 'auth')).toEqual(graph.nodes.find(n => n.id === 'auth'));
      expect(result.nodes.find(n => n.id === 'db')).toEqual(graph.nodes.find(n => n.id === 'db'));
      expect(result.edges).toEqual(graph.edges);
    });
  });

  describe('Integration tests', () => {
    test('Critical Round-Trip Test via LayoutFactory and DiagramMapper', async () => {
      const graph = createBaseGraph();
      
      const patch: DiagramPatch = {
        operations: [
          { op: 'ADD_NODE', node: { id: 'redis', label: 'Redis', type: 'database' } },
          { op: 'REMOVE_EDGE', edgeId: 'auth-db' },
          { op: 'ADD_EDGE', edge: { id: 'auth-redis', source: 'auth', target: 'redis' } },
          { op: 'ADD_EDGE', edge: { id: 'redis-db', source: 'redis', target: 'db' } }
        ]
      };

      // 1. Semantic engine application
      const updatedGraph = DiagramPatchEngine.apply(graph, patch);

      // 2. Canonical graph works directly with Layout Engine
      const layoutEngine = LayoutFactory.getLayout(updatedGraph.type);
      const positionedGraph = await layoutEngine.layout(updatedGraph);

      // 3. Positioned graph works directly with Mapper
      const nativeElements = DiagramMapper.map(positionedGraph);

      // Ensure no conversion was needed and elements generated successfully
      expect(nativeElements.length).toBeGreaterThan(0);
      
      // 4 nodes + 3 edges = 7 native elements
      expect(nativeElements).toHaveLength(7);
      
      // Verify no geometry leaked from the patch semantic step
      const redisEl = nativeElements.find(el => el.metadata?.diagramNodeId === 'redis');
      expect(redisEl).toBeDefined();
      expect(redisEl?.x).not.toBeUndefined();
      expect(redisEl?.y).not.toBeUndefined();
    });
  });
});
