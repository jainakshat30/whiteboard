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
  children?: string[]; // IDs of child nodes for compound nodes
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  metadata?: Record<string, any>;
  routing?: 'straight' | 'orthogonal' | 'curved' | 'manhattan' | 'spline';
}

export interface DiagramGraph {
  nodes: Record<string, DiagramNode>;
  edges: Record<string, DiagramEdge>;
  type: DiagramType;
  metadata: Record<string, any>;
}

export interface PositionedNode extends DiagramNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PositionedGraph {
  nodes: Record<string, PositionedNode>;
  edges: Record<string, DiagramEdge>;
  type: DiagramType;
  metadata: Record<string, any>;
  layoutMetadata?: LayoutMetadata;
}

export interface LayoutMetadata {
  layoutEngine: string;
  layoutStrategy: string;
  boundingBox: { width: number; height: number };
  diagramWidth: number;
  diagramHeight: number;
  layoutDuration: number;
  warnings: string[];
}
