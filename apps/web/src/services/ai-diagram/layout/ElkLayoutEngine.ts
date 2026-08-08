import ELK, { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import { DiagramGraph, PositionedGraph, PositionedNode, LayoutMetadata } from '../../../types/ai-diagram';
import { ILayoutEngine, LayoutOptions } from './ILayoutEngine';
import { ILayoutStrategy } from './strategies/ILayoutStrategy';
import { isGraphEmpty, handleEmptyGraph } from './helpers';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, HORIZONTAL_SPACING, VERTICAL_SPACING, DEFAULT_MARGIN } from './constants';

export class ElkLayoutEngine implements ILayoutEngine {
  private elk = new ELK();
  private strategy: ILayoutStrategy;

  constructor(strategy: ILayoutStrategy) {
    this.strategy = strategy;
  }

  async layout(graph: DiagramGraph, options: Partial<LayoutOptions> = {}): Promise<PositionedGraph> {
    const startTime = performance.now();

    // Trigger onBeforeLayout event
    if (options.onBeforeLayout) {
      options.onBeforeLayout(graph);
    }

    if (isGraphEmpty(graph)) {
      const emptyResult = handleEmptyGraph(graph);
      this.fireCompletedEvents(emptyResult, startTime, options);
      return emptyResult;
    }

    // Merge options with defaults
    const config = {
      nodeWidth: options.nodeWidth || DEFAULT_NODE_WIDTH,
      nodeHeight: options.nodeHeight || DEFAULT_NODE_HEIGHT,
      horizontalSpacing: options.horizontalSpacing || HORIZONTAL_SPACING,
      verticalSpacing: options.verticalSpacing || VERTICAL_SPACING,
      margin: options.margin || DEFAULT_MARGIN
    };

    // ELK directions: DOWN (TB), RIGHT (LR), UP (BT), LEFT (RL)
    const directionMap: Record<string, string> = {
      'TB': 'DOWN', 'LR': 'RIGHT', 'BT': 'UP', 'RL': 'LEFT'
    };

    // Map DiagramGraph to ELK JSON format recursively (to support compound nodes)
    const mapNode = (nodeId: string): ElkNode => {
      const node = graph.nodes[nodeId];
      const elkNode: ElkNode = {
        id: node.id,
        width: config.nodeWidth,
        height: config.nodeHeight
      };

      if (node.children && node.children.length > 0) {
        elkNode.children = node.children.map(childId => mapNode(childId));
      }

      return elkNode;
    };

    // Only map top-level nodes (nodes not present in any other node's children array)
    const allChildren = new Set<string>();
    Object.values(graph.nodes).forEach(n => {
      if (n.children) {
        n.children.forEach(c => allChildren.add(c));
      }
    });
    const topLevelNodes = Object.values(graph.nodes).filter(n => !allChildren.has(n.id));
    const elkNodes: ElkNode[] = topLevelNodes.map(node => mapNode(node.id));

    const elkEdges: ElkExtendedEdge[] = Object.values(graph.edges).map(edge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target]
    }));

    const elkOptions: Record<string, string> = {
      'elk.spacing.nodeNode': config.horizontalSpacing.toString(),
      'elk.layered.spacing.nodeNodeBetweenLayers': config.verticalSpacing.toString(),
      'elk.padding': `[top=${config.margin},left=${config.margin},bottom=${config.margin},right=${config.margin}]`
    };

    if (options.direction && directionMap[options.direction]) {
      elkOptions['elk.direction'] = directionMap[options.direction];
    }

    // Apply algorithm specific configurations from strategy
    this.strategy.applyAlgorithmSpecificOptions(elkOptions);
    
    // Default fallback if strategy didn't set it
    if (!elkOptions['elk.direction']) {
      elkOptions['elk.direction'] = 'DOWN';
    }

    const elkGraph: ElkNode = {
      id: 'root',
      layoutOptions: elkOptions,
      children: elkNodes,
      edges: elkEdges
    };

    try {
      // Create a deep clone to maintain immutability
      const graphClone = structuredClone(graph);

      const layoutedGraph = await this.elk.layout(elkGraph);
      
      const positionedNodes: Record<string, PositionedNode> = {};
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      const extractPositions = (elkNodesList: ElkNode[], xOffset = 0, yOffset = 0) => {
        elkNodesList.forEach((elkNode) => {
          const originalNode = graphClone.nodes[elkNode.id];
          if (originalNode) {
            const absoluteX = xOffset + (elkNode.x || 0);
            const absoluteY = yOffset + (elkNode.y || 0);
            const width = elkNode.width || config.nodeWidth;
            const height = elkNode.height || config.nodeHeight;

            positionedNodes[elkNode.id] = {
              ...originalNode,
              x: absoluteX,
              y: absoluteY,
              width,
              height
            };

            // Update bounding box
            minX = Math.min(minX, absoluteX);
            minY = Math.min(minY, absoluteY);
            maxX = Math.max(maxX, absoluteX + width);
            maxY = Math.max(maxY, absoluteY + height);
          }

          if (elkNode.children) {
            // Compound node positioning is relative to parent in ELK
            extractPositions(elkNode.children, xOffset + (elkNode.x || 0), yOffset + (elkNode.y || 0));
          }
        });
      };

      if (layoutedGraph.children) {
        extractPositions(layoutedGraph.children, 0, 0);
      }

      const layoutDuration = performance.now() - startTime;
      const boundingBox = { width: maxX - minX, height: maxY - minY };

      const layoutMetadata: LayoutMetadata = {
        layoutEngine: 'elkjs',
        layoutStrategy: this.strategy.getAlgorithm(),
        boundingBox,
        diagramWidth: layoutedGraph.width || boundingBox.width,
        diagramHeight: layoutedGraph.height || boundingBox.height,
        layoutDuration,
        warnings: []
      };

      const result: PositionedGraph = {
        nodes: positionedNodes,
        edges: graphClone.edges, // already cloned
        type: graphClone.type,
        metadata: graphClone.metadata,
        layoutMetadata
      };

      this.fireCompletedEvents(result, startTime, options);
      return result;

    } catch (e) {
      if (options.onLayoutFailed) {
        options.onLayoutFailed(e instanceof Error ? e : new Error(String(e)));
      }
      throw new Error(`ElkLayoutEngine failed: ${e}`);
    }
  }

  private fireCompletedEvents(result: PositionedGraph, startTime: number, options: Partial<LayoutOptions>) {
    if (options.onAfterLayout) {
      options.onAfterLayout(result);
    }
    if (options.onLayoutCompleted) {
      options.onLayoutCompleted(performance.now() - startTime);
    }
  }
}
