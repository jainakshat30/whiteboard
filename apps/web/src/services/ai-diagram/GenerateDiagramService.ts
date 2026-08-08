import { IAIProvider } from './providers/IAIProvider';
import { GenerateDiagramRequest, LlmDiagramResponseSchema, LlmDiagramResponse } from './schema/DiagramGraphSchema';
import { DiagramPromptBuilder } from './prompts/DiagramPromptBuilder';
import { DiagramEngine } from './DiagramEngine';
import { DiagramGraph } from '@/types/ai-diagram';

const MAX_RETRIES = 3;
const MAX_PROMPT_LENGTH = 2000;
const MAX_NODES = 100;
const MAX_EDGES = 200;

export class GenerateDiagramService {
  constructor(private aiProvider: IAIProvider) {}

  public async generate(request: GenerateDiagramRequest): Promise<DiagramGraph> {
    if (!request.prompt || request.prompt.trim() === '') {
      throw new Error('EMPTY_PROMPT: Prompt cannot be empty.');
    }
    
    if (request.prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(`INVALID_REQUEST: Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters.`);
    }

    const systemPrompt = DiagramPromptBuilder.buildSystemPrompt(request.diagramType);

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < MAX_RETRIES) {
      attempt++;
      
      try {
        // Step 1: Call Provider and perform Layer 1 (Zod) validation
        const rawLlmResponse = await this.aiProvider.generateStructured<LlmDiagramResponse>({
          systemPrompt,
          userPrompt: request.prompt,
          responseSchema: LlmDiagramResponseSchema
        });

        if (rawLlmResponse.nodes.length > MAX_NODES) {
          throw new Error(`DIAGRAM_VALIDATION_ERROR: Exceeded maximum node count (${MAX_NODES}).`);
        }
        if (rawLlmResponse.edges.length > MAX_EDGES) {
          throw new Error(`DIAGRAM_VALIDATION_ERROR: Exceeded maximum edge count (${MAX_EDGES}).`);
        }

        // Convert LLM array format into the Record format required by DiagramEngine
        const engineGraphFormat: DiagramGraph = {
          type: request.diagramType, // Override with the requested type to be safe
          metadata: rawLlmResponse.metadata || {},
          nodes: {},
          edges: {}
        };

        for (const node of rawLlmResponse.nodes) {
          engineGraphFormat.nodes[node.id] = {
            id: node.id,
            label: node.label || '',
            type: node.type,
            metadata: node.metadata,
            children: node.children
          };
        }

        for (const edge of rawLlmResponse.edges) {
          engineGraphFormat.edges[edge.id] = {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label,
            type: edge.type,
            metadata: edge.metadata,
            routing: edge.routing
          };
        }

        // Step 2: Layer 2 (Semantic) Validation via DiagramEngine
        const engine = new DiagramEngine(request.diagramType);
        
        // This will throw if the graph is semantically invalid (e.g., missing targets, duplicate IDs internally)
        engine.importJSON(JSON.stringify(engineGraphFormat));
        const validationErrors = engine.validate();
        
        if (validationErrors.length > 0) {
          throw new Error(`DIAGRAM_VALIDATION_ERROR: ${validationErrors.join(', ')}`);
        }

        // If we reach here, both validation layers passed
        return engine.getGraph();
      } catch (error: any) {
        lastError = error;
        
        const errorMessage = error.message || String(error);
        
        // Error-Aware Retry Logic: Do not retry permanent errors
        if (
          errorMessage.includes('EMPTY_PROMPT') ||
          errorMessage.includes('INVALID_REQUEST') ||
          errorMessage.includes('API key') ||
          errorMessage.includes('auth') || 
          errorMessage.includes('not supported')
        ) {
          throw error; // Fail immediately
        }
        
        // Wait before retrying (exponential backoff could be added here for rate limits)
        if (attempt < MAX_RETRIES) {
          console.warn(`Attempt ${attempt} failed. Retrying... Error: ${errorMessage}`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(`AI_PROVIDER_ERROR: Failed to generate diagram after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
  }
}
