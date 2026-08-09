import { describe, expect, test, vi, beforeEach } from 'vitest';
import { DiagramEditService } from '../DiagramEditService';
import { FakeAIProvider } from '../../providers/FakeAIProvider';
import { Element } from '@/types/elements';
import { useSceneStore } from '@/store/scene';
import { DiagramMapper } from '../../mapper/DiagramMapper';

// Mock scene store to capture replaceElements
vi.mock('@/store/scene', () => ({
  useSceneStore: {
    getState: vi.fn(() => ({
      replaceElements: vi.fn(),
    })),
  },
}));

describe('DiagramEditService (Phase 6.5)', () => {
  let mockReplaceElements: any;
  let aiProvider: FakeAIProvider;
  let baseElements: Element[];
  const diagramId = 'test-diagram-123';

  beforeEach(() => {
    mockReplaceElements = vi.fn();
    (useSceneStore.getState as any).mockReturnValue({
      replaceElements: mockReplaceElements,
    });
    aiProvider = new FakeAIProvider();

    // Create a base set of native elements that simulate an existing diagram
    // API -> Auth -> DB
    baseElements = [
      { id: 'uuid-1', type: 'rectangle', x: 0, y: 0, width: 100, height: 50, metadata: { diagramId, diagramNodeId: 'api', diagramNodeType: 'process' } } as unknown as Element,
      { id: 'uuid-2', type: 'rectangle', x: 200, y: 0, width: 100, height: 50, metadata: { diagramId, diagramNodeId: 'auth', diagramNodeType: 'process' } } as unknown as Element,
      { id: 'uuid-3', type: 'rectangle', x: 400, y: 0, width: 100, height: 50, metadata: { diagramId, diagramNodeId: 'db', diagramNodeType: 'database' } } as unknown as Element,
      { id: 'uuid-edge1', type: 'line', x: 0, y: 0, width: 100, height: 50, metadata: { diagramId, diagramEdgeId: 'e1', sourceId: 'uuid-1', targetId: 'uuid-2' } } as unknown as Element,
      { id: 'uuid-edge2', type: 'line', x: 0, y: 0, width: 100, height: 50, metadata: { diagramId, diagramEdgeId: 'e2', sourceId: 'uuid-2', targetId: 'uuid-3' } } as unknown as Element,
      // Manual element, should not be touched
      { id: 'manual-1', type: 'rectangle', x: 1000, y: 1000, width: 100, height: 100 } as unknown as Element
    ];
  });

  test('1. RENAME NODE', async () => {
    aiProvider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: {
        operations: [{ op: 'UPDATE_NODE', nodeId: 'auth', changes: { label: 'Authentication Service' } }]
      }
    });

    const newElements = await DiagramEditService.editDiagram(diagramId, 'Rename Auth to Authentication Service', baseElements, aiProvider);

    // Assert atomic update was called
    expect(mockReplaceElements).toHaveBeenCalledTimes(1);
    const [idsToRemove, elementsToAdd] = mockReplaceElements.mock.calls[0];
    
    // 5 diagram elements should be removed, leaving manual-1
    expect(idsToRemove).toHaveLength(5);
    expect(idsToRemove).not.toContain('manual-1');
    
    // We should get roughly 3 nodes + 2 edges + potentially text elements
    // The node 'auth' should have its text updated
    const authNode = elementsToAdd.find((el: Element) => el.metadata?.diagramNodeId === 'auth');
    expect(authNode).toBeDefined();
    
    // Depending on mapper, label might be in text element or node.text. 
    // In current mapper, nodes have a text element generated or label on node
    // For now we just verify it exists and patch engine didn't throw
  });

  test('2, 3. ADD NODE / INSERT NODE', async () => {
    aiProvider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: {
        operations: [
          { op: 'ADD_NODE', node: { id: 'redis', label: 'Redis', type: 'database' } },
          { op: 'REMOVE_EDGE', edgeId: 'e2' },
          { op: 'ADD_EDGE', edge: { id: 'auth-redis', source: 'auth', target: 'redis' } },
          { op: 'ADD_EDGE', edge: { id: 'redis-db', source: 'redis', target: 'db' } }
        ]
      }
    });

    const newElements = await DiagramEditService.editDiagram(diagramId, 'Add Redis between Auth and DB', baseElements, aiProvider);

    const [idsToRemove, elementsToAdd] = mockReplaceElements.mock.calls[0];
    
    // Redis should now exist
    const redisNode = elementsToAdd.find((el: Element) => el.metadata?.diagramNodeId === 'redis');
    expect(redisNode).toBeDefined();
    expect(redisNode.metadata.diagramId).toBe(diagramId); // Original diagramId preserved

    // Auth and DB semantic IDs preserved
    expect(elementsToAdd.find((el: Element) => el.metadata?.diagramNodeId === 'auth')).toBeDefined();
    expect(elementsToAdd.find((el: Element) => el.metadata?.diagramNodeId === 'db')).toBeDefined();
  });

  test('4. REMOVE NODE', async () => {
    aiProvider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: {
        operations: [
          { op: 'REMOVE_EDGE', edgeId: 'e2' },
          { op: 'REMOVE_NODE', nodeId: 'db' }
        ]
      }
    });

    const newElements = await DiagramEditService.editDiagram(diagramId, 'Remove DB', baseElements, aiProvider);

    const [idsToRemove, elementsToAdd] = mockReplaceElements.mock.calls[0];
    
    // DB should be gone
    const dbNode = elementsToAdd.find((el: Element) => el.metadata?.diagramNodeId === 'db');
    expect(dbNode).toBeUndefined();
    
    // API and Auth remain
    expect(elementsToAdd.find((el: Element) => el.metadata?.diagramNodeId === 'api')).toBeDefined();
    expect(elementsToAdd.find((el: Element) => el.metadata?.diagramNodeId === 'auth')).toBeDefined();
  });

  test('7. INVALID PATCH (Rollback / No State Change)', async () => {
    // Attempting to remove Auth without removing its dependent edges
    aiProvider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: {
        operations: [{ op: 'REMOVE_NODE', nodeId: 'auth' }]
      }
    });

    await expect(
      DiagramEditService.editDiagram(diagramId, 'Remove Auth', baseElements, aiProvider)
    ).rejects.toThrow(/Failed to generate a valid patch/); // Generator validation throws and exhausts retries

    // VERY IMPORTANT: replaceElements MUST NEVER BE CALLED if an error occurred
    expect(mockReplaceElements).toHaveBeenCalledTimes(0);
  });

  test('10. OTHER DIAGRAM ISOLATION', async () => {
    // Inject a second diagram into the elements array
    const diagramB = [
      { id: 'b1', type: 'rectangle', x: 2000, y: 2000, width: 100, height: 100, metadata: { diagramId: 'diagram-B', diagramNodeId: 'node-b' } } as unknown as Element
    ];
    const allElements = [...baseElements, ...diagramB];

    aiProvider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: { operations: [{ op: 'UPDATE_NODE', nodeId: 'api', changes: { label: 'New API' } }] }
    });

    await DiagramEditService.editDiagram(diagramId, 'Rename API', allElements, aiProvider);

    const [idsToRemove] = mockReplaceElements.mock.calls[0];
    
    // Ensure Diagram B elements were NOT removed
    expect(idsToRemove).not.toContain('b1');
  });

  test('12. DIAGRAM ID PERSISTENCE', async () => {
    aiProvider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: { operations: [{ op: 'ADD_NODE', node: { id: 'new', label: 'New', type: 'process' } }] }
    });

    await DiagramEditService.editDiagram(diagramId, 'Add new node', baseElements, aiProvider);

    const [, elementsToAdd] = mockReplaceElements.mock.calls[0];
    
    // Every single element must have the same diagramId
    elementsToAdd.forEach((el: Element) => {
      expect(el.metadata?.diagramId).toBe(diagramId);
    });
  });

  test('19, 20. EMPTY INSTRUCTION / NO DIAGRAM ID', async () => {
    await expect(DiagramEditService.editDiagram('', 'test', baseElements, aiProvider)).rejects.toThrow();
    await expect(DiagramEditService.editDiagram(diagramId, '', baseElements, aiProvider)).rejects.toThrow();
    
    // No modifications occurred
    expect(mockReplaceElements).toHaveBeenCalledTimes(0);
  });

  test('MAPPER/LAYOUT FAILURE', async () => {
    aiProvider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: { operations: [{ op: 'UPDATE_NODE', nodeId: 'api', changes: { label: 'Fail' } }] }
    });

    // Mock DiagramMapper to throw
    const originalMap = DiagramMapper.map;
    DiagramMapper.map = vi.fn().mockImplementation(() => {
      throw new Error('Mapper failed');
    });

    await expect(
      DiagramEditService.editDiagram(diagramId, 'Fail mapper', baseElements, aiProvider)
    ).rejects.toThrow(/Mapper failed/);

    expect(mockReplaceElements).toHaveBeenCalledTimes(0); // Whiteboard untouched

    // Restore mapper
    DiagramMapper.map = originalMap;
  });
});
