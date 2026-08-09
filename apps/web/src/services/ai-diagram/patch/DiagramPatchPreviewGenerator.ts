import { DiagramGraph } from '@/types/ai-diagram';
import { DiagramPatch, AddNodeOperation, RemoveNodeOperation, UpdateNodeOperation, AddEdgeOperation, RemoveEdgeOperation, UpdateEdgeOperation } from './DiagramPatch';
import { DiagramPatchPreview, PatchPreviewChange } from './DiagramPatchPreview';

export class DiagramPatchPreviewGenerator {
  public static generatePreview(currentGraph: DiagramGraph, patch: DiagramPatch): DiagramPatchPreview {
    const additions: Extract<PatchPreviewChange, { kind: 'ADD_NODE' }>[] = [];
    const removals: Extract<PatchPreviewChange, { kind: 'REMOVE_NODE' }>[] = [];
    const updates: Extract<PatchPreviewChange, { kind: 'UPDATE_NODE' }>[] = [];
    const connectionChanges: Extract<PatchPreviewChange, { kind: 'ADD_EDGE' | 'REMOVE_EDGE' | 'UPDATE_EDGE' }>[] = [];
    let totalChanges = 0;

    for (const op of patch.operations) {
      switch (op.op) {
        case 'ADD_NODE': {
          additions.push({
            kind: 'ADD_NODE',
            nodeId: op.node.id,
            label: op.node.label || op.node.id,
            nodeType: op.node.type,
          });
          totalChanges++;
          break;
        }
        case 'REMOVE_NODE': {
          const node = currentGraph.nodes.find(n => n.id === op.nodeId);
          if (!node) {
            throw new Error(`DiagramPatchPreviewGenerator: Cannot remove unknown node '${op.nodeId}'`);
          }
          removals.push({
            kind: 'REMOVE_NODE',
            nodeId: op.nodeId,
            label: node.label || node.id,
          });
          totalChanges++;
          break;
        }
        case 'UPDATE_NODE': {
          const node = currentGraph.nodes.find(n => n.id === op.nodeId);
          if (!node) {
            throw new Error(`DiagramPatchPreviewGenerator: Cannot update unknown node '${op.nodeId}'`);
          }
          updates.push({
            kind: 'UPDATE_NODE',
            nodeId: op.nodeId,
            label: node.label || node.id,
            beforeLabel: op.changes.label !== undefined ? node.label : undefined,
            afterLabel: op.changes.label,
            beforeType: op.changes.type !== undefined ? node.type : undefined,
            afterType: op.changes.type,
          });
          totalChanges++;
          break;
        }
        case 'ADD_EDGE': {
          const sourceNode = currentGraph.nodes.find(n => n.id === op.edge.source) || patch.operations.find(o => o.op === 'ADD_NODE' && (o as AddNodeOperation).node.id === op.edge.source) as unknown as { node: { id: string, label?: string }};
          const targetNode = currentGraph.nodes.find(n => n.id === op.edge.target) || patch.operations.find(o => o.op === 'ADD_NODE' && (o as AddNodeOperation).node.id === op.edge.target) as unknown as { node: { id: string, label?: string }};
          
          if (!sourceNode) {
            throw new Error(`DiagramPatchPreviewGenerator: Unknown source node '${op.edge.source}' in edge '${op.edge.id}'`);
          }
          if (!targetNode) {
            throw new Error(`DiagramPatchPreviewGenerator: Unknown target node '${op.edge.target}' in edge '${op.edge.id}'`);
          }

          const sourceLabel = ('node' in sourceNode ? sourceNode.node.label : sourceNode.label) || op.edge.source;
          const targetLabel = ('node' in targetNode ? targetNode.node.label : targetNode.label) || op.edge.target;

          connectionChanges.push({
            kind: 'ADD_EDGE',
            edgeId: op.edge.id,
            sourceLabel,
            targetLabel,
            label: op.edge.label,
          });
          totalChanges++;
          break;
        }
        case 'REMOVE_EDGE': {
          const edge = currentGraph.edges.find(e => e.id === op.edgeId);
          if (!edge) {
            throw new Error(`DiagramPatchPreviewGenerator: Cannot remove unknown edge '${op.edgeId}'`);
          }
          const sourceNode = currentGraph.nodes.find(n => n.id === edge.source);
          const targetNode = currentGraph.nodes.find(n => n.id === edge.target);

          connectionChanges.push({
            kind: 'REMOVE_EDGE',
            edgeId: op.edgeId,
            sourceLabel: sourceNode?.label || edge.source,
            targetLabel: targetNode?.label || edge.target,
            label: edge.label,
          });
          totalChanges++;
          break;
        }
        case 'UPDATE_EDGE': {
          const edge = currentGraph.edges.find(e => e.id === op.edgeId);
          if (!edge) {
            throw new Error(`DiagramPatchPreviewGenerator: Cannot update unknown edge '${op.edgeId}'`);
          }
          const sourceNode = currentGraph.nodes.find(n => n.id === edge.source);
          const targetNode = currentGraph.nodes.find(n => n.id === edge.target);
          
          connectionChanges.push({
            kind: 'UPDATE_EDGE',
            edgeId: op.edgeId,
            sourceLabel: sourceNode?.label || edge.source,
            targetLabel: targetNode?.label || edge.target,
            beforeLabel: op.changes.label !== undefined ? edge.label : undefined,
            afterLabel: op.changes.label,
          });
          totalChanges++;
          break;
        }
      }
    }

    return {
      additions,
      removals,
      updates,
      connectionChanges,
      totalChanges,
    };
  }
}
