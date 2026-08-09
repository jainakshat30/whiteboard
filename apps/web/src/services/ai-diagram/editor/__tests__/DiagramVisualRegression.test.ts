import { describe, expect, test, vi, beforeEach } from 'vitest';
import { calculateNodeDimensions } from '../../layout/helpers';
import { DiagramCanvasIntegration } from '../../integration/DiagramCanvasIntegration';
import { DiagramStateExtractor } from '../../extractor/DiagramStateExtractor';
import { DiagramMapper } from '../../mapper/DiagramMapper';
import { DiagramGraph, PositionedGraph } from '@/types/ai-diagram';
import { Element } from '@/types/elements';
import { useSceneStore } from '@/store/scene';

vi.mock('@/store/scene', () => ({
  useSceneStore: {
    getState: vi.fn(() => ({
      addElements: vi.fn(),
      replaceElements: vi.fn(),
    })),
  },
}));

describe('DiagramVisualRegression (Phase 6.9)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Node Sizing & Wrapping (calculateNodeDimensions)', () => {
    test('Calculates small label dimensions correctly', () => {
      const dim = calculateNodeDimensions('API');
      // "API" is 3 chars. 3 * 9.6 + 40 = 68.8
      // Min width is 120.
      expect(dim.width).toBe(120);
      expect(dim.height).toBe(64); // 1 line * 24 + 40
    });

    test('Calculates multi-line wrapping correctly for very long labels', () => {
      const label = 'Authentication Service with OAuth 2.0, JWT validation, refresh token rotation, and session management';
      const dim = calculateNodeDimensions(label);
      
      // Expected to wrap at 400px maximum.
      expect(dim.width).toBeLessThanOrEqual(400);
      // It should span at least 2 or 3 lines.
      expect(dim.height).toBeGreaterThan(64); // More than 1 line
      expect(dim.height).toBeGreaterThanOrEqual(88); // At least 2 lines (2 * 24 + 40)
    });

    test('Preserves explicit newlines', () => {
      const dim = calculateNodeDimensions('API\nGateway');
      expect(dim.height).toBe(88); // 2 lines
    });
  });

  describe('Center Anchoring (DiagramCanvasIntegration)', () => {
    test('updateDiagram anchors the new layout to the center of the old layout', () => {
      // Old elements: a 100x100 square from (100, 100) to (200, 200). Center is (150, 150).
      const oldElements: Element[] = [
        { id: '1', type: 'rectangle', x: 100, y: 100, width: 100, height: 100, metadata: { diagramId: 'test-diagram' } } as unknown as Element
      ];

      // New mapped elements (assume LayoutEngine put it at 0,0 and made it a 300x300 bounding box)
      const mockPositionedGraph: PositionedGraph = {
        type: 'FLOWCHART',
        nodes: [
          { id: 'n1', label: 'A', type: 'process', x: 0, y: 0, width: 300, height: 300 }
        ],
        edges: [],
        metadata: {}
      };

      const result = DiagramCanvasIntegration.updateDiagram(mockPositionedGraph, 'test-diagram', oldElements);
      
      // The new node should be centered at (150, 150).
      // Since it's 300x300, its top-left should be 150 - 150 = 0, and top-left Y should be 0.
      expect(result[0].x).toBe(0);
      expect(result[0].y).toBe(0);
    });
  });

  describe('Round-Trip Semantic Preservation & Orphan Detection', () => {
    test('Graph -> Mapper -> Extractor -> Graph preserves semantics', () => {
      const originalGraph: PositionedGraph = {
        type: 'FLOWCHART',
        nodes: [
          { id: 'auth', label: 'Auth', type: 'process', x: 100, y: 100, width: 120, height: 60 }
        ],
        edges: [],
        metadata: {}
      };

      // Map to Elements
      const elements = DiagramMapper.map(originalGraph);
      
      // Inject metadata as Integration would
      elements.forEach(el => {
        el.metadata = { ...el.metadata, diagramId: 'test-diagram', diagramType: 'FLOWCHART' };
      });

      // Extract back to Graph
      const extractedGraph = DiagramStateExtractor.extractDiagram(elements, 'test-diagram');

      expect(extractedGraph.type).toBe('FLOWCHART');
      expect(extractedGraph.nodes.length).toBe(1);
      expect(extractedGraph.nodes[0].id).toBe('auth');
      expect(extractedGraph.nodes[0].label).toBe('Auth');
      expect(extractedGraph.nodes[0].type).toBe('process');
    });
  });

  describe('Diagram ID Stability', () => {
    test('Generated elements preserve the passed diagramId', () => {
      const graph: PositionedGraph = {
        type: 'FLOWCHART',
        nodes: [{ id: 'n1', label: 'A', type: 'process', x: 0, y: 0, width: 100, height: 100 }],
        edges: [],
        metadata: {}
      };

      const result = DiagramCanvasIntegration.insertDiagram(graph, { origin: { x: 0, y: 0 }, diagramId: 'stable-id' });
      
      expect(result.length).toBeGreaterThan(0);
      result.forEach(el => {
        expect(el.metadata?.diagramId).toBe('stable-id');
      });
    });
  });
});
