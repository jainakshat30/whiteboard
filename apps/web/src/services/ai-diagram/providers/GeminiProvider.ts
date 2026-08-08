import { GoogleGenAI, Type } from '@google/genai';
import { IAIProvider, StructuredGenerationRequest } from './IAIProvider';

export class GeminiProvider implements IAIProvider {
  private ai: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  async generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<T> {
    const model = request.model || 'gemini-2.5-flash';

    // We define a generic JSON schema structure that Gemini supports for diagram generation.
    // While we use Zod for application-side validation, providing this schema to Gemini
    // greatly improves its structured output reliability.
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING },
        nodes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              type: { type: Type.STRING },
              children: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['id', 'type']
          }
        },
        edges: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              source: { type: Type.STRING },
              target: { type: Type.STRING },
              label: { type: Type.STRING }
            },
            required: ['id', 'source', 'target']
          }
        }
      },
      required: ['type', 'nodes', 'edges']
    };

    try {
      const response = await this.ai.models.generateContent({
        model,
        contents: request.userPrompt,
        config: {
          systemInstruction: request.systemPrompt,
          temperature: request.temperature ?? 0.2,
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        }
      });

      if (!response.text) {
        throw new Error('Empty response from Gemini');
      }

      // 1. Parse JSON
      const parsedJson = JSON.parse(response.text);

      // 2. Validate with Zod
      const validatedData = request.responseSchema.parse(parsedJson);

      return validatedData;

    } catch (error: any) {
      // Improve error messages for Zod validation failures vs provider failures
      if (error.name === 'ZodError') {
        throw new Error(`AI generated invalid schema: ${error.message}`);
      }
      throw new Error(`Gemini Provider Error: ${error.message || error}`);
    }
  }
}
