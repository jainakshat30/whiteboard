import { IAIProvider, StructuredGenerationRequest } from './IAIProvider';
import { LlmDiagramResponse } from '../schema/DiagramGraphSchema';

export class FakeAIProvider implements IAIProvider {
  public shouldFail: boolean = false;
  public mockResponse: Partial<LlmDiagramResponse> | null = null;
  public callCount: number = 0;

  async generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<T> {
    this.callCount++;

    if (this.shouldFail) {
      throw new Error('Fake AI Provider failure');
    }

    // Default mock response (Flowchart)
    const defaultResponse: LlmDiagramResponse = {
      type: 'FLOWCHART',
      nodes: [
        { id: 'start', label: 'Start', type: 'start' },
        { id: 'process', label: 'Process', type: 'process' }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'process' }
      ],
      metadata: {}
    };

    const responseToUse = this.mockResponse || defaultResponse;

    // Validate the mock response with Zod to simulate real provider behavior
    const validatedData = request.responseSchema.parse(responseToUse);
    return validatedData as T;
  }
}
