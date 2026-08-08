import { DiagramType } from '@/types/ai-diagram';

export class DiagramPromptBuilder {
  public static buildSystemPrompt(type: DiagramType): string {
    const basePrompt = `
You are a diagram structure generator.
Your job is to convert natural-language descriptions into a semantic graph.

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON matching the provided schema.
- Do not include markdown formatting like \`\`\`json.
- Do not include explanations.
- Do not include x/y coordinates, width, or height.
- Do not include styling, colors, or rendering instructions.
- Do not include HTML, SVG, or Canvas elements.
- Every edge must reference an existing node ID in 'source' and 'target'.
- Every node must have a unique ID (use simple alphanumeric strings).
- The layout engine will calculate all positions.
- The whiteboard renderer will handle all visual representation.
- Maximum nodes allowed: 100.
- Maximum edges allowed: 200.
`;

    const typeConstraints = this.getTypeConstraints(type);
    
    return `${basePrompt.trim()}\n\nSPECIFIC DIAGRAM CONSTRAINTS:\n${typeConstraints.trim()}`;
  }

  private static getTypeConstraints(type: DiagramType): string {
    switch (type) {
      case 'FLOWCHART':
        return `
- Diagram type MUST be 'FLOWCHART'.
- Allowed semantic node types: 'start', 'end', 'process', 'decision', 'input', 'output', 'database', 'step'.
- Edges can have optional labels (e.g., 'Yes', 'No' for decisions).
`;
      case 'MINDMAP':
        return `
- Diagram type MUST be 'MINDMAP'.
- Allowed semantic node types: 'root', 'topic', 'subtopic', 'idea'.
- Ensure there is exactly ONE 'root' node.
- Mindmaps are typically tree structures (nodes have one parent).
`;
      case 'ER_DIAGRAM':
        return `
- Diagram type MUST be 'ER_DIAGRAM'.
- Allowed semantic node types: 'entity', 'attribute', 'relationship'.
- Use edges to connect entities to attributes or relationships.
- Edge labels can denote cardinality (e.g., '1:1', '1:N', 'N:M').
`;
      case 'NETWORK_GRAPH':
        return `
- Diagram type MUST be 'NETWORK_GRAPH'.
- Allowed semantic node types: 'client', 'server', 'database', 'service', 'cache', 'firewall', 'router', 'cloud'.
- Describe the architecture logically.
`;
      case 'SEQUENCE_DIAGRAM':
        return `
- Diagram type MUST be 'SEQUENCE_DIAGRAM'.
- Allowed semantic node types: 'actor', 'participant', 'system'.
- Note: Pure sequence diagrams often rely heavily on ordering. Use metadata to indicate sequence order if needed, but focus primarily on standard nodes and edges.
`;
      case 'UML':
        return `
- Diagram type MUST be 'UML'.
- Allowed semantic node types: 'class', 'interface', 'package', 'actor', 'usecase'.
- Edge types can denote UML relationships (e.g., 'inherits', 'implements', 'associates').
`;
      default:
        return `- Diagram type MUST be '${type}'.`;
    }
  }
}
