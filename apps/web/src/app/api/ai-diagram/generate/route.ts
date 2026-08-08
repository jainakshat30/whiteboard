import { NextResponse } from 'next/server';
import { GenerateDiagramRequestSchema } from '@/services/ai-diagram/schema/DiagramGraphSchema';
import { GenerateDiagramService } from '@/services/ai-diagram/GenerateDiagramService';
import { GeminiProvider } from '@/services/ai-diagram/providers/GeminiProvider';
import { FakeAIProvider } from '@/services/ai-diagram/providers/FakeAIProvider';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate request schema
    const parsedRequest = GenerateDiagramRequestSchema.safeParse(body);
    
    if (!parsedRequest.success) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', details: parsedRequest.error.issues },
        { status: 400 }
      );
    }

    // Dependency Injection: Select provider
    // Note: For automated testing or local dev without a key, we could fallback to FakeAIProvider.
    // But since this is the real API endpoint, we expect GEMINI_API_KEY to exist.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'SERVER_CONFIGURATION_ERROR', message: 'API key is not configured.' },
        { status: 500 }
      );
    }

    const aiProvider = new GeminiProvider(apiKey);
    const service = new GenerateDiagramService(aiProvider);

    // Generate graph
    const diagramGraph = await service.generate(parsedRequest.data);

    // ONLY return the structured semantic graph, NEVER coordinates or elements
    return NextResponse.json({ graph: diagramGraph }, { status: 200 });

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error occurred';
    
    // Categorize errors for safe frontend consumption
    if (errorMessage.includes('EMPTY_PROMPT') || errorMessage.includes('INVALID_REQUEST')) {
      return NextResponse.json({ error: 'INVALID_REQUEST', message: errorMessage }, { status: 400 });
    }
    
    if (errorMessage.includes('DIAGRAM_VALIDATION_ERROR')) {
      return NextResponse.json({ error: 'DIAGRAM_VALIDATION_ERROR', message: errorMessage }, { status: 422 });
    }
    
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return NextResponse.json({ error: 'RATE_LIMITED', message: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    console.error('[AI Diagram Generation Error]', errorMessage);
    
    // Fallback generic error to avoid leaking stack traces or sensitive provider internals
    return NextResponse.json(
      { error: 'AI_PROVIDER_ERROR', message: 'Failed to generate diagram due to an internal AI provider error.' },
      { status: 500 }
    );
  }
}
