import { expect, test, describe } from 'vitest';
import { LayoutFactory } from '../LayoutFactory';
import { DiagramGraph } from '../../../../types/ai-diagram';

describe('Auto Layout Module', () => {
  const createBaseGraph = (type: DiagramGraph['type']): DiagramGraph => ({
    nodes: {},
    edges: {},
    type,
    metadata: {}
  });

  test('Gracefully handles empty graph', async () => {
    const engine = LayoutFactory.getLayout('FLOWCHART');
    const graph = createBaseGraph('FLOWCHART');
    
    const positioned = await engine.layout(graph);
    expect(Object.keys(positioned.nodes).length).toBe(0);
  });

  test('Single node is positioned', async () => {
    const engine = LayoutFactory.getLayout('FLOWCHART');
    const graph = createBaseGraph('FLOWCHART');
    graph.nodes['n1'] = { id: 'n1', label: 'Node 1', type: 'step' };
    
    const positioned = await engine.layout(graph);
    expect(positioned.nodes['n1']).toBeDefined();
    expect(positioned.nodes['n1'].x).toBeTypeOf('number');
  });

  test('Deterministic output (running twice yields same result)', async () => {
    const engine = LayoutFactory.getLayout('FLOWCHART');
    const graph = createBaseGraph('FLOWCHART');
    graph.nodes['n1'] = { id: 'n1', label: 'A', type: 'step' };
    graph.nodes['n2'] = { id: 'n2', label: 'B', type: 'step' };
    graph.edges['e1'] = { id: 'e1', source: 'n1', target: 'n2' };
    
    const run1 = await engine.layout(graph);
    const run2 = await engine.layout(graph);
    
    expect(run1.nodes['n1'].x).toBe(run2.nodes['n1'].x);
    expect(run1.nodes['n1'].y).toBe(run2.nodes['n1'].y);
    expect(run1.nodes['n2'].x).toBe(run2.nodes['n2'].x);
    expect(run1.nodes['n2'].y).toBe(run2.nodes['n2'].y);
  });

  test('Vertical flow positions B below A', async () => {
    const engine = LayoutFactory.getLayout('FLOWCHART');
    const graph = createBaseGraph('FLOWCHART');
    graph.nodes['n1'] = { id: 'n1', label: 'A', type: 'step' };
    graph.nodes['n2'] = { id: 'n2', label: 'B', type: 'step' };
    graph.edges['e1'] = { id: 'e1', source: 'n1', target: 'n2' };
    
    const positioned = await engine.layout(graph);
    expect(positioned.nodes['n2'].y).toBeGreaterThan(positioned.nodes['n1'].y);
  });

  test('Horizontal flow positions B to the right of A', async () => {
    // ER_DIAGRAM defaults to HorizontalFlowStrategy in our factory
    const engine = LayoutFactory.getLayout('ER_DIAGRAM');
    const graph = createBaseGraph('ER_DIAGRAM');
    graph.nodes['n1'] = { id: 'n1', label: 'A', type: 'step' };
    graph.nodes['n2'] = { id: 'n2', label: 'B', type: 'step' };
    graph.edges['e1'] = { id: 'e1', source: 'n1', target: 'n2' };
    
    const positioned = await engine.layout(graph);
    expect(positioned.nodes['n2'].x).toBeGreaterThan(positioned.nodes['n1'].x);
  });

  test('Multiple roots and disconnected nodes are handled gracefully', async () => {
    const engine = LayoutFactory.getLayout('FLOWCHART');
    const graph = createBaseGraph('FLOWCHART');
    graph.nodes['n1'] = { id: 'n1', label: 'Root 1', type: 'step' };
    graph.nodes['n2'] = { id: 'n2', label: 'Root 2', type: 'step' };
    graph.nodes['n3'] = { id: 'n3', label: 'Child 1', type: 'step' };
    graph.nodes['disconnected'] = { id: 'disconnected', label: 'Orphan', type: 'step' };
    
    graph.edges['e1'] = { id: 'e1', source: 'n1', target: 'n3' };
    
    const positioned = await engine.layout(graph);
    expect(positioned.nodes['n1'].x).toBeTypeOf('number');
    expect(positioned.nodes['n2'].x).toBeTypeOf('number');
    expect(positioned.nodes['n3'].x).toBeTypeOf('number');
    expect(positioned.nodes['disconnected'].x).toBeTypeOf('number');
  });
});
