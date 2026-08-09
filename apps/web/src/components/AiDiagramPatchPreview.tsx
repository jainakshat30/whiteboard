import { PreparedDiagramEdit } from '@/services/ai-diagram/editor/DiagramEditService';
import { DiagramPatchPreview } from '@/services/ai-diagram/patch/DiagramPatchPreview';

interface AiDiagramPatchPreviewProps {
  preview: DiagramPatchPreview;
  isApplying: boolean;
  onApply: () => void;
  onCancel: () => void;
}

export function AiDiagramPatchPreview({ preview, isApplying, onApply, onCancel }: AiDiagramPatchPreviewProps) {
  const hasChanges = preview.totalChanges > 0;

  return (
    <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
      {!hasChanges ? (
        <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
          No changes are needed.
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-sm font-mono">
          {preview.additions.length > 0 && (
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1 font-sans">Added</h4>
              {preview.additions.map((add, i) => (
                <div key={`add-${i}`} className="flex items-start gap-2 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/10 px-2 py-1.5 rounded">
                  <span className="font-bold shrink-0">+</span>
                  <span>
                    {add.kind === 'ADD_NODE' ? `Add node "${add.label}"` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {preview.connectionChanges.length > 0 && (
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1 font-sans">Connections</h4>
              {preview.connectionChanges.map((conn, i) => {
                if (conn.kind === 'ADD_EDGE') {
                  return (
                    <div key={`conn-add-${i}`} className="flex items-start gap-2 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/10 px-2 py-1.5 rounded">
                      <span className="font-bold shrink-0">+</span>
                      <span>
                        Connect {conn.sourceLabel} → {conn.targetLabel}
                        {conn.label && <span className="text-green-600 dark:text-green-500 ml-1">("{conn.label}")</span>}
                      </span>
                    </div>
                  );
                } else if (conn.kind === 'REMOVE_EDGE') {
                  return (
                    <div key={`conn-rm-${i}`} className="flex items-start gap-2 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-2 py-1.5 rounded">
                      <span className="font-bold shrink-0">-</span>
                      <span>
                        Remove connection {conn.sourceLabel} → {conn.targetLabel}
                        {conn.label && <span className="text-red-600 dark:text-red-500 ml-1">("{conn.label}")</span>}
                      </span>
                    </div>
                  );
                } else if (conn.kind === 'UPDATE_EDGE') {
                  return (
                    <div key={`conn-up-${i}`} className="flex items-start gap-2 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 px-2 py-1.5 rounded">
                      <span className="font-bold shrink-0">~</span>
                      <span>
                        Update connection {conn.sourceLabel} → {conn.targetLabel}
                        {conn.afterLabel && <span className="ml-1">({conn.beforeLabel || 'None'} → "{conn.afterLabel}")</span>}
                      </span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {preview.updates.length > 0 && (
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1 font-sans">Updated</h4>
              {preview.updates.map((update, i) => (
                <div key={`up-${i}`} className="flex items-start gap-2 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 px-2 py-1.5 rounded">
                  <span className="font-bold shrink-0">~</span>
                  <div className="flex flex-col">
                    <span>{update.label}</span>
                    {update.afterLabel && update.afterLabel !== update.beforeLabel && (
                      <span className="opacity-80 ml-2">Label: {update.beforeLabel || 'None'} → {update.afterLabel}</span>
                    )}
                    {update.afterType && update.afterType !== update.beforeType && (
                      <span className="opacity-80 ml-2">Type: {update.beforeType || 'None'} → {update.afterType}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {preview.removals.length > 0 && (
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1 font-sans">Removed</h4>
              {preview.removals.map((rm, i) => (
                <div key={`rm-${i}`} className="flex items-start gap-2 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-2 py-1.5 rounded">
                  <span className="font-bold shrink-0">-</span>
                  <span>
                    {rm.kind === 'REMOVE_NODE' ? `Remove node "${rm.label}"` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
        <button
          onClick={onCancel}
          disabled={isApplying}
          className="px-4 py-2 text-sm font-medium rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onApply}
          disabled={isApplying || !hasChanges}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer shadow-sm disabled:opacity-50"
        >
          {isApplying ? (
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
  );
}
