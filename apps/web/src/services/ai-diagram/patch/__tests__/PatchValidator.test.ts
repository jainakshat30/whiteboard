import { describe, expect, test } from 'vitest';
import { PatchValidator } from '../PatchValidator';
import { DiagramPatch } from '../DiagramPatch';
import { DiagramGraph } from '@/types/ai-diagram';

describe('PatchValidator', () => {
  const createBaseGraph = (): DiagramGraph => ({
    nodes: [
      { id: 'auth', label: 'Auth Service', type: 'process' },
      { id: 'db', label: 'Database', type: 'database' }
    ],
    edges: [
      { id: 'auth-db', source: 'auth', target: 'db', label: 'connects' }
    ],
    type: 'FLOWCHART',
    metadata: {}
  });

  describe('Valid Patches', () => {
    test('1. Add node', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'ADD_NODE', node: { id: 'redis', label: 'Cache', type: 'database' } }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors).toHaveLength(0);
    });

    test('2. Remove node after removing dependent edges', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [
          { op: 'REMOVE_EDGE', edgeId: 'auth-db' },
          { op: 'REMOVE_NODE', nodeId: 'db' }
        ]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors).toHaveLength(0);
    });

    test('3. Update node label', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'UPDATE_NODE', nodeId: 'auth', changes: { label: 'New Auth' } }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors).toHaveLength(0);
    });

    test('4. Update node type', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'UPDATE_NODE', nodeId: 'auth', changes: { type: 'decision' } }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors).toHaveLength(0);
    });

    test('5. Add edge between existing nodes', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'ADD_EDGE', edge: { id: 'db-auth', source: 'db', target: 'auth' } }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors).toHaveLength(0);
    });

    test('6. Remove edge', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'REMOVE_EDGE', edgeId: 'auth-db' }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors).toHaveLength(0);
    });

    test('7. Update edge label', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'UPDATE_EDGE', edgeId: 'auth-db', changes: { label: 'queries' } }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors).toHaveLength(0);
    });

    test('8. Add node then connect it', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [
          { op: 'ADD_NODE', node: { id: 'redis', label: 'Cache', type: 'database' } },
          { op: 'ADD_EDGE', edge: { id: 'auth-redis', source: 'auth', target: 'redis' } }
        ]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors).toHaveLength(0);
    });

    test('9. Multiple sequential operations', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [
          { op: 'ADD_NODE', node: { id: 'redis', label: 'Cache', type: 'database' } },
          { op: 'REMOVE_EDGE', edgeId: 'auth-db' },
          { op: 'ADD_EDGE', edge: { id: 'auth-redis', source: 'auth', target: 'redis' } },
          { op: 'ADD_EDGE', edge: { id: 'redis-db', source: 'redis', target: 'db' } }
        ]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Invalid Patches', () => {
    test('10. Add duplicate node', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'ADD_NODE', node: { id: 'auth', label: 'Duplicate', type: 'process' } }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/already exists/i);
    });

    test('11. Add duplicate edge', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'ADD_EDGE', edge: { id: 'auth-db', source: 'auth', target: 'db' } }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/already exists/i);
    });

    test('12. Remove nonexistent node', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'REMOVE_NODE', nodeId: 'does-not-exist' }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/does not exist/i);
    });

    test('13. Remove nonexistent edge', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'REMOVE_EDGE', edgeId: 'does-not-exist' }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/does not exist/i);
    });

    test('14. Update nonexistent node', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'UPDATE_NODE', nodeId: 'does-not-exist', changes: { label: 'New' } }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/does not exist/i);
    });

    test('15. Update nonexistent edge', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'UPDATE_EDGE', edgeId: 'does-not-exist', changes: { label: 'New' } }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/does not exist/i);
    });

    test('16, 17. Add edge referencing nonexistent source/target', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'ADD_EDGE', edge: { id: 'new-edge', source: 'auth', target: 'does-not-exist' } }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/does not exist/i);
    });

    test('18. Add edge before its node is created', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [
          { op: 'ADD_EDGE', edge: { id: 'auth-redis', source: 'auth', target: 'redis' } },
          { op: 'ADD_NODE', node: { id: 'redis', label: 'Cache', type: 'database' } }
        ]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/does not exist/i);
    });

    test('19. Remove node while dependent edge still exists', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: [{ op: 'REMOVE_NODE', nodeId: 'db' }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/dependent edges still exist/i);
    });

    test('20-25. Attempt to modify unsupported fields/coordinates', () => {
      const graph = createBaseGraph();
      const patch: any = { // cast to any to bypass TS for schema test
        operations: [{ 
          op: 'UPDATE_NODE', 
          nodeId: 'auth', 
          changes: { x: 100, y: 100 } 
        }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/Schema Validation Failed/i);
    });

    test('27. Empty operation', () => {
      const graph = createBaseGraph();
      const patch: any = {
        operations: [{}]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/Schema Validation Failed/i);
    });

    test('28. Unknown operation type', () => {
      const graph = createBaseGraph();
      const patch: any = {
        operations: [{ op: 'JUMP_NODE' }]
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/Schema Validation Failed/i);
    });

    test('29. More than maximum allowed operations', () => {
      const graph = createBaseGraph();
      const patch: DiagramPatch = {
        operations: Array(101).fill({ op: 'REMOVE_NODE', nodeId: 'auth' }) as any
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/Schema Validation Failed/i);
    });

    test('30. Invalid node type', () => {
      const graph = createBaseGraph();
      const patch: any = {
        operations: [{ op: 'ADD_NODE', node: { id: 'n1', label: 'N1', type: '' } }] // empty type fails NodeSchema min(1)
      };
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/Schema Validation Failed/i);
    });
  });

  describe('Immutability & Complex Transformation', () => {
    test('Immutability Check', () => {
      const graph = createBaseGraph();
      const clone = JSON.parse(JSON.stringify(graph));
      
      const patch: DiagramPatch = {
        operations: [
          { op: 'ADD_NODE', node: { id: 'redis', label: 'Cache', type: 'database' } },
          { op: 'REMOVE_EDGE', edgeId: 'auth-db' },
          { op: 'ADD_EDGE', edge: { id: 'auth-redis', source: 'auth', target: 'redis' } }
        ]
      };
      
      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors).toHaveLength(0);
      // Original graph must be completely unmodified
      expect(graph).toEqual(clone);
    });

    test('Important Sequence Transformation Test', () => {
      // Initial: API -> Auth -> PostgreSQL
      const graph: DiagramGraph = {
        nodes: [
          { id: 'api', label: 'API', type: 'process' },
          { id: 'auth', label: 'Auth', type: 'process' },
          { id: 'postgres', label: 'PostgreSQL', type: 'database' }
        ],
        edges: [
          { id: 'e1', source: 'api', target: 'auth' },
          { id: 'e2', source: 'auth', target: 'postgres' }
        ],
        type: 'FLOWCHART',
        metadata: {}
      };

      const patch: DiagramPatch = {
        operations: [
          { op: 'ADD_NODE', node: { id: 'redis', label: 'Redis', type: 'database' } },
          { op: 'REMOVE_EDGE', edgeId: 'e2' },
          { op: 'ADD_EDGE', edge: { id: 'e3', source: 'auth', target: 'redis' } },
          { op: 'ADD_EDGE', edge: { id: 'e4', source: 'redis', target: 'postgres' } }
        ]
      };

      const errors = PatchValidator.validatePatch(graph, patch);
      expect(errors).toHaveLength(0);
    });
  });
});
