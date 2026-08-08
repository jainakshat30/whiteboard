import { useState, useRef, useEffect } from 'react';
import { useAiDiagramGenerator } from '@/hooks/useAiDiagramGenerator';
import { DiagramType } from '@/types/ai-diagram';

interface AiDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiDiagramModal({ isOpen, onClose }: AiDiagramModalProps) {
  const [prompt, setPrompt] = useState('');
  const [diagramType, setDiagramType] = useState<DiagramType>('FLOWCHART');
  const { generate, isGenerating, error, clearError } = useAiDiagramGenerator();
  
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        if (!isGenerating) onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isGenerating, onClose]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    // Attempt generation. The hook places it on the canvas automatically.
    const success = await generate(prompt, diagramType, { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 200 });
    
    if (success) {
      setPrompt('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Create AI Diagram
          </h3>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition"
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
            <button onClick={clearError} className="hover:text-red-800 dark:hover:text-red-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Diagram Type
          </label>
          <select 
            value={diagramType}
            onChange={(e) => setDiagramType(e.target.value as DiagramType)}
            disabled={isGenerating}
            className="w-full p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
          >
            <option value="FLOWCHART">Flowchart</option>
            <option value="MINDMAP">Mind Map</option>
            <option value="ER_DIAGRAM">ER Diagram</option>
            <option value="NETWORK_GRAPH">Network Architecture</option>
            <option value="SEQUENCE_DIAGRAM">Sequence Diagram</option>
            <option value="UML">UML Class Diagram</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Describe your diagram
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
            placeholder="e.g. A user login flow with username/password validation..."
            className="w-full h-32 p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating diagram...
              </>
            ) : (
              'Generate Diagram'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
