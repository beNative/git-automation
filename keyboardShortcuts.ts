import type {
  KeyboardShortcutSettings,
  ShortcutBinding,
  ShortcutCategoryDefinition,
  ShortcutContextOption,
  ShortcutDefinition,
  ShortcutScope,
} from './types';

export const SHORTCUT_CONTEXT_LIBRARY: Record<string, ShortcutContextOption> = {
  global: {
    id: 'global',
    label: 'All contexts',
    description: 'Shortcut applies anywhere inside the application interface.',
  },
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard view',
    description: 'Only active while the dashboard is focused.',
  },
  repositories: {
    id: 'repositories',
    label: 'Repository lists',
    description: 'Active when repository lists, tables, or cards are focused.',
  },
  tasks: {
    id: 'tasks',
    label: 'Task panels',
    description: 'Active for task run, log, and configuration panels.',
  },
  settings: {
    id: 'settings',
    label: 'Settings view',
    description: 'Only active inside the settings experience.',
  },
  modals: {
    id: 'modals',
    label: 'Modal dialogs',
    description: 'Active while a modal dialog is open and focused.',
  },
  system: {
    id: 'system',
    label: 'System wide',
    description: 'Available even when the application is not focused.',
  },
  background: {
    id: 'background',
    label: 'Background agent',
    description: 'Processed by background workers while the UI is closed.',
  },
};

export const SHORTCUT_CATEGORIES: ShortcutCategoryDefinition[] = [
  {
    id: 'navigation',
    title: 'Navigation',
    description: 'Global movement controls for traversing the interface and quickly reaching areas of the product.',
  },
  {
    id: 'editing',
    title: 'Editing & selection',
    description: 'Commands that mutate data, toggle selections, or launch editing flows.',
  },
  {
    id: 'views',
    title: 'View controls',
    description: 'Presentation and layout adjustments that affect what is visible.',
  },
  {
    id: 'tasks',
    title: 'Automation & tasks',
    description: 'Run, manage, and inspect automation flows and build pipelines.',
  },
  {
    id: 'system',
    title: 'System integration',
    description: 'Shortcuts that can be elevated to the operating system or background agent.',
  },
];

const { global, dashboard, repositories, tasks, settings, modals, system, background } = SHORTCUT_CONTEXT_LIBRARY;

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  {
    id: 'app.navigation.commandPalette',
    label: 'Open command palette',
    description: 'Launch the searchable command palette for quick navigation and task execution.',
    categoryId: 'navigation',
    keywords: ['search', 'palette', 'actions', 'omnibox'],
    allowApp: true,
    allowGlobal: false,
    contexts: {
      app: [global, dashboard, settings],
    },
    defaultBindings: [
      { scope: 'app', shortcut: 'Mod+K', context: 'global', platform: 'all' },
    ],
  },
  {
    id: 'app.navigation.focusRepositoryFilter',
    label: 'Focus repository filter',
    description: 'Jump to the repository search filter to quickly narrow lists.',
    categoryId: 'navigation',
    keywords: ['filter', 'search', 'repository', 'focus'],
    allowApp: true,
    allowGlobal: false,
    contexts: {
      app: [repositories, dashboard],
    },
    defaultBindings: [
      { scope: 'app', shortcut: 'Mod+F', context: 'repositories', platform: 'all' },
    ],
  },
  {
    id: 'app.navigation.switchDashboard',
    label: 'Go to dashboard',
    description: 'Switch to the dashboard from anywhere in the app.',
    categoryId: 'navigation',
    keywords: ['dashboard', 'home', 'navigate'],
    allowApp: true,
    allowGlobal: true,
    contexts: {
      app: [global],
      global: [system],
    },
    defaultBindings: [
      { scope: 'app', shortcut: 'Mod+1', context: 'global', platform: 'all' },
      { scope: 'global', shortcut: 'Mod+Alt+D', context: 'system', platform: 'all' },
    ],
  },
  {
    id: 'app.navigation.openSettings',
    label: 'Open settings',
    description: 'Navigate directly to the settings view.',
    categoryId: 'navigation',
    keywords: ['settings', 'preferences'],
    allowApp: true,
    allowGlobal: true,
    contexts: {
      app: [global],
      global: [system],
    },
    defaultBindings: [
      { scope: 'app', shortcut: 'Mod+,', context: 'global', platform: 'all' },
      { scope: 'global', shortcut: 'Mod+Alt+,', context: 'system', platform: 'all' },
    ],
  },
  {
    id: 'app.editing.renameRepository',
    label: 'Rename repository',
    description: 'Rename the currently focused repository.',
    categoryId: 'editing',
    keywords: ['rename', 'repository', 'edit'],
    allowApp: true,
    allowGlobal: false,
    contexts: {
      app: [repositories],
    },
    defaultBindings: [
      { scope: 'app', shortcut: 'F2', context: 'repositories', platform: 'all' },
    ],
  },
  {
    id: 'app.editing.duplicateTask',
    label: 'Duplicate task',
    description: 'Clone the selected automation task for quick iteration.',
    categoryId: 'editing',
    keywords: ['copy', 'task', 'duplicate'],
    allowApp: true,
    allowGlobal: false,
    contexts: {
      app: [tasks],
    },
    defaultBindings: [
      { scope: 'app', shortcut: 'Mod+D', context: 'tasks', platform: 'all' },
    ],
  },
  {
    id: 'app.editing.toggleSelection',
    label: 'Toggle repository selection',
    description: 'Select or clear the currently focused repository item.',
    categoryId: 'editing',
    keywords: ['select', 'toggle'],
    allowApp: true,
    allowGlobal: false,
    contexts: {
      app: [repositories, dashboard],
    },
    defaultBindings: [
      { scope: 'app', shortcut: 'Space', context: 'repositories', platform: 'all' },
    ],
  },
  {
    id: 'app.tasks.runSelected',
    label: 'Run selected task',
    description: 'Execute the highlighted automation task without opening the task modal.',
    categoryId: 'tasks',
    keywords: ['task', 'run', 'execute'],
    allowApp: true,
    allowGlobal: false,
    contexts: {
      app: [tasks, dashboard],
    },
    defaultBindings: [
      { scope: 'app', shortcut: 'Mod+Enter', context: 'tasks', platform: 'all' },
    ],
  },
  {
    id: 'app.tasks.cancelActive',
    label: 'Cancel active task',
    description: 'Abort the active automation run and stop subsequent steps.',
    categoryId: 'tasks',
    keywords: ['task', 'cancel', 'stop'],
    allowApp: true,
    allowGlobal: true,
    contexts: {
      app: [tasks, dashboard],
      global: [system],
    },
    defaultBindings: [
      { scope: 'app', shortcut: 'Shift+Escape', context: 'tasks', platform: 'all' },
      { scope: 'global', shortcut: 'Mod+Shift+Escape', context: 'system', platform: 'all' },
    ],
  },
  {
    id: 'app.view.toggleTaskLog',
    label: 'Toggle task log panel',
    description: 'Collapse or expand the persistent task log drawer.',
    categoryId: 'views',
    keywords: ['logs', 'panel', 'view'],
    allowApp: true,
    allowGlobal: false,
    contexts: {
      app: [global, dashboard],
    },
    defaultBindings: [
      { scope: 'app', shortcut: 'Alt+L', context: 'global', platform: 'all' },
    ],
  },
  {
    id: 'app.view.toggleTheme',
    label: 'Toggle light/dark theme',
    description: 'Instantly switch between the light and dark appearance.',
    categoryId: 'views',
    keywords: ['theme', 'appearance', 'dark'],
    allowApp: true,
    allowGlobal: true,
    contexts: {
      app: [global, settings],
      global: [system],
    },
    defaultBindings: [
      { scope: 'app', shortcut: 'Mod+Shift+L', context: 'global', platform: 'all' },
      { scope: 'global', shortcut: 'Mod+Alt+L', context: 'system', platform: 'all' },
    ],
  },
  {
    id: 'app.view.zoomIn',
    label: 'Zoom in',
    description: 'Increase interface scale for improved readability.',
    categoryId: 'views',
    keywords: ['zoom', 'view', 'increase'],
    allowApp: true,
    allowGlobal: false,
    contexts: {
      app: [global],
    },
    defaultBindings: [
      { scope: 'app', shortcut: 'Mod+=', context: 'global', platform: 'all' },
    ],
  },
  {
    id: 'app.system.quickCapture',
    label: 'Quick capture note',
    description: 'Open the quick capture overlay to jot down an idea or todo.',
    categoryId: 'system',
    keywords: ['note', 'capture', 'quick'],
    allowApp: true,
    allowGlobal: true,
    contexts: {
      app: [global, dashboard, modals],
      global: [system],
    },
    defaultBindings: [
      { scope: 'app', shortcut: 'Mod+Shift+N', context: 'global', platform: 'all' },
      { scope: 'global', shortcut: 'Mod+Shift+Space', context: 'system', platform: 'all' },
    ],
  },
  {
    id: 'app.system.toggleAutomationPause',
    label: 'Toggle automation pause',
    description: 'Pause or resume all background automation agents.',
    categoryId: 'system',
    keywords: ['pause', 'automation', 'system'],
    allowApp: true,
    allowGlobal: true,
    contexts: {
      app: [global, dashboard],
      global: [system, background],
    },
    defaultBindings: [
      { scope: 'app', shortcut: 'Mod+Shift+P', context: 'global', platform: 'all' },
      { scope: 'global', shortcut: 'Mod+Alt+P', context: 'system', platform: 'all' },
    ],
  },
  {
    id: 'app.system.bringToFront',
    label: 'Bring app to front',
    description: 'Focus the dashboard window and ensure it is visible.',
    categoryId: 'system',
    keywords: ['focus', 'activate', 'system'],
    allowApp: false,
    allowGlobal: true,
    contexts: {
      global: [system],
    },
    defaultBindings: [
      { scope: 'global', shortcut: 'Mod+Alt+G', context: 'system', platform: 'all' },
    ],
  },
];

const generateBindingId = (actionId: string, scope: ShortcutScope, seed: number) =>
  `${actionId.replace(/[^a-zA-Z0-9]/g, '-')}-${scope}-${seed}`;

const cloneBinding = (
  actionId: string,
  binding: Omit<ShortcutBinding, 'id'>,
  seed: number,
  markDefault: boolean,
): ShortcutBinding => ({
  ...binding,
  id: generateBindingId(actionId, binding.scope, seed),
  isDefault: markDefault,
});

const ensureContext = (action: ShortcutDefinition, scope: ShortcutScope, contextId?: string): string => {
  const available = action.contexts?.[scope];
  if (!available || available.length === 0) {
    return 'global';
  }
  if (contextId && available.some(ctx => ctx.id === contextId)) {
    return contextId;
  }
  return available[0]?.id ?? 'global';
};

export const createDefaultKeyboardShortcutSettings = (): KeyboardShortcutSettings => {
  const bindings: Record<string, ShortcutBinding[]> = {};

  SHORTCUT_DEFINITIONS.forEach(action => {
    bindings[action.id] = action.defaultBindings.map((binding, index) =>
      cloneBinding(
        action.id,
        {
          ...binding,
          context: ensureContext(action, binding.scope, binding.context),
        },
        index,
        true,
      ),
    );
  });

  return {
    version: 1,
    lastUpdated: null,
    bindings,
  };
};

const ensureBindingShape = (
  action: ShortcutDefinition,
  binding: ShortcutBinding,
  seed: number,
): ShortcutBinding => ({
  ...binding,
  id: binding.id ?? generateBindingId(action.id, binding.scope, seed),
  context: ensureContext(action, binding.scope, binding.context),
  platform: binding.platform ?? 'all',
  isDefault: binding.isDefault ?? false,
});

export const mergeKeyboardShortcutSettings = (
  existing?: KeyboardShortcutSettings | null,
): KeyboardShortcutSettings => {
  const defaults = createDefaultKeyboardShortcutSettings();

  if (!existing || !existing.bindings) {
    return defaults;
  }

  const merged: KeyboardShortcutSettings = {
    version: Math.max(existing.version ?? 1, defaults.version),
    lastUpdated: existing.lastUpdated ?? null,
    bindings: {},
  };

  const definitionMap = new Map<string, ShortcutDefinition>(
    SHORTCUT_DEFINITIONS.map(def => [def.id, def]),
  );

  // Include every known action, merging custom bindings when present.
  definitionMap.forEach(action => {
    const existingBindings = existing.bindings[action.id];
    if (!existingBindings || existingBindings.length === 0) {
      merged.bindings[action.id] = defaults.bindings[action.id].map(binding => ({ ...binding }));
      return;
    }

    merged.bindings[action.id] = existingBindings.map((binding, index) =>
      ensureBindingShape(action, binding, index),
    );
  });

  // Preserve user-defined actions that may have been injected from experiments.
  Object.keys(existing.bindings).forEach(actionId => {
    if (merged.bindings[actionId]) {
      return;
    }
    merged.bindings[actionId] = existing.bindings[actionId].map((binding, index) => ({
      ...binding,
      id: binding.id ?? generateBindingId(actionId, binding.scope, index),
      platform: binding.platform ?? 'all',
    }));
  });

  return merged;
};

export const getDefaultBindingsForAction = (
  actionId: string,
): ShortcutBinding[] => {
  const definition = SHORTCUT_DEFINITIONS.find(action => action.id === actionId);
  if (!definition) {
    return [];
  }
  return definition.defaultBindings.map((binding, index) =>
    cloneBinding(
      definition.id,
      {
        ...binding,
        context: ensureContext(definition, binding.scope, binding.context),
      },
      index,
      true,
    ),
  );
};

export const findShortcutDefinition = (actionId: string): ShortcutDefinition | undefined =>
  SHORTCUT_DEFINITIONS.find(action => action.id === actionId);

export const shortcutKey = (binding: ShortcutBinding): string =>
  `${binding.scope}:${binding.context}:${binding.platform}:${binding.shortcut.toLowerCase()}`;
