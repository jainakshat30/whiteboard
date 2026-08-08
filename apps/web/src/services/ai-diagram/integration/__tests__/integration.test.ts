import { describe, expect, test, vi, beforeEach } from 'vitest';
import { DiagramCanvasIntegration } from '../DiagramCanvasIntegration';
import { PositionedGraph } from '@/types/ai-diagram';
import { useSceneStore } from '@/store/scene';

// Mock the zustand store to observe `addElements` calls
vi.mock('@/store/scene', () => ({
  useSceneStore: {
    getState: vi.fn(() => ({
      addElements: vi.fn(),
    })),
  },
}));

describe('DiagramCanvasIntegration (Phase 4)', () => {
  let mockAddElements: any;

  beforeEach(() => {
    mockAddElements = vi.fn();
    (useSceneStore.getState as any).mockReturnValue({
      addElements: mockAddElements,
    });
  });

  const getMockGraph = (): PositionedGraph => ({
    type: 'FLOWCHART',
    nodes: {
      n1: { id: 'n1', type: 'process', label: 'Processing', x: 10, y: 20, width: 100, height: 50 },
      n2: { id: 'n2', type: 'decision', label: 'Valid?', x: 100, y: 200, width: 100, height: 100 }
    },
    edges: {
      e1: { id: 'e1', source: 'n1', target: 'n2', label: 'Yes' }
    },
    metadata: {
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

  test('Correctly offsets origin', () => {
    const graph = getMockGraph();
    const result = DiagramCanvasIntegration.insertDiagram(graph, { origin: { x: 500, y: 1000 } });
    
    // n1 was at (10, 20) -> now (510, 1020)
    const n1 = result.find(el => el.metadata?.diagramNodeId === 'n1');
    expect(n1?.x).toBe(510);
    expect(n1?.y).toBe(1020);

    // n2 was at (100, 200) -> now (600, 1200)
    const n2 = result.find(el => el.metadata?.diagramNodeId === 'n2');
    expect(n2?.x).toBe(600);
    expect(n2?.y).toBe(1200);
  });

  test('Remaps IDs and prevents collisions', () => {
    const graph = getMockGraph();
    const result = DiagramCanvasIntegration.insertDiagram(graph, { origin: { x: 0, y: 0 } });
    
    // UUIDs should not match original 'n1', 'n2', 'e1'
    result.forEach(el => {
      expect(el.id).not.toBe('n1');
      expect(el.id).not.toBe('n2');
      expect(el.id).not.toBe('e1');
    });

    const n1 = result.find(el => el.metadata?.diagramNodeId === 'n1')!;
    const n2 = result.find(el => el.metadata?.diagramNodeId === 'n2')!;
    const edge = result.find(el => el.type === 'line')!;

    // Edge source and target must be correctly remapped to the new UUIDs
    expect(edge.metadata?.sourceId).toBe(n1.id);
    expect(edge.metadata?.targetId).toBe(n2.id);
  });

  test('Appends diagramId metadata to all elements', () => {
    const graph = getMockGraph();
    const diagramId = 'test-diagram-uuid';
    const result = DiagramCanvasIntegration.insertDiagram(graph, { 
      origin: { x: 0, y: 0 },
      diagramId 
    });
    
    result.forEach(el => {
      expect(el.metadata?.diagramId).toBe(diagramId);
    });
  });

  test('Calls addElements in a single transaction', () => {
    const graph = getMockGraph();
    const result = DiagramCanvasIntegration.insertDiagram(graph, { origin: { x: 0, y: 0 } });
    
    // addElements should have been called exactly once with all generated elements
    expect(mockAddElements).toHaveBeenCalledTimes(1);
    expect(mockAddElements).toHaveBeenCalledWith(result);
  });
});
