import { 
  DiagramNode, 
  DiagramEdge, 
  DiagramGraph, 
  DiagramType 
} from '../../types/ai-diagram';

/**
 * DiagramEngine is the single source of truth for all graph data operations.
 * It has zero knowledge of the canvas, AI providers, or layout algorithms.
 * It is solely responsible for creating, mutating, and validating the DiagramGraph.
 */
export class DiagramEngine {
  private graph: DiagramGraph;

  constructor(type: DiagramType = 'FLOWCHART') {
    this.graph = {
      nodes: {},
      edges: {},
      type,
      metadata: {}
    };
  }

  /**
   * Retrieves a deep copy of the current graph to prevent external mutation.
   */
  public getGraph(): DiagramGraph {
    return JSON.parse(JSON.stringify(this.graph));
  }

  /**
   * Adds a new node to the graph.
   * @throws Error if the node ID already exists.
   */
  public addNode(node: DiagramNode): void {
    if (this.graph.nodes[node.id]) {
      throw new Error(`DiagramEngine: Node with ID '${node.id}' already exists.`);
    }
    this.graph.nodes[node.id] = { ...node };
  }

  /**
   * Removes a node and any connected edges from the graph.
   * @throws Error if the node ID does not exist.
   */
  public removeNode(nodeId: string): void {
    if (!this.graph.nodes[nodeId]) {
      throw new Error(`DiagramEngine: Node with ID '${nodeId}' does not exist.`);
    }

    // Remove any edges connected to this node
    for (const edgeId in this.graph.edges) {
      const edge = this.graph.edges[edgeId];
      if (edge.source === nodeId || edge.target === nodeId) {
        this.removeEdge(edgeId);
      }
    }

    delete this.graph.nodes[nodeId];
  }

  /**
   * Adds a new edge between two existing nodes.
   * @throws Error if the edge ID exists, or if source/target nodes are missing.
   */
  public addEdge(edge: DiagramEdge): void {
    if (this.graph.edges[edge.id]) {
      throw new Error(`DiagramEngine: Edge with ID '${edge.id}' already exists.`);
    }
    
    // Validate that the referenced nodes exist
    if (!this.graph.nodes[edge.source]) {
      throw new Error(`DiagramEngine: Source node '${edge.source}' does not exist for edge '${edge.id}'.`);
    }
    if (!this.graph.nodes[edge.target]) {
      throw new Error(`DiagramEngine: Target node '${edge.target}' does not exist for edge '${edge.id}'.`);
    }

    this.graph.edges[edge.id] = { ...edge };
  }

  /**
   * Removes an edge from the graph.
   * @throws Error if the edge ID does not exist.
   */
  public removeEdge(edgeId: string): void {
    if (!this.graph.edges[edgeId]) {
      throw new Error(`DiagramEngine: Edge with ID '${edgeId}' does not exist.`);
    }
    delete this.graph.edges[edgeId];
  }

  /**
   * Renames the label of a specific node.
   * @throws Error if the node ID does not exist.
   */
  public renameNode(nodeId: string, newLabel: string): void {
    if (!this.graph.nodes[nodeId]) {
      throw new Error(`DiagramEngine: Node with ID '${nodeId}' does not exist.`);
    }
    this.graph.nodes[nodeId].label = newLabel;
  }

  /**
   * Validates the graph for structural integrity (missing references).
   * Note: Duplicate IDs are inherently prevented by the Record structure and addNode/addEdge checks.
   * @returns An array of validation error messages. Empty if valid.
   */
  public validate(): string[] {
    const errors: string[] = [];

    // Ensure all edges reference valid nodes (catch-all in case of manual tampering before import)
    for (const edgeId in this.graph.edges) {
      const edge = this.graph.edges[edgeId];
      if (!this.graph.nodes[edge.source]) {
        errors.push(`Missing Reference: Edge '${edgeId}' references missing source node '${edge.source}'.`);
      }
      if (!this.graph.nodes[edge.target]) {
        errors.push(`Missing Reference: Edge '${edgeId}' references missing target node '${edge.target}'.`);
      }
    }

    return errors;
  }

  /**
   * Exports the current graph as a JSON string.
   */
  public exportJSON(): string {
    return JSON.stringify(this.graph, null, 2);
  }

  /**
   * Imports a JSON string representation of a graph, validating it before applying.
   * @throws Error if the JSON is malformed or if structural validation fails.
   */
  public importJSON(jsonString: string): void {
    try {
      const parsedGraph = JSON.parse(jsonString) as DiagramGraph;

      // Basic schema check
      if (!parsedGraph.nodes || !parsedGraph.edges || !parsedGraph.type) {
        throw new Error("Invalid schema structure. Missing required properties: nodes, edges, or type.");
      }

      // Temporarily store old graph in case of validation failure
      const backupGraph = this.graph;
      
      // Apply parsed graph
      this.graph = parsedGraph;

      // Validate the newly applied graph
      const validationErrors = this.validate();
      if (validationErrors.length > 0) {
        // Rollback on failure
        this.graph = backupGraph;
        throw new Error(`Validation failed on import:\n${validationErrors.join('\n')}`);
      }
    } catch (error: any) {
      throw new Error(`DiagramEngine Import Error: ${error.message}`);
    }
  }
}
