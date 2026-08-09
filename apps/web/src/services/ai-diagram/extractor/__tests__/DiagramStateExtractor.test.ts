import { describe, expect, test, vi } from 'vitest';
import { DiagramStateExtractor } from '../DiagramStateExtractor';
import { Element } from '@/types/elements';
import { DiagramGraph, PositionedGraph } from '@/types/ai-diagram';
import { DiagramCanvasIntegration } from '../../integration/DiagramCanvasIntegration';
import { useSceneStore } from '@/store/scene';

// Mock Scene Store
vi.mock('@/store/scene', () => {
  return {
    useSceneStore: {
      getState: vi.fn(() => ({
        addElements: vi.fn(),
      })),
    }
  };
});

describe('DiagramStateExtractor', () => {
  const createMockNodeElement = (diagramId: string, semanticId: string, uuid: string, type: string, label: string): Element => ({
    id: uuid,
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    strokeColor: '#000',
    fillColor: '#fff',
    strokeWidth: 2,
    opacity: 100,
    version: 0,
    text: label,
    metadata: {
      diagramId,
      diagramNodeId: semanticId,
      diagramNodeType: type,
      diagramType: 'ER_DIAGRAM'
    }
  });

  const createMockEdgeElement = (diagramId: string, semanticId: string, uuid: string, sourceUUID: string, targetUUID: string, label: string): Element => ({
    id: uuid,
    type: 'line',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    strokeColor: '#000',
    fillColor: '#fff',
    strokeWidth: 2,
    opacity: 100,
    version: 0,
    text: label,
    metadata: {
      diagramId,
      diagramEdgeId: semanticId,
      sourceId: sourceUUID,
      targetId: targetUUID,
      diagramType: 'ER_DIAGRAM'
    }
  });

  test('1. Empty diagram', () => {
    const graph = DiagramStateExtractor.extractDiagram([], 'd1');
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
    expect(graph.type).toBe('FLOWCHART'); // Default when no elements exist
  });

  test('2,3,6,7,10. Single/Multiple nodes, labels, types, diagram type', () => {
    const elements = [
      createMockNodeElement('d1', 'n1', 'uuid-1', 'process', 'Node 1'),
      createMockNodeElement('d1', 'n2', 'uuid-2', 'database', 'Node 2')
    ];
    
    const graph = DiagramStateExtractor.extractDiagram(elements, 'd1');
    
    expect(graph.type).toBe('ER_DIAGRAM');
    expect(graph.nodes).toHaveLength(2);
    
    // Deterministic sorting guarantees n1 then n2
    expect(graph.nodes[0]).toEqual({
      id: 'n1',
      type: 'process',
      label: 'Node 1',
      metadata: {}
    });
    
    expect(graph.nodes[1]).toEqual({
      id: 'n2',
      type: 'database',
      label: 'Node 2',
      metadata: {}
    });
  });

  test('4,5,8,9. Simple/Multiple edges, source/target relationships, labels', () => {
    const elements = [
      createMockNodeElement('d1', 'n1', 'uuid-1', 'process', 'Node 1'),
      createMockNodeElement('d1', 'n2', 'uuid-2', 'database', 'Node 2'),
      createMockEdgeElement('d1', 'e1', 'uuid-3', 'uuid-1', 'uuid-2', 'Edge 1')
    ];
    
    const graph = DiagramStateExtractor.extractDiagram(elements, 'd1');
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toEqual({
      id: 'e1',
      source: 'n1',
      target: 'n2',
      label: 'Edge 1'
    });
  });

  test('13,14. Multiple diagrams in the same scene', () => {
    const elements = [
      createMockNodeElement('d1', 'n1', 'uuid-1', 'process', 'Node A'),
      createMockNodeElement('d2', 'n1', 'uuid-2', 'process', 'Node B')
    ];
    
    const graph = DiagramStateExtractor.extractDiagram(elements, 'd1');
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].label).toBe('Node A');
  });

  test('15,16,22. DiagramEngine validation - Duplicate nodes and edges', () => {
    const elements = [
      createMockNodeElement('d1', 'n1', 'uuid-1', 'process', 'Node 1'),
      createMockNodeElement('d1', 'n1', 'uuid-2', 'process', 'Node 2')
    ];
    
    expect(() => {
      DiagramStateExtractor.extractDiagram(elements, 'd1');
    }).toThrow(/already exists/);
  });

  test('17,22. DiagramEngine validation - Edge referencing missing node', () => {
    const elements = [
      createMockNodeElement('d1', 'n1', 'uuid-1', 'process', 'Node 1'),
      createMockEdgeElement('d1', 'e1', 'uuid-3', 'uuid-1', 'uuid-invalid', 'Edge 1')
    ];
    
    expect(() => {
      DiagramStateExtractor.extractDiagram(elements, 'd1');
    }).toThrow(/references missing source\/target/);
  });

  test('18. Missing diagramId', () => {
    expect(() => {
      DiagramStateExtractor.extractDiagram([], '');
    }).toThrow(/Must provide a diagramId/);
  });

  test('19,12. Text element + shape does not create duplicate nodes', () => {
    // Current architecture stores labels on the shape. 
    // Pure text elements without diagramNodeId should be ignored.
    const textElement: Element = {
      id: 'uuid-text',
      type: 'text',
      x: 0, y: 0, width: 10, height: 10,
      strokeColor: '#000', fillColor: 'transparent',
      strokeWidth: 1, opacity: 100, version: 0,
      text: 'Standalone Text',
      metadata: { diagramId: 'd1' } // Belongs to diagram, but is not a semantic node
    };
    
    const elements = [
      createMockNodeElement('d1', 'n1', 'uuid-1', 'process', 'Node 1'),
      textElement
    ];
    
    const graph = DiagramStateExtractor.extractDiagram(elements, 'd1');
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].label).toBe('Node 1');
  });

  test('20. Deterministic output', () => {
    // Insert nodes in mixed order
    const elements = [
      createMockNodeElement('d1', 'n2', 'uuid-2', 'database', 'Node 2'),
      createMockNodeElement('d1', 'n1', 'uuid-1', 'process', 'Node 1')
    ];
    
    const graph = DiagramStateExtractor.extractDiagram(elements, 'd1');
    // Output should be sorted by semantic ID
    expect(graph.nodes[0].id).toBe('n1');
    expect(graph.nodes[1].id).toBe('n2');
  });

  test('21. Input immutability', () => {
    const elements = [createMockNodeElement('d1', 'n1', 'uuid-1', 'process', 'Node 1')];
    const clone = JSON.parse(JSON.stringify(elements));
    
    DiagramStateExtractor.extractDiagram(elements, 'd1');
    expect(elements).toEqual(clone);
  });

  test('Round-trip semantic preservation', () => {
    // 1. Start with canonical semantic graph
    const originalGraph: PositionedGraph = {
      type: 'FLOWCHART',
      metadata: {},
      nodes: [
        { id: 'n1', type: 'process', label: 'Start', x: 0, y: 0, width: 100, height: 50 },
        { id: 'n2', type: 'decision', label: 'Condition', x: 0, y: 100, width: 100, height: 50 }
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', label: 'Yes', type: 'directional' }
      ]
    };

    // 2. Map to native elements via Integration layer
    const nativeElements = DiagramCanvasIntegration.insertDiagram(originalGraph, {
      origin: { x: 0, y: 0 },
      diagramId: 'd-roundtrip'
    });

    // 3. Extract back into semantic graph
    const extractedGraph = DiagramStateExtractor.extractDiagram(nativeElements, 'd-roundtrip');

    // 4. Verify semantic structures are identical
    expect(extractedGraph.type).toBe('FLOWCHART');
    
    expect(extractedGraph.nodes).toHaveLength(2);
    expect(extractedGraph.nodes[0].id).toBe('n1');
    expect(extractedGraph.nodes[0].type).toBe('process');
    expect(extractedGraph.nodes[0].label).toBe('Start');
    
    expect(extractedGraph.edges).toHaveLength(1);
    expect(extractedGraph.edges[0].id).toBe('e1');
    expect(extractedGraph.edges[0].source).toBe('n1');
    expect(extractedGraph.edges[0].target).toBe('n2');
    expect(extractedGraph.edges[0].label).toBe('Yes');
  });
});
