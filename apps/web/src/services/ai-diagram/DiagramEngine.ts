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
      nodes: [],
      edges: [],
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

  private findNode(nodeId: string): DiagramNode | undefined {
    return this.graph.nodes.find(n => n.id === nodeId);
  }

  private findEdge(edgeId: string): DiagramEdge | undefined {
    return this.graph.edges.find(e => e.id === edgeId);
  }

  /**
   * Adds a new node to the graph.
   * @throws Error if the node ID already exists.
   */
  public addNode(node: DiagramNode): void {
    if (this.findNode(node.id)) {
      throw new Error(`DiagramEngine: Node with ID '${node.id}' already exists.`);
    }
    this.graph.nodes.push({ ...node });
  }

  /**
   * Removes a node and any connected edges from the graph.
   * @throws Error if the node ID does not exist.
   */
  public removeNode(nodeId: string): void {
    if (!this.findNode(nodeId)) {
      throw new Error(`DiagramEngine: Node with ID '${nodeId}' does not exist.`);
    }

    // Remove any edges connected to this node
    this.graph.edges = this.graph.edges.filter(
      edge => edge.source !== nodeId && edge.target !== nodeId
    );

    // Remove the node
    this.graph.nodes = this.graph.nodes.filter(n => n.id !== nodeId);
  }

  /**
   * Adds a new edge between two existing nodes.
   * @throws Error if the edge ID exists, or if source/target nodes are missing.
   */
  public addEdge(edge: DiagramEdge): void {
    if (this.findEdge(edge.id)) {
      throw new Error(`DiagramEngine: Edge with ID '${edge.id}' already exists.`);
    }
    
    // Validate that the referenced nodes exist
    if (!this.findNode(edge.source)) {
      throw new Error(`DiagramEngine: Source node '${edge.source}' does not exist for edge '${edge.id}'.`);
    }
    if (!this.findNode(edge.target)) {
      throw new Error(`DiagramEngine: Target node '${edge.target}' does not exist for edge '${edge.id}'.`);
    }

    this.graph.edges.push({ ...edge });
  }

  /**
   * Removes an edge from the graph.
   * @throws Error if the edge ID does not exist.
   */
  public removeEdge(edgeId: string): void {
    if (!this.findEdge(edgeId)) {
      throw new Error(`DiagramEngine: Edge with ID '${edgeId}' does not exist.`);
    }
    this.graph.edges = this.graph.edges.filter(e => e.id !== edgeId);
  }

  /**
   * Renames the label of a specific node.
   * @throws Error if the node ID does not exist.
   */
  public renameNode(nodeId: string, newLabel: string): void {
    const node = this.findNode(nodeId);
    if (!node) {
      throw new Error(`DiagramEngine: Node with ID '${nodeId}' does not exist.`);
    }
    node.label = newLabel;
  }

  /**
   * Updates properties of an existing node.
   * @throws Error if the node ID does not exist.
   */
  public updateNode(nodeId: string, changes: Partial<Omit<DiagramNode, 'id'>>): void {
    const node = this.findNode(nodeId);
    if (!node) {
      throw new Error(`DiagramEngine: Node with ID '${nodeId}' does not exist.`);
    }
    Object.assign(node, changes);
  }

  /**
   * Updates properties of an existing edge.
   * @throws Error if the edge ID does not exist.
   */
  public updateEdge(edgeId: string, changes: Partial<Omit<DiagramEdge, 'id' | 'source' | 'target'>>): void {
    const edge = this.findEdge(edgeId);
    if (!edge) {
      throw new Error(`DiagramEngine: Edge with ID '${edgeId}' does not exist.`);
    }
    Object.assign(edge, changes);
  }

  /**
   * Validates the graph for structural integrity (missing references, duplicates).
   * @returns An array of validation error messages. Empty if valid.
   */
  public validate(): string[] {
    const errors: string[] = [];

    // Check for duplicate nodes
    const nodeIds = new Set<string>();
    for (const node of this.graph.nodes) {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate Node ID: '${node.id}'.`);
      }
      nodeIds.add(node.id);
    }

    // Check for duplicate edges and validate references
    const edgeIds = new Set<string>();
    for (const edge of this.graph.edges) {
      if (edgeIds.has(edge.id)) {
        errors.push(`Duplicate Edge ID: '${edge.id}'.`);
      }
      edgeIds.add(edge.id);

      if (!nodeIds.has(edge.source)) {
        errors.push(`Missing Reference: Edge '${edge.id}' references missing source node '${edge.source}'.`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Missing Reference: Edge '${edge.id}' references missing target node '${edge.target}'.`);
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
      if (!parsedGraph.nodes || !Array.isArray(parsedGraph.nodes) || !parsedGraph.edges || !Array.isArray(parsedGraph.edges) || !parsedGraph.type) {
        throw new Error("Invalid schema structure. Missing required properties or nodes/edges are not arrays.");
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
