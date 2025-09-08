# Technical Manual

This document provides a technical overview of the Git Automation Dashboard application, including its architecture, build process, and development guidelines.

## 1. Technology Stack

-   **Framework:** Electron (for creating the cross-platform desktop application).
-   **UI Library:** React.js with TypeScript.
-   **Styling:** Tailwind CSS (via a CDN for simplicity in this version).
-   **Bundler:** esbuild (for fast and efficient bundling of main, renderer, and preload scripts).
-   **Packager:** electron-builder (for creating distributable installers and packages).
-   **Libraries:** `jszip` for handling settings import/export.

## 2. Project Architecture

The application is split into three main processes, which is standard for Electron apps:

### Main Process

-   **Entry Point:** `electron/main.ts`
-   **Responsibilities:**
    -   Manages the application lifecycle (`app` events).
    -   Creates and manages `BrowserWindow` instances (the application's windows).
    -   Reads user settings on startup to configure features like the auto-updater's pre-release channel.
    -   Handles native OS interactions (dialogs, file system access).
    -   Listens for and responds to IPC (Inter-Process Communication) events. This includes:
        -   Executing shell commands for task steps. All Git/SVN command execution now uses user-configured executable paths from settings, falling back to the system `PATH` if not specified.
        -   Executing real Git/SVN commands for advanced features like checking status, fetching commit history, and managing branches (`get-detailed-vcs-status`, `list-branches`, etc.).
        -   Handling new IPC calls for executable path management (file picker, auto-detection, testing).
        -   Handling requests from the renderer to open web links in the user-specified browser.
        -   Fetching the latest release information for a repository from the GitHub API using a user-provided Personal Access Token (`get-latest-release`).
        -   Managing the import and export of settings files using the `jszip` library.

### Renderer Process

-   **Entry Point:** `index.tsx` -> `App.tsx`
-   **Responsibilities:**
    -   Renders the entire user interface using React.
    -   Holds the majority of the application's client-side business logic.
    -   **Security:** The renderer cannot directly access Node.js APIs. All such operations must be requested from the Main process via the Preload script.

### Preload Script

-   **Entry Point:** `electron/preload.ts`
-   **Responsibilities:**
    -   Acts as a secure bridge between the Renderer and Main processes.
    -   Uses `contextBridge` to expose a safe, limited API (`window.electronAPI`) to the renderer. This includes functions like `showFilePicker`, `testExecutablePath`, and `autodetectExecutablePath`.

## 3. State Management and Data Flow

-   **Primary State:** The root `App.tsx` component manages the entire application state, including the list of repositories, global settings, **dashboard categories**, the active view, and the state of modals and panels. UI-specific state, such as the position and visibility of the right-click `ContextMenu`, is also managed here to ensure a single source of truth.
-   **VCS State:** `App.tsx` also holds state for `detailedStatuses` and `branchLists` which are fetched periodically and after tasks complete to keep the UI in sync with the file system.
-   **Parallel Task Execution:** To support running multiple tasks concurrently, a unique `executionId` is generated for each task run. This ID is passed between the renderer and main processes, allowing log output (`task-log`) and completion events (`task-step-end`) to be correctly routed to the appropriate repository and UI components without conflict.
-   **Component Architecture:** Key new components include `CategoryHeader.tsx` for managing category sections, a new `CategoryColorModal.tsx` for a comprehensive customization experience, and a heavily refactored `Dashboard.tsx` that now handles complex drag-and-drop logic. Event handlers in `Dashboard.tsx` are carefully scoped to manage nested drop zones, ensuring that dragging a repository over a category does not conflict with dragging a category over another category.

### Data Persistence

All application data, including repositories, **categories,** and global settings, is persisted to a single `settings.json` file.

-   **Location:** The file is stored in the standard application user data directory for your operating system (e.g., `%APPDATA%` on Windows, `~/Library/Application Support` on macOS). This ensures that user settings are preserved across application updates.
-   **Management:** A `SettingsProvider` context handles loading this data on startup and saving it whenever it changes. To resolve persistent bugs with drag-and-drop reordering, the data model was updated to include an `uncategorizedOrder` array in `settings.json`. The `SettingsContext` now explicitly manages this list, and the `moveRepositoryToCategory` function was significantly refactored to robustly handle all reordering and moving scenarios. Category reordering logic is also managed within the `SettingsContext`, with functions like `moveCategory` (for button-based movement) and `reorderCategories` (for drag-and-drop) ensuring state consistency.
-   **Migration:** A one-time migration process runs on startup to move `settings.json` for users updating from versions prior to `0.2.2`, where the file was incorrectly stored next to the application executable.

## 4. Development Workflow

1.  **Installation:** Run `npm install` to install all dependencies.
2.  **Run in Dev Mode:** `npm start`
    -   This command uses `concurrently` to run `esbuild` in watch mode and launch the Electron app.

## 5. Build and Packaging

-   **Command:** `npm run pack`
-   **Process:**
    1.  The script first runs `npm run build`, which bundles and minifies all source code into the `dist/` directory.
    2.  `electron-builder` then packages the application based on the configuration in `package.json`.
    3.  The final output is placed in the `release/` directory.

## 6. Publishing a Release

To publish a new version for manual download:

1.  **Increment Version:** Bump the `version` in `package.json`.
2.  **Run Pack:** Execute `npm run pack`. This will generate the installers in the `release/` folder.
3.  **Publish Release:** Go to your repository's "Releases" page on GitHub, create a new release, and upload the generated installer files.
## 7. Automatic Updates

The application is configured to automatically check for updates on startup using the `electron-updater` library.

-   **Update Source:** It checks for new releases published on the project's GitHub Releases page. The behavior is controlled by the "Check for Pre-Releases" setting.
-   **Process:**
    1.  On startup, the Main Process (`electron/main.ts`) reads the user's settings to determine whether to allow pre-releases.
    2.  The `autoUpdater` is configured accordingly and checks for updates.
    3.  It sends IPC messages (`update-status-change`) to the Renderer Process to display toast notifications for events like 'checking' and 'downloading'.
    4.  When the `update-downloaded` event is received, the Renderer Process (`App.tsx`) sets a state variable to display the `UpdateBanner` component.
    5.  When the user clicks the "Restart & Install" button on the banner, the Renderer calls `window.electronAPI.restartAndInstallUpdate()`.
    6.  This triggers an IPC event (`restart-and-install-update`) which causes the Main Process to call `autoUpdater.quitAndInstall()`, which handles the update process reliably.
-   **Publishing a New Version:** To publish a new release, a developer with repository access must:
    1.  Ensure the `version` in `package.json` is incremented.
    2.  Create a `GH_TOKEN` (GitHub Personal Access Token) with `repo` scopes and make it available as an environment variable.
    3.  Run the command `npm run publish`. This will build the application, create installers, and upload them to a new draft release on GitHub.
    4.  Navigate to the GitHub release, add release notes, and publish it.