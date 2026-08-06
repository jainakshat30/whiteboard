export type DiagramType = 
  | 'FLOWCHART' 
  | 'MINDMAP' 
  | 'ER_DIAGRAM' 
  | 'SEQUENCE_DIAGRAM' 
  | 'UML' 
  | 'NETWORK_GRAPH';

export interface DiagramNode {
  id: string;
  label: string;
  type: string;
  metadata?: Record<string, any>;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  metadata?: Record<string, any>;
}

export interface DiagramGraph {
  nodes: Record<string, DiagramNode>;
  edges: Record<string, DiagramEdge>;
  type: DiagramType;
  metadata: Record<string, any>;
}
