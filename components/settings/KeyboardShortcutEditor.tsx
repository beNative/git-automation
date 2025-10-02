import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  KeyboardShortcutSettings,
  ShortcutBinding,
  ShortcutConflict,
  ShortcutDefinition,
  ShortcutScope,
} from '../../types';
import {
  SHORTCUT_CATEGORIES,
  SHORTCUT_CONTEXT_LIBRARY,
  SHORTCUT_DEFINITIONS,
  createDefaultKeyboardShortcutSettings,
  findShortcutDefinition,
  getDefaultBindingsForAction,
  shortcutKey,
} from '../../keyboardShortcuts';
import { KeyboardIcon } from '../icons/KeyboardIcon';

interface KeyboardShortcutEditorProps {
  value: KeyboardShortcutSettings;
  onChange: (nextValue: KeyboardShortcutSettings) => void;
  onResetToDefaults: () => void;
  confirmAction: (options: {
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    confirmButtonClass?: string;
    icon?: React.ReactNode;
  }) => void;
  showToast?: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

const SCOPE_LABEL: Record<ShortcutScope, string> = {
  app: 'In-app',
  global: 'Global',
};

const isMacPlatform = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(window.navigator.platform ?? '');

const KEY_NAME_MAP: Record<string, string> = {
  ' ': 'Space',
  Spacebar: 'Space',
  Escape: 'Escape',
  Esc: 'Escape',
  Enter: 'Enter',
  Return: 'Enter',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Tab: 'Tab',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
};

const getDisplayName = (shortcut: string): string => {
  return shortcut
    .split('+')
    .map(part => {
      if (part === 'Cmd') {
        return '⌘';
      }
      if (part === 'Ctrl') {
        return 'Ctrl';
      }
      if (part === 'Win') {
        return 'Win';
      }
      if (part === 'Option') {
        return '⌥';
      }
      if (part === 'Alt') {
        return 'Alt';
      }
      if (part === 'Shift') {
        return '⇧';
      }
      return part;
    })
    .join(' + ');
};

const normalizePrimaryKey = (key: string): string => {
  if (KEY_NAME_MAP[key]) {
    return KEY_NAME_MAP[key];
  }
  if (key.length === 1) {
    return key === key.toLowerCase() ? key.toUpperCase() : key;
  }
  if (/^f\d{1,2}$/i.test(key)) {
    return key.toUpperCase();
  }
  return key.slice(0, 1).toUpperCase() + key.slice(1);
};

const buildShortcutFromEvent = (event: KeyboardEvent): string | null => {
  if (event.key === 'Escape') {
    return null;
  }

  const parts: string[] = [];

  if (event.ctrlKey) {
    parts.push('Ctrl');
  }
  if (event.metaKey) {
    parts.push(isMacPlatform ? 'Cmd' : 'Win');
  }
  if (event.altKey) {
    parts.push(isMacPlatform ? 'Option' : 'Alt');
  }
  if (event.shiftKey) {
    parts.push('Shift');
  }

  const key = event.key;
  if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
    parts.push(normalizePrimaryKey(key));
  }

  if (parts.length === 0) {
    return null;
  }

  if (parts.length === 1 && ['Ctrl', 'Cmd', 'Win', 'Option', 'Alt', 'Shift'].includes(parts[0])) {
    // Require at least one non-modifier key.
    return null;
  }

  return parts.join('+');
};

const getContextOptions = (action: ShortcutDefinition, scope: ShortcutScope) => {
  return action.contexts?.[scope] ?? [SHORTCUT_CONTEXT_LIBRARY.global];
};

const computeActionDiffersFromDefault = (
  actionId: string,
  currentBindings: ShortcutBinding[],
  defaultBindings: ShortcutBinding[],
) => {
  if (currentBindings.length !== defaultBindings.length) {
    return true;
  }

  const normalize = (binding: ShortcutBinding) =>
    `${binding.scope}|${binding.context}|${binding.platform}|${binding.shortcut}`;

  const current = [...currentBindings].map(normalize).sort().join('|');
  const defaults = [...defaultBindings].map(normalize).sort().join('|');
  return current !== defaults;
};

const KeyboardShortcutEditor: React.FC<KeyboardShortcutEditorProps> = ({
  value,
  onChange,
  onResetToDefaults,
  confirmAction,
  showToast,
}) => {
  const defaultSettings = useMemo(() => createDefaultKeyboardShortcutSettings(), []);
  const [selectedCategory, setSelectedCategory] = useState<string>(SHORTCUT_CATEGORIES[0]?.id ?? 'navigation');
  const [searchTerm, setSearchTerm] = useState('');
  const [captureState, setCaptureState] = useState<{
    actionId: string;
    bindingId: string;
    scope: ShortcutScope;
    wasNew: boolean;
  } | null>(null);
  const [highlightedAction, setHighlightedAction] = useState<string | null>(null);
  const [pendingFocusAction, setPendingFocusAction] = useState<string | null>(null);
  const actionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const settings = value;

  useEffect(() => {
    if (!pendingFocusAction) {
      return;
    }

    const node = actionRefs.current[pendingFocusAction];
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedAction(pendingFocusAction);
      setTimeout(() => setHighlightedAction(null), 1600);
    }
    setPendingFocusAction(null);
  }, [pendingFocusAction, settings.bindings, selectedCategory]);

  const conflictAnalysis = useMemo(() => {
    const combinationMap = new Map<string, { actionId: string; binding: ShortcutBinding }[]>();

    Object.entries(settings.bindings).forEach(([actionId, bindings]) => {
      bindings.forEach(binding => {
        if (!binding.shortcut) {
          return;
        }
        const key = shortcutKey(binding);
        if (!combinationMap.has(key)) {
          combinationMap.set(key, []);
        }
        combinationMap.get(key)!.push({ actionId, binding });
      });
    });

    const conflicts: ShortcutConflict[] = [];
    const conflictLookup = new Map<string, ShortcutConflict['conflictsWith']>();
    const conflictGroups = new Map<string, { key: string; members: { actionId: string; binding: ShortcutBinding }[] }>();

    combinationMap.forEach((entries, key) => {
      if (entries.length <= 1) {
        return;
      }
      conflictGroups.set(key, { key, members: entries });
      entries.forEach((entry, index) => {
        const others = entries
          .filter((_, idx) => idx !== index)
          .map(other => ({ actionId: other.actionId, binding: other.binding }));
        conflicts.push({ actionId: entry.actionId, binding: entry.binding, conflictsWith: others });
        conflictLookup.set(entry.binding.id, others);
      });
    });

    return {
      conflicts,
      conflictLookup,
      conflictGroupCount: conflictGroups.size,
    };
  }, [settings.bindings]);

  const visibleActions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return SHORTCUT_DEFINITIONS.filter(action => {
      const matchesCategory =
        selectedCategory === action.categoryId || normalizedSearch.length > 0;
      if (!matchesCategory) {
        return false;
      }
      if (normalizedSearch.length === 0) {
        return true;
      }
      const haystack = [
        action.label,
        action.description,
        action.keywords.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [selectedCategory, searchTerm]);

  const focusAction = (actionId: string) => {
    const definition = findShortcutDefinition(actionId);
    if (!definition) {
      return;
    }
    if (definition.categoryId !== selectedCategory) {
      setSelectedCategory(definition.categoryId);
      setPendingFocusAction(actionId);
    } else {
      setPendingFocusAction(actionId);
    }
  };

  const updateActionBindings = useCallback(
    (
      actionId: string,
      updater: (bindings: ShortcutBinding[]) => ShortcutBinding[],
    ) => {
      const nextBindings = updater(settings.bindings[actionId] ?? []);
      onChange({
        ...settings,
        bindings: {
          ...settings.bindings,
          [actionId]: nextBindings,
        },
        lastUpdated: new Date().toISOString(),
      });
    },
    [onChange, settings],
  );

  const handleStartCapture = (
    actionId: string,
    binding: ShortcutBinding,
    scope: ShortcutScope,
    wasNew = false,
  ) => {
    setCaptureState({ actionId, bindingId: binding.id, scope, wasNew });
  };

  const handleCancelCapture = useCallback(() => {
    if (captureState?.wasNew) {
      updateActionBindings(captureState.actionId, bindings =>
        bindings.filter(binding => binding.id !== captureState.bindingId),
      );
    }
    setCaptureState(null);
  }, [captureState, updateActionBindings]);

  const handleShortcutCaptured = useCallback(
    (shortcut: string) => {
      if (!captureState) {
        return;
      }
      const { actionId, bindingId } = captureState;
      updateActionBindings(actionId, bindings =>
        bindings.map(binding =>
          binding.id === bindingId
            ? { ...binding, shortcut, isDefault: false }
            : binding,
        ),
      );
      setCaptureState(null);
      showToast?.({ message: `Assigned ${shortcut}`, type: 'success' });
    },
    [captureState, showToast, updateActionBindings],
  );

  useEffect(() => {
    if (!captureState) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const shortcut = buildShortcutFromEvent(event);
      if (shortcut === null) {
        if (event.key === 'Escape') {
          handleCancelCapture();
        }
        return;
      }
      handleShortcutCaptured(shortcut);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [captureState, handleCancelCapture, handleShortcutCaptured]);

  const handleContextChange = (
    actionId: string,
    bindingId: string,
    contextId: string,
  ) => {
    updateActionBindings(actionId, bindings =>
      bindings.map(binding =>
        binding.id === bindingId ? { ...binding, context: contextId } : binding,
      ),
    );
  };

  const handleClearBinding = (
    actionId: string,
    bindingId: string,
  ) => {
    updateActionBindings(actionId, bindings =>
      bindings.filter(binding => binding.id !== bindingId),
    );
  };

  const handleResetAction = (actionId: string) => {
    const defaults = getDefaultBindingsForAction(actionId);
    updateActionBindings(actionId, () => defaults.map(binding => ({ ...binding })));
    showToast?.({ message: 'Shortcuts reset to defaults.', type: 'info' });
  };

  const handleResolveConflict = (
    actionId: string,
    bindingId: string,
    conflicting: { actionId: string; binding: ShortcutBinding }[],
  ) => {
    confirmAction({
      title: 'Resolve shortcut conflict',
      message: (
        <div className="space-y-2 text-sm">
          <p>
            Clear this binding and keep the shortcut assigned to the other action? You can
            assign a new shortcut afterward.
          </p>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
            {conflicting.map(item => {
              const definition = findShortcutDefinition(item.actionId);
              return (
                <li key={`${item.actionId}-${item.binding.id}`}>
                  {definition?.label ?? item.actionId} ({SCOPE_LABEL[item.binding.scope]})
                </li>
              );
            })}
          </ul>
        </div>
      ),
      confirmText: 'Clear this binding',
      confirmButtonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
      onConfirm: () => {
        handleClearBinding(actionId, bindingId);
        showToast?.({ message: 'Binding cleared.', type: 'info' });
      },
    });
  };

  const handleNavigateToConflict = (actionId: string) => {
    focusAction(actionId);
  };

  const handleAddBinding = (action: ShortcutDefinition, scope: ShortcutScope) => {
    const contextOptions = getContextOptions(action, scope);
    const binding: ShortcutBinding = {
      id: `${action.id.replace(/[^a-zA-Z0-9]/g, '-')}-${scope}-${Date.now()}`,
      scope,
      shortcut: '',
      context: contextOptions[0]?.id ?? 'global',
      platform: 'all',
      isDefault: false,
    };

    updateActionBindings(action.id, bindings => [...bindings, binding]);
    setTimeout(() => handleStartCapture(action.id, binding, scope, true), 0);
  };

  const hasConflicts = conflictAnalysis.conflictGroupCount > 0;

  return (
    <div className="space-y-6" aria-label="Keyboard shortcut editor">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-200">
            <KeyboardIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Keyboard shortcuts</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Customize shortcuts for every action. Conflicts are detected instantly and
              scoped to either in-app interactions or global system level triggers.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`px-2 py-1 text-xs font-semibold rounded-md ${hasConflicts ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'}`}>
            {hasConflicts
              ? `${conflictAnalysis.conflictGroupCount} conflict${conflictAnalysis.conflictGroupCount > 1 ? 's' : ''} detected`
              : 'No conflicts detected'}
          </div>
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 underline"
            onClick={() =>
              confirmAction({
                title: 'Reset all shortcuts',
                message: 'Restore every shortcut to the product defaults? This cannot be undone.',
                confirmText: 'Restore defaults',
                confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white',
                onConfirm: () => {
                  onResetToDefaults();
                  showToast?.({ message: 'All shortcuts restored to defaults.', type: 'info' });
                },
              })
            }
          >
            Restore defaults
          </button>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Shortcut categories">
            {SHORTCUT_CATEGORIES.map(category => (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={selectedCategory === category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {category.title}
              </button>
            ))}
          </div>
          <label className="relative block w-full max-w-xs">
            <span className="sr-only">Search shortcuts</span>
            <input
              type="search"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Search actions..."
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
        </div>
      </header>

      <div className="space-y-6">
        {visibleActions.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            No shortcuts match the current filters.
          </div>
        )}

        {visibleActions.map(action => {
          const actionBindings = settings.bindings[action.id] ?? [];
          const defaults = defaultSettings.bindings[action.id] ?? [];
          const differsFromDefault = computeActionDiffersFromDefault(
            action.id,
            actionBindings,
            defaults,
          );
          const isHighlighted = highlightedAction === action.id;

          return (
            <section
              key={action.id}
              ref={node => {
                actionRefs.current[action.id] = node;
              }}
              className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800 ${
                isHighlighted ? 'ring-2 ring-blue-400 dark:ring-blue-300' : ''
              }`}
              aria-labelledby={`${action.id}-label`}
            >
              <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 id={`${action.id}-label`} className="text-lg font-semibold">
                    {action.label}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{action.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  {differsFromDefault && (
                    <button
                      type="button"
                      onClick={() => handleResetAction(action.id)}
                      className="text-sm text-blue-600 underline hover:text-blue-500 dark:text-blue-300"
                    >
                      Reset to defaults
                    </button>
                  )}
                </div>
              </header>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {(['app', 'global'] as ShortcutScope[]).map(scope => {
                  if ((scope === 'app' && !action.allowApp) || (scope === 'global' && !action.allowGlobal)) {
                    return null;
                  }

                  const scopeBindings = actionBindings.filter(binding => binding.scope === scope);
                  const contextOptions = getContextOptions(action, scope);

                  return (
                    <div key={`${action.id}-${scope}`} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {SCOPE_LABEL[scope]}
                        </span>
                        <button
                          type="button"
                          className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-300"
                          onClick={() => handleAddBinding(action, scope)}
                        >
                          + Add binding
                        </button>
                      </div>

                      {scopeBindings.length === 0 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          No bindings configured.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {scopeBindings.map(binding => {
                            const conflicts = conflictAnalysis.conflictLookup.get(binding.id) ?? [];
                            const isCapturing = captureState?.bindingId === binding.id;

                            return (
                              <div key={binding.id} className="space-y-2">
                                <div
                                  className={`flex flex-col gap-2 rounded-md border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                                    conflicts.length > 0
                                      ? 'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-900/30'
                                      : 'border-gray-200 dark:border-gray-700'
                                  }`}
                                >
                                  <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                                    <button
                                      type="button"
                                      onClick={() => handleStartCapture(action.id, binding, scope)}
                                      className={`rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                        isCapturing
                                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/40 dark:text-blue-100'
                                          : 'border-gray-300 bg-white hover:border-blue-500 dark:border-gray-600 dark:bg-gray-900'
                                      }`}
                                    >
                                      {binding.shortcut
                                        ? getDisplayName(binding.shortcut)
                                        : isCapturing
                                          ? 'Listening...'
                                          : 'Assign shortcut'}
                                    </button>

                                    <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                                      <span>Context</span>
                                      <select
                                        value={binding.context}
                                        onChange={event =>
                                          handleContextChange(action.id, binding.id, event.target.value)
                                        }
                                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900"
                                      >
                                        {contextOptions.map(option => (
                                          <option key={option.id} value={option.id}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                    </label>

                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                      onClick={() => handleClearBinding(action.id, binding.id)}
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>

                                {conflicts.length > 0 && (
                                  <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
                                    <p className="font-semibold">Conflicts with:</p>
                                    <ul className="mt-1 space-y-1">
                                      {conflicts.map(conflict => {
                                        const definition = findShortcutDefinition(conflict.actionId);
                                        return (
                                          <li key={`${binding.id}-${conflict.actionId}`} className="flex items-center justify-between gap-2">
                                            <span>
                                              {definition?.label ?? conflict.actionId} ({SCOPE_LABEL[conflict.binding.scope]})
                                            </span>
                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                className="text-blue-600 hover:text-blue-500 dark:text-blue-300 text-[11px]"
                                                onClick={() => handleNavigateToConflict(conflict.actionId)}
                                              >
                                                View action
                                              </button>
                                              <button
                                                type="button"
                                                className="text-[11px] text-red-600 hover:text-red-500 dark:text-red-300"
                                                onClick={() => handleResolveConflict(action.id, binding.id, conflicts)}
                                              >
                                                Clear binding
                                              </button>
                                            </div>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {captureState && (
        <div
          role="status"
          aria-live="assertive"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
        >
          <div className="rounded-lg bg-white p-6 text-center shadow-xl dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-300">Press the desired key combination</p>
            <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">Listening...</p>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">Press Esc to cancel</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyboardShortcutEditor;
