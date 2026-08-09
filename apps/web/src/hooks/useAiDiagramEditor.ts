import { useState } from 'react';
import { useSceneStore } from '@/store/scene';
import { DiagramEditService, ClarificationRequiredError, UnsupportedRequestError, PreparedDiagramEdit } from '@/services/ai-diagram/editor/DiagramEditService';


export function useAiDiagramEditor() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarification, setClarification] = useState<string | null>(null);
  const [preparedEdit, setPreparedEdit] = useState<PreparedDiagramEdit | null>(null);

  const selectedDiagramId = useSceneStore((state) => state.selectedDiagramId);
  const elements = useSceneStore((state) => state.elements);

  const prepareEdit = async (instruction: string): Promise<boolean> => {
    if (!selectedDiagramId) {
      setError('No AI diagram is selected.');
      return false;
    }

    if (!instruction || instruction.trim() === '') {
      setError('Instruction cannot be empty.');
      return false;
    }

    setIsGenerating(true);
    setError(null);
    setClarification(null);
    setPreparedEdit(null);

    try {
      const prepared = await DiagramEditService.prepareEdit(
        selectedDiagramId,
        instruction,
        elements
        // aiProvider is undefined, so it uses the API endpoint
      );
      setPreparedEdit(prepared);
      return true;
    } catch (err: any) {
      if (
        err instanceof ClarificationRequiredError || 
        err.name === 'ClarificationRequiredError' ||
        err instanceof UnsupportedRequestError ||
        err.name === 'UnsupportedRequestError'
      ) {
        setClarification(err.message);
      } else {
        console.error('AI Diagram Prepare Error:', err);
        setError(err.message || "AI couldn't generate a valid change.");
      }
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  const applyEdit = async (): Promise<boolean> => {
    if (!preparedEdit) {
      setError('No prepared edit to apply.');
      return false;
    }

    if (preparedEdit.diagramId !== selectedDiagramId) {
      setError('The selected diagram changed. Please generate the edit again.');
      setPreparedEdit(null);
      return false;
    }

    setIsApplying(true);
    setError(null);

    try {
      await DiagramEditService.applyPreparedEdit(preparedEdit, elements);
      setPreparedEdit(null);
      return true;
    } catch (err: any) {
      console.error('AI Diagram Apply Error:', err);
      setError(err.message || "Couldn't apply the changes. Your original diagram is unchanged.");
      // We don't automatically discard the preparedEdit on failure, unless it's a stale diagram error
      if (err.message && err.message.includes('The diagram changed while you were reviewing')) {
        setPreparedEdit(null);
      }
      return false;
    } finally {
      setIsApplying(false);
    }
  };

  const clearEdit = () => {
    setPreparedEdit(null);
    setError(null);
    setClarification(null);
  };

  return {
    isGenerating,
    isApplying,
    error,
    clarification,
    preparedEdit,
    prepareEdit,
    applyEdit,
    clearEdit,
    canEdit: !!selectedDiagramId,
    clearError: () => setError(null),
    clearClarification: () => setClarification(null),
  };
}
