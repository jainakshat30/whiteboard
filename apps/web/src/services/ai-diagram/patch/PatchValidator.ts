import { DiagramGraph } from '@/types/ai-diagram';
import { DiagramPatch, DiagramPatchSchema } from './DiagramPatch';
import { DiagramEngine } from '../DiagramEngine';

export class PatchValidator {
  /**
   * Deterministically validates a DiagramPatch against an existing DiagramGraph.
   * Applies all operations sequentially to a temporary DiagramEngine.
   * Does NOT mutate the input graph.
   * Returns an array of error messages. Empty array means valid.
   */
  public static validatePatch(graph: DiagramGraph, patch: DiagramPatch): string[] {
    const errors: string[] = [];

    // 1. Validate Schema
    const schemaResult = DiagramPatchSchema.safeParse(patch);
    if (!schemaResult.success) {
      errors.push(`Schema Validation Failed: ${schemaResult.error.message}`);
      return errors; // Schema failure aborts early
    }

    // 2. Setup isolated temporary engine
    const engine = new DiagramEngine(graph.type);
    
    // We deep clone graph to guarantee immutability before importing
    const clonedGraph = JSON.parse(JSON.stringify(graph));
    try {
      engine.importJSON(JSON.stringify(clonedGraph));
    } catch (e: any) {
      errors.push(`Initial Graph Import Failed: ${e.message}`);
      return errors;
    }

    // 3. Sequentially evaluate each operation
    const operations = patch.operations;

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      try {
        switch (op.op) {
          case 'ADD_NODE': {
            // DiagramEngine throws if duplicate ID
            engine.addNode(op.node);
            break;
          }
          
          case 'REMOVE_NODE': {
            // Check for orphaned edges BEFORE deleting
            const currentGraph = engine.getGraph();
            const dependentEdges = currentGraph.edges.filter(
              e => e.source === op.nodeId || e.target === op.nodeId
            );
            if (dependentEdges.length > 0) {
              throw new Error(`Cannot remove node '${op.nodeId}' because dependent edges still exist (e.g. '${dependentEdges[0].id}'). Remove edges explicitly first.`);
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
      } catch (e: any) {
        errors.push(`Operation [${i}] ${op.op} failed: ${e.message}`);
        // If an operation fails, sequential evaluation must halt because subsequent operations depend on its state.
        break; 
      }
    }

    return errors;
  }
}
