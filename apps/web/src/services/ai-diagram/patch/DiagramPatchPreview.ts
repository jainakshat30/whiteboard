export type PatchPreviewChange = 
  | { kind: 'ADD_NODE', nodeId: string, label: string, nodeType: string }
  | { kind: 'REMOVE_NODE', nodeId: string, label: string }
  | { kind: 'UPDATE_NODE', nodeId: string, label: string, beforeLabel?: string, afterLabel?: string, beforeType?: string, afterType?: string }
  | { kind: 'ADD_EDGE', edgeId: string, sourceLabel: string, targetLabel: string, label?: string }
  | { kind: 'REMOVE_EDGE', edgeId: string, sourceLabel: string, targetLabel: string, label?: string }
  | { kind: 'UPDATE_EDGE', edgeId: string, sourceLabel: string, targetLabel: string, beforeLabel?: string, afterLabel?: string };

export interface DiagramPatchPreview {
  additions: Extract<PatchPreviewChange, { kind: 'ADD_NODE' }>[];
  removals: Extract<PatchPreviewChange, { kind: 'REMOVE_NODE' }>[];
  updates: Extract<PatchPreviewChange, { kind: 'UPDATE_NODE' }>[];
  connectionChanges: Extract<PatchPreviewChange, { kind: 'ADD_EDGE' | 'REMOVE_EDGE' | 'UPDATE_EDGE' }>[];
  totalChanges: number;
}
