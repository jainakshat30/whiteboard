import { DiagramGraph, DiagramType } from '@/types/ai-diagram';

export interface GenerateDiagramRequestPayload {
  prompt: string;
  diagramType: DiagramType;
}

export interface GenerateDiagramResponsePayload {
  graph?: DiagramGraph;
  error?: string;
  message?: string;
}

export class AiDiagramClient {
  /**
   * Calls the backend API to generate a DiagramGraph from a natural-language prompt.
   */
  public static async generate(request: GenerateDiagramRequestPayload): Promise<DiagramGraph> {
    const response = await fetch('/api/ai-diagram/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data: GenerateDiagramResponsePayload = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to generate diagram');
    }

    if (!data.graph) {
      throw new Error('API returned success but no graph data was provided.');
    }

    return data.graph;
  }
}
