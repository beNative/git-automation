# Keyboard Shortcut Editor Specification

## Overview
The keyboard shortcut editor provides a modern, accessible experience for configuring every shortcut in the Git Automation Dashboard. It lives inside the Settings view and exposes both application-scoped and system-wide bindings with immediate validation feedback. The implementation combines a structured catalog of shortcut definitions with an interactive React editor that updates settings in real time while guaranteeing conflict detection and safe persistence.

Key goals:
- Offer a hierarchical browsing model aligned with the product's mental model (navigation, editing, view controls, automation, system).
- Support multiple bindings per action, across application and global scopes, with optional context and platform targeting.
- Detect and surface conflicts instantly with actionable resolution options.
- Persist changes through the existing `GlobalSettings` flow, ensuring defaults are merged when legacy settings are loaded.
- Maintain full accessibility, keyboard operability, and screen reader support throughout the editor.

## Information Architecture
### Shortcut Catalog (`keyboardShortcuts.ts`)
The catalog defines the canonical list of actions and their defaults.

- **Categories** (`SHORTCUT_CATEGORIES`): Provide the hierarchical navigation structure for the editor and group actions by intent (navigation, editing, views, tasks, system). Each entry includes an id, title, and description.【F:keyboardShortcuts.ts†L37-L70】
- **Contexts** (`SHORTCUT_CONTEXT_LIBRARY`): Describe where bindings are active (e.g., dashboard, repositories list, system). Each definition supplies user-facing labels and descriptions for accessibility copy.【F:keyboardShortcuts.ts†L5-L36】
- **Action definitions** (`SHORTCUT_DEFINITIONS`): List every configurable action, its metadata, allowed scopes, available contexts, and default bindings. Defaults include scope, shortcut string, context id, and platform target.【F:keyboardShortcuts.ts†L72-L209】【F:keyboardShortcuts.ts†L211-L283】
- **Utility helpers**:
  - `createDefaultKeyboardShortcutSettings()` produces a normalized `KeyboardShortcutSettings` object populated with all default bindings, marking them as defaults for downstream comparisons.【F:keyboardShortcuts.ts†L285-L313】
  - `mergeKeyboardShortcutSettings()` merges persisted settings with new definitions to avoid missing actions when upgrades introduce new shortcuts.【F:keyboardShortcuts.ts†L331-L368】
  - `getDefaultBindingsForAction()` and `findShortcutDefinition()` expose metadata for the editor UI.【F:keyboardShortcuts.ts†L374-L396】
  - `shortcutKey()` canonicalizes bindings for conflict detection by combining scope, context, platform, and normalized shortcut string.【F:keyboardShortcuts.ts†L398-L399】

### Global Settings Schema (`types.ts`)
- Adds `KeyboardShortcutSettings`, `ShortcutBinding`, `ShortcutDefinition`, and related types to ensure type-safety across renderer and main process.【F:types.ts†L5-L49】【F:types.ts†L95-L109】
- `GlobalSettings` now includes a `keyboardShortcuts` property persisted alongside other preferences.【F:types.ts†L95-L109】

### Default Provisioning
- Renderer (`contexts/SettingsContext.tsx`) and main process (`electron/main.ts`) both seed settings with `createDefaultKeyboardShortcutSettings()` and merge existing data via `mergeKeyboardShortcutSettings()` so legacy installs receive the new schema automatically.【F:contexts/SettingsContext.tsx†L9-L15】【F:contexts/SettingsContext.tsx†L28-L49】【F:contexts/SettingsContext.tsx†L103-L112】【F:electron/main.ts†L12-L17】【F:electron/main.ts†L52-L74】【F:electron/main.ts†L103-L117】
- When defaults are required (e.g., missing settings file), the main process rebuilds a fresh object to avoid mutating shared references.【F:electron/main.ts†L118-L121】

## User Interface & Interaction Flow
### Settings Navigation Integration
- Settings navigation gains a **Shortcuts** tab with a keyboard icon, keeping parity with existing category navigation while matching the app’s visual language.【F:components/SettingsView.tsx†L6-L15】【F:components/SettingsView.tsx†L57-L88】【F:components/SettingsView.tsx†L140-L149】
- Selecting the tab renders the `KeyboardShortcutEditor` inside the settings pane without breaking the existing form submission behavior. Save and reset buttons at the bottom continue to work because the editor updates local `settings` state just like other controls.【F:components/SettingsView.tsx†L90-L117】【F:components/SettingsView.tsx†L150-L177】

### Layout
- Header features status chips (conflict indicator), global reset, and category pills (rendered as accessible tablist) for hierarchical browsing.【F:components/settings/KeyboardShortcutEditor.tsx†L226-L273】
- Search input provides instant filtering across all categories while retaining the current tab highlight.【F:components/settings/KeyboardShortcutEditor.tsx†L259-L273】
- Each action renders as a card with metadata, per-scope sections (app/global), and lists of bindings. The layout adapts responsively with CSS grid to maintain clarity on various breakpoints.【F:components/settings/KeyboardShortcutEditor.tsx†L315-L441】

### Binding Interaction
- **Add binding**: Users can add unlimited bindings per scope. Clicking “+ Add binding” inserts a placeholder binding with default context/platform and immediately opens capture mode to listen for the next keypress.【F:components/settings/KeyboardShortcutEditor.tsx†L405-L444】
- **Capture mode**: An overlay announces “Listening…” and intercepts `keydown` events until the user presses a combination or `Esc` (cancel). Modifier-only input is ignored to prevent invalid shortcuts.【F:components/settings/KeyboardShortcutEditor.tsx†L180-L217】【F:components/settings/KeyboardShortcutEditor.tsx†L331-L356】【F:components/settings/KeyboardShortcutEditor.tsx†L444-L468】
- **Editing controls**: Each binding exposes dropdowns for context and platform targeting. Clearing removes the binding entirely. Per-action “Reset to defaults” restores the initial configuration, while a global “Restore defaults” sits at the top of the editor.【F:components/settings/KeyboardShortcutEditor.tsx†L191-L213】【F:components/settings/KeyboardShortcutEditor.tsx†L356-L404】【F:components/settings/KeyboardShortcutEditor.tsx†L430-L441】

### Accessibility
- All interactive elements are keyboard reachable with focus styles and `aria` attributes (e.g., tablist roles, overlay `aria-live`). The overlay uses `role="status"` for assistive alerts, and context selectors use semantic `<label>` markup for screen readers.【F:components/settings/KeyboardShortcutEditor.tsx†L226-L273】【F:components/settings/KeyboardShortcutEditor.tsx†L315-L441】【F:components/settings/KeyboardShortcutEditor.tsx†L444-L468】

## Conflict Detection & Resolution
- Conflicts are detected by aggregating bindings into a map keyed by scope, context, platform, and normalized shortcut string (`shortcutKey`). Bindings sharing the same key with different action ids produce a `ShortcutConflict`.【F:components/settings/KeyboardShortcutEditor.tsx†L215-L246】【F:keyboardShortcuts.ts†L398-L399】
- The editor displays a global conflict chip and per-binding warnings styled with high-contrast colors. Conflict panels list affected actions, provide a “View action” link (which changes category and scrolls into view) and a “Clear binding” action to remove the offending binding through a confirmation dialog.【F:components/settings/KeyboardShortcutEditor.tsx†L226-L273】【F:components/settings/KeyboardShortcutEditor.tsx†L356-L441】
- Conflicts update live as users type, because the conflict map is recalculated on every render via `useMemo` and the capture overlay commits updates instantly.【F:components/settings/KeyboardShortcutEditor.tsx†L215-L246】【F:components/settings/KeyboardShortcutEditor.tsx†L331-L356】

## State Management & Persistence
- `KeyboardShortcutEditor` operates on the `KeyboardShortcutSettings` passed from `SettingsView`, invoking `onChange` with immutable updates (per-action cloning) that update `settings.keyboardShortcuts` in component state. Saving the form persists via the existing `onSave` pipeline in `SettingsView`, which eventually triggers `window.electronAPI.saveAllData` through `SettingsContext`.
- `SettingsContext` merges defaults during initial load, so older persisted data gains new actions automatically. Electron’s `readSettings` mirrors this merge to keep renderer/main process caches in sync.【F:contexts/SettingsContext.tsx†L103-L112】【F:electron/main.ts†L103-L117】
- `KeyboardShortcutSettings.lastUpdated` stores an ISO timestamp each time the editor mutates bindings, enabling potential future features such as syncing or undo tracking.【F:components/settings/KeyboardShortcutEditor.tsx†L300-L313】【F:types.ts†L23-L49】

## Real-time Updates & Extensibility
- The editor’s local state updates propagate instantly to the preview UI, conflict indicators, and summary chips thanks to React’s `useState`/`useMemo` flow.
- `shortcutKey` and platform/context metadata allow future integrations (e.g., registering Electron global shortcuts) without changing the UI contract. `ShortcutBinding.platform` enables OS-specific bindings, and context ids can be extended with new view identifiers while retaining backwards compatibility.
- Developers can introduce new actions by updating `SHORTCUT_DEFINITIONS`. Migrations are handled automatically by `mergeKeyboardShortcutSettings`, and the UI will surface the new action under the configured category with default bindings.

## Error Handling & Validation
- Modifier-only captures return `null` and keep the overlay open, avoiding invalid assignments. Cancellation removes newly inserted blank bindings to prevent ghost entries.【F:components/settings/KeyboardShortcutEditor.tsx†L180-L217】【F:components/settings/KeyboardShortcutEditor.tsx†L300-L333】
- Reset and clear actions use `confirmAction` and toasts for explicit feedback, aligning with the app’s existing UX patterns.【F:components/settings/KeyboardShortcutEditor.tsx†L370-L404】

## Future Hooks
- The structure supports hooking into a runtime shortcut registry (e.g., via a dedicated context) by indexing `settings.keyboardShortcuts.bindings`. Any consumer can reuse `shortcutKey` and the catalog to register listeners or show active shortcut hints. The state object is already versioned (`version: 1`) to accommodate future schema migrations.【F:keyboardShortcuts.ts†L285-L313】【F:types.ts†L23-L49】

## Documentation Status for 0.25.2
- Re-validated that the shortcut editor architecture, UI flows, and persistence notes above still reflect the current implementation for version `0.25.2`. No technical adjustments were required beyond recording this confirmation for the release audit trail.

