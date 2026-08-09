import { useState } from 'react';
import { DiagramType } from '@/types/ai-diagram';
import { AiDiagramClient } from '@/services/ai-diagram/client/AiDiagramClient';
import { LayoutFactory } from '@/services/ai-diagram/layout/LayoutFactory';
import { DiagramCanvasIntegration } from '@/services/ai-diagram/integration/DiagramCanvasIntegration';
import { useViewportStore } from '@/store/viewport';

export function useAiDiagramGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (prompt: string, diagramType: DiagramType) => {
    try {
      setIsGenerating(true);
      setError(null);

      // Calculate dynamic origin based on current viewport camera
      const { zoom, panX, panY } = useViewportStore.getState();
      const origin = {
        x: (window.innerWidth / 2 - panX) / zoom,
        y: (window.innerHeight / 2 - panY) / zoom
      };

      // 1. Call Backend API (which runs LLM -> Validation -> DiagramEngine)
      const graph = await AiDiagramClient.generate({ prompt, diagramType });

      // 2. Perform Layout deterministically on the frontend
      const layoutEngine = LayoutFactory.getLayout(diagramType);
      const positionedGraph = await layoutEngine.layout(graph, {
        horizontalSpacing: 80,
        verticalSpacing: 80
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
