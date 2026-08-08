import { expect, test, describe } from 'vitest';
import { LayoutFactory } from '../LayoutFactory';
import { DiagramGraph, DiagramNode, DiagramEdge } from '../../../../types/ai-diagram';

describe('Auto Layout Benchmark', () => {
  const generateGraph = (numNodes: number): DiagramGraph => {
    const nodes: Record<string, DiagramNode> = {};
    const edges: Record<string, DiagramEdge> = {};

    for (let i = 0; i < numNodes; i++) {
      const id = `n${i}`;
      nodes[id] = { id, label: `Node ${i}`, type: 'step' };
      
      // Connect to the previous node to create a linear graph, plus a few random connections for complexity
      if (i > 0) {
        const edgeId = `e${i - 1}-${i}`;
        edges[edgeId] = { id: edgeId, source: `n${i - 1}`, target: id };
      }
      
      if (i > 5 && i % 3 === 0) {
        const randomTarget = `n${Math.floor(Math.random() * (i - 1))}`;
        const randomEdgeId = `erand-${i}-${randomTarget}`;
        edges[randomEdgeId] = { id: randomEdgeId, source: id, target: randomTarget };
      }
    }

    return {
      nodes,
      edges,
      type: 'FLOWCHART',
      metadata: {}
    };
  };

  const runBenchmark = async (numNodes: number) => {
    const engine = LayoutFactory.getLayout('FLOWCHART');
    const graph = generateGraph(numNodes);
    
    let duration = 0;
    const positioned = await engine.layout(graph, {
      onLayoutCompleted: (ms) => {
        duration = ms;
      }
    });

    expect(positioned.layoutMetadata).toBeDefined();
    expect(positioned.layoutMetadata!.layoutDuration).toBeGreaterThan(0);
    
    console.log(`Benchmark (${numNodes} nodes): Layout took ${duration.toFixed(2)}ms, Diagram size: ${positioned.layoutMetadata!.diagramWidth}x${positioned.layoutMetadata!.diagramHeight}`);
    
    // Check coordinate stability by running a second time
    const positioned2 = await engine.layout(graph);
    expect(positioned.nodes['n0'].x).toBe(positioned2.nodes['n0'].x);
    expect(positioned.nodes[`n${numNodes - 1}`].y).toBe(positioned2.nodes[`n${numNodes - 1}`].y);
    
    return duration;
  };

  test('Benchmark: 10 nodes', async () => {
    await runBenchmark(10);
  });

  test('Benchmark: 50 nodes', async () => {
    await runBenchmark(50);
  });

  test('Benchmark: 100 nodes', async () => {
    await runBenchmark(100);
  });

  test('Benchmark: 500 nodes', async () => {
    await runBenchmark(500);
  });

  // Skip 1000 nodes by default in normal test runs to save time, but define it for manual benchmarking
  test.skip('Benchmark: 1000 nodes', async () => {
    await runBenchmark(1000);
  });
});
