import { useState, useRef, useEffect } from 'react';
import { useAiDiagramEditor } from '@/hooks/useAiDiagramEditor';

interface AiDiagramEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiDiagramEditModal({ isOpen, onClose }: AiDiagramEditModalProps) {
  const [instruction, setInstruction] = useState('');
  const { editDiagram, isEditing, error, clarification, clearError, clearClarification } = useAiDiagramEditor();
  
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        if (!isEditing) onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus the input when modal opens
      setTimeout(() => textareaRef.current?.focus(), 10);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isEditing, onClose]);

  // Reset instruction when closing
  useEffect(() => {
    if (!isOpen) {
      setInstruction('');
      clearError();
      clearClarification();
    }
  }, [isOpen, clearError, clearClarification]);

  if (!isOpen) return null;

  const handleApply = async () => {
    if (!instruction.trim()) return;
    
    const success = await editDiagram(instruction);
    
    if (success) {
      setInstruction('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!isEditing && instruction.trim()) {
        handleApply();
      }
    } else if (e.key === 'Escape' && !isEditing) {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4"
        role="dialog"
        aria-labelledby="ai-edit-title"
      >
        <div className="flex justify-between items-center">
          <h3 id="ai-edit-title" className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Edit Diagram with AI
          </h3>
          <button
            onClick={onClose}
            disabled={isEditing}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800/30 flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
            </svg>
            <span className="flex-1">{error}</span>
            <button onClick={clearError} className="hover:text-red-800 dark:hover:text-red-200" aria-label="Dismiss error">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        )}

        {clarification && (
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-3 rounded-lg text-sm border border-blue-200 dark:border-blue-800/30 flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span className="flex-1 font-medium">{clarification}</span>
            <button onClick={clearClarification} className="hover:text-blue-800 dark:hover:text-blue-200" aria-label="Dismiss clarification">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="ai-edit-instruction" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Describe what you want to change in this diagram
          </label>
          <textarea
            id="ai-edit-instruction"
            ref={textareaRef}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isEditing}
            placeholder="e.g. Add Redis between Auth Service and PostgreSQL"
            className="w-full h-32 p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
          />
          <div className="text-xs text-neutral-500 text-right">
            Press <kbd className="font-sans px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">Cmd</kbd> + <kbd className="font-sans px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">Enter</kbd> to apply
          </div>
        </div>

        <div className="flex justify-between items-center mt-2">
          <div className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
            Editing selected diagram
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isEditing}
              className="px-4 py-2 text-sm font-medium rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={isEditing || !instruction.trim()}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isEditing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Applying changes...
                </>
              ) : (
                'Apply Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
