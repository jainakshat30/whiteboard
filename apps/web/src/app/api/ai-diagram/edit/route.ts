import { NextResponse } from 'next/server';
import { GeminiProvider } from '@/services/ai-diagram/providers/GeminiProvider';
import { DiagramPatchGenerator } from '@/services/ai-diagram/ai/DiagramPatchGenerator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { graph, instruction } = body;
    
    if (!graph || !instruction) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Missing graph or instruction' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'SERVER_CONFIGURATION_ERROR', message: 'API key is not configured.' },
        { status: 500 }
      );
    }

    const aiProvider = new GeminiProvider(apiKey);
    const generator = new DiagramPatchGenerator(aiProvider);

    // Generate semantic patch
    const editResponse = await generator.generatePatch(graph, instruction);

    return NextResponse.json({ editResponse }, { status: 200 });

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error occurred';
    
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return NextResponse.json({ error: 'RATE_LIMITED', message: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    console.error('[AI Diagram Edit Error]', errorMessage);
    
    return NextResponse.json(
      { error: 'AI_PROVIDER_ERROR', message: errorMessage },
      { status: 500 }
    );
  }
}
