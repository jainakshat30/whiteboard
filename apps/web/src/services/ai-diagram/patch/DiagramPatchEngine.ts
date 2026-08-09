import { DiagramGraph } from '@/types/ai-diagram';
import { DiagramPatch } from './DiagramPatch';
import { DiagramEngine } from '../DiagramEngine';

export class DiagramPatchEngine {
  /**
   * Applies a DiagramPatch to a DiagramGraph deterministically.
   * Fails safely if invalid operations are found, halting execution.
   * Never mutates the original graph.
   * Returns a deeply new DiagramGraph instance.
   */
  public static apply(graph: DiagramGraph, patch: DiagramPatch): DiagramGraph {
    // 1. Deep clone graph to guarantee immutability
    const clonedGraph = JSON.parse(JSON.stringify(graph));
    
    // 2. Setup isolated engine
    const engine = new DiagramEngine(graph.type);
    
    try {
      engine.importJSON(JSON.stringify(clonedGraph));
    } catch (error: any) {
      throw new Error(`DiagramPatchEngine: Failed to import initial graph: ${error.message}`);
    }

    // 3. Apply operations strictly in order
    const operations = patch.operations || [];
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      try {
        switch (op.op) {
          case 'ADD_NODE': {
            engine.addNode(op.node);
            break;
          }
          
          case 'REMOVE_NODE': {
            const currentGraph = engine.getGraph();
            const dependentEdges = currentGraph.edges.filter(
              e => e.source === op.nodeId || e.target === op.nodeId
            );
            
            if (dependentEdges.length > 0) {
              throw new Error(`Cannot remove node '${op.nodeId}': dependent edge '${dependentEdges[0].id}' still exists. Explicitly remove edges first.`);
            }
            engine.removeNode(op.nodeId);
            break;
          }
          
          case 'UPDATE_NODE': {
            engine.updateNode(op.nodeId, op.changes);
            break;
          }
          
          case 'ADD_EDGE': {
            engine.addEdge(op.edge);
            break;
          }
          
          case 'REMOVE_EDGE': {
            engine.removeEdge(op.edgeId);
            break;
          }
          
          case 'UPDATE_EDGE': {
            engine.updateEdge(op.edgeId, op.changes);
            break;
          }
        }
      } catch (error: any) {
        // If an operation fails, halt completely and throw a deterministic domain error.
        // The original graph remains completely unmodified.
        throw new Error(`DiagramPatchEngine: Patch operation failed at index ${i} (${op.op}): ${error.message}`);
      }
    }

    // 4. Validate resulting structure
    const validationErrors = engine.validate();
    if (validationErrors.length > 0) {
      throw new Error(`DiagramPatchEngine: Resulting graph is invalid after patch application:\n${validationErrors.join('\n')}`);
    }

    // 5. Return the new canonical array-based graph
    return engine.getGraph();
  }
}
