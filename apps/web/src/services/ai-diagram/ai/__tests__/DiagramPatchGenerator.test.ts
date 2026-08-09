import { describe, expect, test, beforeEach } from 'vitest';
import { DiagramPatchGenerator } from '../DiagramPatchGenerator';
import { FakeAIProvider } from '../../providers/FakeAIProvider';
import { DiagramGraph } from '@/types/ai-diagram';
import { DiagramEditResponse } from '../../patch/DiagramPatch';

describe('DiagramPatchGenerator', () => {
  let provider: FakeAIProvider;
  let generator: DiagramPatchGenerator;
  let baseGraph: DiagramGraph;

  beforeEach(() => {
    provider = new FakeAIProvider();
    generator = new DiagramPatchGenerator(provider);
    baseGraph = {
      nodes: [
        { id: 'api', label: 'API Gateway', type: 'process' },
        { id: 'auth', label: 'Auth Service', type: 'process' },
        { id: 'db', label: 'Database', type: 'database' }
      ],
      edges: [
        { id: 'e1', source: 'api', target: 'auth' },
        { id: 'e2', source: 'auth', target: 'db' }
      ],
      type: 'FLOWCHART',
      metadata: {}
    };
  });

  test('1. RENAME', async () => {
    provider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: {
        operations: [{ op: 'UPDATE_NODE', nodeId: 'auth', changes: { label: 'Authentication Service' } }]
      }
    });

    const response = await generator.generatePatch(baseGraph, 'Rename Auth to Authentication Service.');
    expect(response.status).toBe('SUCCESS');
    if (response.status === 'SUCCESS') {
      expect(response.patch.operations).toHaveLength(1);
      expect(response.patch.operations[0].op).toBe('UPDATE_NODE');
    }
  });

  test('2. ADD NODE', async () => {
    provider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: {
        operations: [{ op: 'ADD_NODE', node: { id: 'redis', label: 'Redis', type: 'database' } }]
      }
    });

    const response = await generator.generatePatch(baseGraph, 'Add Redis.');
    expect(response.status).toBe('SUCCESS');
    if (response.status === 'SUCCESS') {
      expect(response.patch.operations[0].op).toBe('ADD_NODE');
    }
  });

  test('3. ADD BETWEEN NODES', async () => {
    provider.mockResponseQueue.push({
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

    const response = await generator.generatePatch(baseGraph, 'Add Redis between Auth and PostgreSQL.');
    expect(response.status).toBe('SUCCESS');
    if (response.status === 'SUCCESS') {
      expect(response.patch.operations).toHaveLength(4);
    }
  });

  test('4. DELETE NODE', async () => {
    provider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: {
        operations: [
          { op: 'REMOVE_EDGE', edgeId: 'e1' },
          { op: 'REMOVE_EDGE', edgeId: 'e2' },
          { op: 'REMOVE_NODE', nodeId: 'auth' }
        ]
      }
    });

    const response = await generator.generatePatch(baseGraph, 'Remove Auth Service.');
    expect(response.status).toBe('SUCCESS');
    if (response.status === 'SUCCESS') {
      expect(response.patch.operations).toHaveLength(3);
    }
  });

  test('5. ADD CONNECTION', async () => {
    provider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: {
        operations: [{ op: 'ADD_EDGE', edge: { id: 'api-db', source: 'api', target: 'db' } }]
      }
    });

    const response = await generator.generatePatch(baseGraph, 'Connect API Gateway to Database.');
    expect(response.status).toBe('SUCCESS');
  });

  test('6. CHANGE TYPE', async () => {
    provider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: {
        operations: [{ op: 'UPDATE_NODE', nodeId: 'db', changes: { type: 'cloud' } }]
      }
    });

    const response = await generator.generatePatch(baseGraph, 'Change Database to a cloud type.');
    expect(response.status).toBe('SUCCESS');
  });

  test('7. NO-OP', async () => {
    provider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: { operations: [] }
    });

    const response = await generator.generatePatch(baseGraph, 'Connect API to Auth.');
    expect(response.status).toBe('SUCCESS');
    if (response.status === 'SUCCESS') {
      expect(response.patch.operations).toHaveLength(0);
    }
  });

  test('8. AMBIGUITY', async () => {
    provider.mockResponseQueue.push({
      status: 'NEEDS_CLARIFICATION',
      message: 'Which database do you want to remove?'
    });

    const response = await generator.generatePatch(baseGraph, 'Remove the database.');
    expect(response.status).toBe('NEEDS_CLARIFICATION');
    if (response.status === 'NEEDS_CLARIFICATION') {
      expect(response.message).toBe('Which database do you want to remove?');
    }
  });

  test('9. INVALID GENERATED PATCH (Semantic Rejection & Retry)', async () => {
    // Attempt 1: Tries to add an edge to a nonexistent node 'missing' (Semantic failure)
    provider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: {
        operations: [{ op: 'ADD_EDGE', edge: { id: 'e3', source: 'auth', target: 'missing' } }]
      }
    });

    // Attempt 2: AI fixes the mistake by adding the node first
    provider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: {
        operations: [
          { op: 'ADD_NODE', node: { id: 'missing', label: 'Missing Node', type: 'process' } },
          { op: 'ADD_EDGE', edge: { id: 'e3', source: 'auth', target: 'missing' } }
        ]
      }
    });

    const response = await generator.generatePatch(baseGraph, 'Connect Auth to missing node.');
    expect(provider.callCount).toBe(2);
    expect(response.status).toBe('SUCCESS');
    if (response.status === 'SUCCESS') {
      expect(response.patch.operations).toHaveLength(2);
    }
  });

  test('10. MULTIPLE RETRIES (Fails after max retries)', async () => {
    // 3 invalid attempts
    for (let i = 0; i < 3; i++) {
      provider.mockResponseQueue.push({
        status: 'SUCCESS',
        patch: {
          operations: [{ op: 'ADD_EDGE', edge: { id: 'e3', source: 'auth', target: 'missing' } }]
        }
      });
    }

    await expect(generator.generatePatch(baseGraph, 'Connect Auth to missing.', 3)).rejects.toThrow(/Failed to generate a valid patch/);
    expect(provider.callCount).toBe(3);
  });

  test('11. COORDINATE HALLUCINATION (Zod Rejection & Retry)', async () => {
    // Attempt 1: Schema hallucination (includes layout 'x' inside changes)
    provider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: {
        operations: [{ op: 'UPDATE_NODE', nodeId: 'auth', changes: { x: 500 } }] // x is not allowed
      }
    } as any); // cast to bypass local ts check since it simulates runtime LLM response

    // Attempt 2: Corrects it by not including coordinates
    provider.mockResponseQueue.push({
      status: 'SUCCESS',
      patch: {
        operations: [{ op: 'UPDATE_NODE', nodeId: 'auth', changes: { label: 'Corrected' } }]
      }
    });

    const response = await generator.generatePatch(baseGraph, 'Move Auth right and rename.');
    expect(provider.callCount).toBe(2); // Retried after Zod validation threw
    expect(response.status).toBe('SUCCESS');
  });
});
