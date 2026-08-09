import { useState } from 'react';
import { useSceneStore } from '@/store/scene';
import { DiagramEditService } from '@/services/ai-diagram/editor/DiagramEditService';
import { GeminiProvider } from '@/services/ai-diagram/providers/GeminiProvider';

export function useAiDiagramEditor() {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDiagramId = useSceneStore((state) => state.selectedDiagramId);
  const elements = useSceneStore((state) => state.elements);

  const editDiagram = async (instruction: string) => {
    if (!selectedDiagramId) {
      setError('No AI diagram is selected.');
      return;
    }

    if (!instruction || instruction.trim() === '') {
      setError('Instruction cannot be empty.');
      return;
    }

    setIsEditing(true);
    setError(null);

    try {
      const provider = new GeminiProvider();
      await DiagramEditService.editDiagram(
        selectedDiagramId,
        instruction,
        elements,
        provider
      );
    } catch (err: any) {
      console.error('AI Diagram Edit Error:', err);
      setError(err.message || 'An error occurred while editing the diagram.');
    } finally {
      setIsEditing(false);
    }
  };

  return {
    isEditing,
    error,
    editDiagram,
    canEdit: !!selectedDiagramId,
  };
}
