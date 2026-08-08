import { describe, expect, test } from 'vitest';
import { DiagramMapper, ShapeFactory } from '../index';
import { PositionedGraph } from '@/types/ai-diagram';

describe('Diagram Mapper (Phase 3)', () => {
  const getEmptyGraph = (): PositionedGraph => ({
    type: 'FLOWCHART',
    nodes: {},
    edges: {},
    metadata: {
      diagramNodeId: 'test-graph',
      diagramNodeType: 'FLOWCHART'
    },
    layoutMetadata: {
      layoutEngine: 'TestEngine',
      layoutStrategy: 'TestStrategy',
      layoutDuration: 10,
      diagramWidth: 500,
      diagramHeight: 500,
      warnings: [],
      boundingBox: { width: 500, height: 500 }
    }
  });

  test('Empty graph mapping returns empty array', () => {
    const graph = getEmptyGraph();
    const elements = DiagramMapper.map(graph);
    expect(elements).toEqual([]);
  });

  test('Node immutability and ID preservation', () => {
    const graph = getEmptyGraph();
    graph.nodes['n1'] = { id: 'n1', type: 'process', label: 'Processing', x: 10, y: 20, width: 100, height: 50 };
    
    // Deep copy for mutation check
    const originalGraph = JSON.parse(JSON.stringify(graph));
    const elements = DiagramMapper.map(graph);

    // Graph was not mutated
    expect(graph).toEqual(originalGraph);
    
    // Elements generated correctly
    expect(elements).toHaveLength(1);
    expect(elements[0].id).toBe('n1');
    expect(elements[0].type).toBe('rectangle');
    expect(elements[0].x).toBe(10);
    expect(elements[0].y).toBe(20);
    expect(elements[0].width).toBe(100);
    expect(elements[0].height).toBe(50);
  });

  test('Semantic metadata and label behavior', () => {
    const graph = getEmptyGraph();
    graph.nodes['db1'] = { id: 'db1', type: 'database', label: 'User Data', x: 0, y: 0, width: 100, height: 100 };
    
    const elements = DiagramMapper.map(graph);
    const dbElement = elements[0];

    // Label mapping
    expect(dbElement.text).toBe('User Data');

    // Metadata preservation
    expect(dbElement.metadata).toBeDefined();
    expect(dbElement.metadata?.diagramNodeId).toBe('db1');
    expect(dbElement.metadata?.diagramNodeType).toBe('database');
  });

  test('Unknown node fallback', () => {
    const graph = getEmptyGraph();
    // @ts-expect-error - Testing unknown node type
    graph.nodes['u1'] = { id: 'u1', type: 'unknown_magic_type', x: 0, y: 0, width: 10, height: 10 };
    
    const elements = DiagramMapper.map(graph);
    expect(elements[0].type).toBe('rectangle'); // Default fallback
  });

  test('Boundary connections and relationship preservation', () => {
    const graph = getEmptyGraph();
    
    // Target is vertically below Source
    graph.nodes['n1'] = { id: 'n1', type: 'process', label: '', x: 100, y: 100, width: 100, height: 50 };
    graph.nodes['n2'] = { id: 'n2', type: 'process', label: '', x: 100, y: 300, width: 100, height: 50 };
    graph.edges['e1'] = { id: 'e1', source: 'n1', target: 'n2' };

    const elements = DiagramMapper.map(graph);
    expect(elements).toHaveLength(3); // n1, n2, e1
    
    const edgeElement = elements.find(e => e.id === 'e1')!;
    expect(edgeElement.type).toBe('line');
    
    // Check relationship
    expect(edgeElement.metadata?.sourceId).toBe('n1');
    expect(edgeElement.metadata?.targetId).toBe('n2');

    // Check vertical boundary connection (Source bottom to Target top)
    // Source bottom center: x = 150, y = 150
    // Target top center: x = 150, y = 300
    expect(edgeElement.x).toBe(150);
    expect(edgeElement.y).toBe(150);
    expect(edgeElement.width).toBe(0); // 150 - 150
    expect(edgeElement.height).toBe(150); // 300 - 150
  });

  test('Horizontal boundary connection', () => {
    const graph = getEmptyGraph();
    
    // Target is horizontally right of Source
    graph.nodes['n1'] = { id: 'n1', type: 'process', label: '', x: 100, y: 100, width: 50, height: 100 };
    graph.nodes['n2'] = { id: 'n2', type: 'process', label: '', x: 400, y: 100, width: 50, height: 100 };
    graph.edges['e1'] = { id: 'e1', source: 'n1', target: 'n2' };

    const elements = DiagramMapper.map(graph);
    const edgeElement = elements.find(e => e.id === 'e1')!;

    // Source right center: x = 150, y = 150
    // Target left center: x = 400, y = 150
    expect(edgeElement.x).toBe(150);
    expect(edgeElement.y).toBe(150);
    expect(edgeElement.width).toBe(250); // 400 - 150
    expect(edgeElement.height).toBe(0); // 150 - 150
  });

  test('Deterministic output', () => {
    const graph = getEmptyGraph();
    graph.nodes['n2'] = { id: 'n2', type: 'process', label: '', x: 100, y: 300, width: 100, height: 50 };
    graph.nodes['n1'] = { id: 'n1', type: 'process', label: '', x: 100, y: 100, width: 100, height: 50 };
    graph.edges['e2'] = { id: 'e2', source: 'n2', target: 'n1' };
    graph.edges['e1'] = { id: 'e1', source: 'n1', target: 'n2' };

    const run1 = DiagramMapper.map(graph);
    const run2 = DiagramMapper.map(graph);

    expect(run1).toEqual(run2);

    // Nodes and edges should be sorted by ID to ensure deterministic output
    expect(run1.map(e => e.id)).toEqual(['n1', 'n2', 'e1', 'e2']);
  });
});
