import { useState } from 'react';
import { DiagramType } from '@/types/ai-diagram';
import { AiDiagramClient } from '@/services/ai-diagram/client/AiDiagramClient';
import { ElkLayoutEngine } from '@/services/ai-diagram/layout/ElkLayoutEngine';
import { VerticalFlowStrategy } from '@/services/ai-diagram/layout/strategies/VerticalFlowStrategy';
import { DiagramCanvasIntegration } from '@/services/ai-diagram/integration/DiagramCanvasIntegration';

export function useAiDiagramGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (prompt: string, diagramType: DiagramType, origin = { x: 400, y: 100 }) => {
    try {
      setIsGenerating(true);
      setError(null);

      // 1. Call Backend API (which runs LLM -> Validation -> DiagramEngine)
      const graph = await AiDiagramClient.generate({ prompt, diagramType });

      // 2. Perform Layout deterministically on the frontend
      // (Using VerticalFlowStrategy as the default for Flowcharts and similar types)
      const layoutEngine = new ElkLayoutEngine(new VerticalFlowStrategy());
      const positionedGraph = await layoutEngine.layout(graph, {
        direction: 'TB',
        horizontalSpacing: 50,
        verticalSpacing: 50
      });

      // 3. Map and Insert into Whiteboard via single transaction
      DiagramCanvasIntegration.insertDiagram(positionedGraph, { origin });

      return true;
    } catch (err: any) {
      console.error('Diagram Generation Failed:', err);
      setError(err.message || 'Failed to generate diagram');
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generate, isGenerating, error, clearError: () => setError(null) };
}
