import { DiagramGraph, PositionedGraph } from '../../../types/ai-diagram';

export interface LayoutEvents {
  onBeforeLayout?: (graph: DiagramGraph) => void;
  onAfterLayout?: (graph: PositionedGraph) => void;
  onLayoutFailed?: (error: Error) => void;
  onLayoutCompleted?: (durationMs: number) => void;
}

export interface LayoutOptions extends LayoutEvents {
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalSpacing?: number;
  verticalSpacing?: number;
  margin?: number;
  align?: 'UL' | 'UR' | 'DL' | 'DR';
  edgeRouting?: 'straight' | 'orthogonal' | 'curved' | 'manhattan' | 'spline';
  animationPreferences?: Record<string, any>;
}

/**
 * Interface defining the contract for every layout engine.
 * No implementation details (like dagre or elk) should leak outside this interface.
 */
export interface ILayoutEngine {
  /**
   * Calculates coordinates for all nodes in the given graph without mutating it.
   * @param graph The abstract diagram graph
   * @param options The configuration options for the layout
   * @returns A new PositionedGraph with x, y, width, and height for each node
   */
  layout(graph: DiagramGraph, options?: Partial<LayoutOptions>): Promise<PositionedGraph>;
}
