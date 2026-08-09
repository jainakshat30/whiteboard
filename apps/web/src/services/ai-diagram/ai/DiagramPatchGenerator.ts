import { IAIProvider } from '../providers/IAIProvider';
import { DiagramGraph } from '@/types/ai-diagram';
import { DiagramEditResponse, DiagramEditResponseSchema } from '../patch/DiagramPatch';
import { DiagramEditPromptBuilder } from './DiagramEditPromptBuilder';
import { PatchValidator } from '../patch/PatchValidator';

export class DiagramPatchGenerator {
  private provider: IAIProvider;

  constructor(provider: IAIProvider) {
    this.provider = provider;
  }

  /**
   * Generates a semantic DiagramPatch based on a user instruction.
   * Leverages Zod schema validation and DiagramPatchValidator for semantic correctness.
   * Retries automatically if the LLM proposes an invalid patch.
   */
  public async generatePatch(
    graph: DiagramGraph,
    instruction: string,
    maxRetries: number = 3
  ): Promise<DiagramEditResponse> {
    let attempts = 0;
    let validationErrors: string[] | undefined = undefined;

    const systemPrompt = DiagramEditPromptBuilder.buildSystemPrompt();

    while (attempts < maxRetries) {
      attempts++;

      const userPrompt = DiagramEditPromptBuilder.buildUserPrompt(graph, instruction, validationErrors);

      try {
        const response = await this.provider.generateStructured<DiagramEditResponse>({
          systemPrompt,
          userPrompt,
          responseSchema: DiagramEditResponseSchema,
          temperature: 0.1 // Lower temperature for more deterministic, structured editing output
        });

        if (response.status === 'NEEDS_CLARIFICATION') {
          // LLM correctly identified ambiguity or an unsupported request. Return immediately.
          return response;
        }

        // The LLM produced a SUCCESS response with a schema-valid DiagramPatch.
        // Now we validate its semantic rules against the current graph.
        const semanticErrors = PatchValidator.validatePatch(graph, response.patch);
        
        if (semanticErrors.length > 0) {
          // Semantic validation failed (e.g. removed node with dependent edge, referenced invalid node).
          // We feed this back as corrective context in the next loop.
          validationErrors = semanticErrors;
          continue; // Loop and retry
        }

        // Schema and semantic validation passed!
        return response;
      } catch (error: any) {
        // `generateStructured` throws if the raw output failed Zod schema validation.
        // For example, if the LLM hallucinated geometric coordinates in the UPDATE_NODE payload.
        validationErrors = [`Schema validation failed: ${error.message}`];
        // Loop and retry
      }
    }

    throw new Error(`DiagramPatchGenerator: Failed to generate a valid patch after ${maxRetries} attempts.`);
  }
}
