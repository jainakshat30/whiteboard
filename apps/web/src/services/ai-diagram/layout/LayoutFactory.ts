import { DiagramType } from '../../../types/ai-diagram';
import { ILayoutEngine } from './ILayoutEngine';
import { ElkLayoutEngine } from './ElkLayoutEngine';
import { VerticalFlowStrategy } from './strategies/VerticalFlowStrategy';
import { HorizontalFlowStrategy } from './strategies/HorizontalFlowStrategy';
import { TreeLayoutStrategy } from './strategies/TreeLayoutStrategy';

export class LayoutFactory {
  /**
   * Resolves the appropriate engine and strategy based on the diagram type.
   * Isolates instantiation logic from the rest of the application.
   */
  static getLayout(diagramType: DiagramType): ILayoutEngine {
    switch (diagramType) {
      case 'MINDMAP':
        return new ElkLayoutEngine(new TreeLayoutStrategy());
      case 'FLOWCHART':
        return new ElkLayoutEngine(new VerticalFlowStrategy());
      case 'ER_DIAGRAM':
      case 'UML':
      case 'SEQUENCE_DIAGRAM':
      case 'NETWORK_GRAPH': 
        return new ElkLayoutEngine(new HorizontalFlowStrategy());
      default:
        // Default fallback
        return new ElkLayoutEngine(new VerticalFlowStrategy());
    }
  }
}
