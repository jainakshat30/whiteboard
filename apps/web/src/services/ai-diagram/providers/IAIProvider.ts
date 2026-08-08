import { ZodSchema } from 'zod';

export interface StructuredGenerationRequest<T> {
  systemPrompt: string;
  userPrompt: string;
  responseSchema: ZodSchema<T>;
  model?: string; // Optional provider-specific configuration
  temperature?: number;
}

export interface IAIProvider {
  /**
   * Generates a structured output matching the provided Zod schema.
   * Throws an error if generation fails or output does not match schema.
   */
  generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<T>;
}
