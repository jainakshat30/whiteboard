import { describe, expect, test, vi, beforeEach } from 'vitest';
import { DiagramEditService } from '../DiagramEditService';
import { FakeAIProvider } from '../../providers/FakeAIProvider';
import { Element } from '@/types/elements';
import { useSceneStore } from '@/store/scene';
import { DiagramPatchGenerator } from '../../ai/DiagramPatchGenerator';

vi.mock('@/store/scene', () => ({
  useSceneStore: {
    getState: vi.fn(() => ({
      replaceElements: vi.fn(),
    })),
  },
}));

describe('DiagramIntelligence (Phase 6.8)', () => {
  let mockReplaceElements: any;
  let aiProvider: FakeAIProvider;
  let baseElements: Element[];
  const diagramId = 'intelligent-diagram';

  const editDiagramHelper = async (dId: string, instruction: string, els: Element[], ai: any) => {
    const prepared = await DiagramEditService.prepareEdit(dId, instruction, els, ai);
    return DiagramEditService.applyPreparedEdit(prepared, els);
  };

  beforeEach(() => {
    mockReplaceElements = vi.fn();
    (useSceneStore.getState as any).mockReturnValue({
      replaceElements: mockReplaceElements,
    });
    aiProvider = new FakeAIProvider();

    // Base Graph: API -> Auth -> PostgreSQL
    baseElements = [
      { id: 'uuid-api', type: 'rectangle', x: 0, y: 0, width: 100, height: 50, metadata: { diagramId, diagramNodeId: 'api', diagramNodeType: 'process' } } as unknown as Element,
      { id: 'uuid-auth', type: 'rectangle', x: 200, y: 0, width: 100, height: 50, metadata: { diagramId, diagramNodeId: 'auth', diagramNodeType: 'process' } } as unknown as Element,
      { id: 'uuid-db', type: 'rectangle', x: 400, y: 0, width: 100, height: 50, metadata: { diagramId, diagramNodeId: 'db', diagramNodeType: 'database' } } as unknown as Element,
      { id: 'uuid-edge1', type: 'line', x: 0, y: 0, width: 100, height: 50, metadata: { diagramId, diagramEdgeId: 'e1', sourceId: 'uuid-api', targetId: 'uuid-auth' } } as unknown as Element,
      { id: 'uuid-edge2', type: 'line', x: 0, y: 0, width: 100, height: 50, metadata: { diagramId, diagramEdgeId: 'e2', sourceId: 'uuid-auth', targetId: 'uuid-db' } } as unknown as Element,
    ];
  });

  test('1. MINIMAL PATCH / ENTITY RESOLUTION', async () => {
    // Instruction: "Rename Auth to Authentication Service."
    // AI should resolve to 'auth' and issue exactly 1 UPDATE_NODE.
    aiProvider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: { operations: [{ op: 'UPDATE_NODE', nodeId: 'auth', changes: { label: 'Authentication Service' } }] }
    });

    const newElements = await editDiagramHelper(diagramId, 'Rename Auth to Authentication Service', baseElements, aiProvider);
    
    // We expect the atomic update to occur exactly once
    expect(mockReplaceElements).toHaveBeenCalledTimes(1);
    
    const [, elementsToAdd] = mockReplaceElements.mock.calls[0];
    const authNode = elementsToAdd.find((el: Element) => el.metadata?.diagramNodeId === 'auth');
    
    // The exact node ID 'auth' should be preserved.
    expect(authNode).toBeDefined();
    // Operations were minimal - API and DB remain completely unmodified in terms of ID
    expect(elementsToAdd.find((el: Element) => el.metadata?.diagramNodeId === 'api')).toBeDefined();
    expect(elementsToAdd.find((el: Element) => el.metadata?.diagramNodeId === 'db')).toBeDefined();
  });

  test('2. DUPLICATE PREVENTION (NO-OP)', async () => {
    // Instruction: "Add PostgreSQL."
    // AI sees PostgreSQL ('db') already exists. It returns empty operations.
    aiProvider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: { operations: [] }
    });

    const prepared = await DiagramEditService.prepareEdit(diagramId, 'Add PostgreSQL', baseElements, aiProvider);
    
    // Since totalChanges === 0, the preview will indicate "No changes are needed."
    expect(prepared.preview.totalChanges).toBe(0);
    
    // If applied, it still successfully layouts and maps, but practically nothing changes.
    await DiagramEditService.applyPreparedEdit(prepared, baseElements);
    expect(mockReplaceElements).toHaveBeenCalledTimes(1);
  });

  test('3. AMBIGUITY (NEEDS_CLARIFICATION)', async () => {
    // Instruction: "Remove the database."
    // If there were multiple DBs, AI would return NEEDS_CLARIFICATION.
    aiProvider.mockResponseQueue.push({
      status: 'NEEDS_CLARIFICATION',
      message: 'Which database do you want to remove?'
    });

    await expect(
      DiagramEditService.prepareEdit(diagramId, 'Remove the database', baseElements, aiProvider)
    ).rejects.toThrow('Which database do you want to remove?');
    
    expect(mockReplaceElements).toHaveBeenCalledTimes(0); // Nothing applied
  });

  test('4. UNSUPPORTED REQUESTS (VISUAL)', async () => {
    // Instruction: "Move Auth to the left."
    // AI returns UNSUPPORTED_REQUEST
    aiProvider.mockResponseQueue.push({
      status: 'UNSUPPORTED_REQUEST',
      message: 'I can only modify the semantic structure of the diagram, not the visual layout.'
    });

    await expect(
      DiagramEditService.prepareEdit(diagramId, 'Move Auth to the left', baseElements, aiProvider)
    ).rejects.toThrow('I can only modify the semantic structure');
    
    expect(mockReplaceElements).toHaveBeenCalledTimes(0);
  });

  test('5. INSERTION ("BETWEEN")', async () => {
    // Instruction: "Add Redis between Auth and PostgreSQL."
    // The AI correctly infers REMOVE_EDGE(e2) and ADD_EDGEs.
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

    await editDiagramHelper(diagramId, 'Add Redis between Auth and PostgreSQL', baseElements, aiProvider);
    
    const [, elementsToAdd] = mockReplaceElements.mock.calls[0];
    
    // Auth, DB, and Redis are all present
    expect(elementsToAdd.find((el: Element) => el.metadata?.diagramNodeId === 'auth')).toBeDefined();
    expect(elementsToAdd.find((el: Element) => el.metadata?.diagramNodeId === 'db')).toBeDefined();
    expect(elementsToAdd.find((el: Element) => el.metadata?.diagramNodeId === 'redis')).toBeDefined();
  });

  test('6. REPLACEMENT', async () => {
    // Instruction: "Replace PostgreSQL with MongoDB."
    // The AI drops 'db', introduces 'mongodb', and remaps edges targeting 'db' to 'mongodb'.
    aiProvider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: { 
        operations: [
          { op: 'ADD_NODE', node: { id: 'mongodb', label: 'MongoDB', type: 'database' } },
          { op: 'REMOVE_EDGE', edgeId: 'e2' },
          { op: 'REMOVE_NODE', nodeId: 'db' },
          { op: 'ADD_EDGE', edge: { id: 'auth-mongodb', source: 'auth', target: 'mongodb' } }
        ] 
      }
    });

    await editDiagramHelper(diagramId, 'Replace PostgreSQL with MongoDB', baseElements, aiProvider);
    
    const [, elementsToAdd] = mockReplaceElements.mock.calls[0];
    
    expect(elementsToAdd.find((el: Element) => el.metadata?.diagramNodeId === 'db')).toBeUndefined();
    expect(elementsToAdd.find((el: Element) => el.metadata?.diagramNodeId === 'mongodb')).toBeDefined();
  });
});
