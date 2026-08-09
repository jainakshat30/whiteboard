import { useState } from 'react';
import { useSceneStore } from '@/store/scene';
import { DiagramEditService, ClarificationRequiredError } from '@/services/ai-diagram/editor/DiagramEditService';
import { GeminiProvider } from '@/services/ai-diagram/providers/GeminiProvider';

export function useAiDiagramEditor() {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarification, setClarification] = useState<string | null>(null);

  const selectedDiagramId = useSceneStore((state) => state.selectedDiagramId);
  const elements = useSceneStore((state) => state.elements);

  const editDiagram = async (instruction: string): Promise<boolean> => {
    if (!selectedDiagramId) {
      setError('No AI diagram is selected.');
      return false;
    }

    if (!instruction || instruction.trim() === '') {
      setError('Instruction cannot be empty.');
      return false;
    }

    setIsEditing(true);
    setError(null);
    setClarification(null);

    try {
      const provider = new GeminiProvider();
      await DiagramEditService.editDiagram(
        selectedDiagramId,
        instruction,
        elements,
        provider
      );
      return true;
    } catch (err: any) {
      if (err instanceof ClarificationRequiredError || err.name === 'ClarificationRequiredError') {
        setClarification(err.message);
      } else {
        console.error('AI Diagram Edit Error:', err);
        setError(err.message || 'An error occurred while editing the diagram.');
      }
      return false;
    } finally {
      setIsEditing(false);
    }
  };

  return {
    isEditing,
    error,
    clarification,
    editDiagram,
    canEdit: !!selectedDiagramId,
    clearError: () => setError(null),
    clearClarification: () => setClarification(null),
  };
}
