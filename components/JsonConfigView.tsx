import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FolderOpenIcon } from './icons/FolderOpenIcon';
import { PencilIcon } from './icons/PencilIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';

interface JsonConfigViewProps {
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const highlightJson = (jsonString: string): { __html: string } => {
    if (!jsonString) {
        return { __html: '' };
    }
    // Basic HTML escaping
    const html = jsonString
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // "key":
        .replace(/"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"\s*:/g, (match) => `<span class="json-key">${match}</span>`)
        // "string value"
        .replace(/"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"/g, (match) => {
            // Avoid re-coloring keys that were already matched
            if (match.endsWith(':</span>')) return match;
            return `<span class="json-string">${match}</span>`;
        })
        // boolean
        .replace(/\b(true|false)\b/g, '<span class="json-boolean">$&</span>')
        // null
        .replace(/\b(null)\b/g, '<span class="json-null">$&</span>')
        // number
        .replace(/\b-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, '<span class="json-number">$&</span>');

    return { __html: html };
};

const JsonConfigView: React.FC<JsonConfigViewProps> = ({ setToast }) => {
  const [rawJson, setRawJson] = useState('');
  const [editedJson, setEditedJson] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await window.electronAPI?.getRawSettingsJson() ?? '';
      setRawJson(data);
      setEditedJson(data);
      setIsValid(true);
    } catch (error: any) {
      setToast({ message: `Failed to load settings: ${error.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [setToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEditedJson(newValue);
    try {
      JSON.parse(newValue);
      setIsValid(true);
    } catch (error) {
      setIsValid(false);
    }
  };

  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleSave = async () => {
    if (!isValid) {
      setToast({ message: 'Cannot save invalid JSON.', type: 'error' });
      return;
    }
    try {
      const parsedData = JSON.parse(editedJson);
      // The saveAllData IPC handler expects a specific object structure.
      if (typeof parsedData.globalSettings === 'undefined' || typeof parsedData.repositories === 'undefined') {
        throw new Error("JSON must have 'globalSettings' and 'repositories' keys.");
      }
      await window.electronAPI?.saveAllData(parsedData);
      setToast({ message: 'Settings saved successfully! Restarting...', type: 'success' });
      // Reload the application to apply changes globally
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      setToast({ message: `Failed to save: ${error.message}`, type: 'error' });
    }
  };
  
  const handleOpenFileLocation = () => {
      window.electronAPI?.showSettingsFile();
  };
  
  const handleCancel = () => {
      setEditedJson(rawJson);
      setIsValid(true);
      setIsEditing(false);
  }
  
  const highlightedCode = useMemo(() => highlightJson(editedJson), [editedJson]);

  return (
    <div className="flex-1 flex flex-col">
      <style>{`
        .json-key { color: #a78bfa; } /* dark:violet-400 */
        .dark .json-key { color: #c4b5fd; } /* dark:violet-300 */
        .json-string { color: #22c55e; } /* dark:green-500 */
        .dark .json-string { color: #86efac; } /* dark:green-300 */
        .json-number { color: #f97316; } /* dark:orange-500 */
        .dark .json-number { color: #fb923c; } /* dark:orange-400 */
        .json-boolean { color: #3b82f6; } /* dark:blue-500 */
        .dark .json-boolean { color: #93c5fd; } /* dark:blue-300 */
        .json-null { color: #f43f5e; } /* dark:rose-500 */
        .dark .json-null { color: #fda4af; } /* dark:rose-300 */

        .json-editor-textarea {
          color: transparent;
          background-color: transparent;
          caret-color: black;
          z-index: 1;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 0.875rem; /* text-sm */
          line-height: 1.25rem;
        }
        .dark .json-editor-textarea {
          caret-color: white;
        }
        .json-editor-pre {
          pointer-events: none;
        }
      `}</style>
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">JSON Configuration</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          View and edit the raw `settings.json` file. Changes here are applied directly and require an app restart.
        </p>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {isLoading ? (
            <div className="w-full h-96 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 flex items-center justify-center">
              <p>Loading settings file...</p>
            </div>
          ) : isEditing ? (
            <div className={`relative w-full h-96 font-mono text-sm rounded-md border focus-within:ring-2 focus-within:ring-blue-500 ${!isValid ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
              <textarea
                ref={textareaRef}
                className="json-editor-textarea absolute top-0 left-0 w-full h-full p-3 bg-transparent resize-none outline-none overflow-auto"
                value={editedJson}
                onChange={handleJsonChange}
                onScroll={handleScroll}
                spellCheck="false"
              />
              <pre
                ref={preRef}
                className="json-editor-pre absolute top-0 left-0 w-full h-full p-3 bg-gray-50 dark:bg-gray-900 overflow-auto whitespace-pre-wrap break-words"
                aria-hidden="true"
              >
                <code dangerouslySetInnerHTML={highlightedCode} />
              </pre>
            </div>
          ) : (
            <pre className="w-full h-96 font-mono text-sm p-3 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 overflow-auto whitespace-pre-wrap break-words">
              <code dangerouslySetInnerHTML={highlightJson(rawJson)} />
            </pre>
          )}
           {!isValid && isEditing && (
                <p className="text-sm text-red-500 mt-2">The JSON syntax is invalid.</p>
            )}
        </div>
      </main>
      <footer className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div>
            <button
                onClick={handleOpenFileLocation}
                className="inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
            >
                <FolderOpenIcon className="h-5 w-5 mr-2" />
                Open File Location
            </button>
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button onClick={loadData} className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:underline">
                <ArrowPathIcon className="h-4 w-4 mr-1.5" /> Reload from Disk
              </button>
              <button onClick={handleCancel} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={!isValid} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Save Changes</button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              <PencilIcon className="h-5 w-5 mr-2" />
              Edit JSON
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default JsonConfigView;