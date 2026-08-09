import { IAIProvider, StructuredGenerationRequest } from './IAIProvider';
import { LlmDiagramResponse } from '../schema/DiagramGraphSchema';
import { DiagramEditResponse } from '../patch/DiagramPatch';

export class FakeAIProvider implements IAIProvider {
  public shouldFail: boolean = false;
  // Can be used for single diagram generation mocks
  public mockResponse: Partial<LlmDiagramResponse> | null = null;
  // Can be used for sequential DiagramEditResponse mocks (e.g. invalid then valid)
  public mockResponseQueue: any[] = [];
  public callCount: number = 0;

  async generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<T> {
    this.callCount++;

    if (this.shouldFail) {
      throw new Error('Fake AI Provider failure');
    }

    let responseToUse: any;

    if (this.mockResponseQueue.length > 0) {
      // Shift the next response off the queue
      responseToUse = this.mockResponseQueue.shift();
    } else if (this.mockResponse) {
      responseToUse = this.mockResponse;
    } else {
      // Default fallback for LlmDiagramResponse
      responseToUse = {
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
    }

    // Validate the mock response with Zod to simulate real provider behavior
    const validatedData = request.responseSchema.parse(responseToUse);
    return validatedData as T;
  }
}
