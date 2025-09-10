--- START OF FILE TECHNICAL_MANUAL.md ---

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
    -   **Logging:** The main process contains a structured `mainLogger` that replaces all `console` calls. This logger sends messages to the renderer process for display in the debug UI and also writes directly to the debug log file (`git-automation-dashboard-log-[...].log`) if file logging is enabled by the user.
    -   Reads user settings on startup to configure features like the auto-updater's pre-release channel.
    -   Handles native OS interactions (dialogs, file system access).
    -   Listens for and responds to IPC (Inter-Process Communication) events. This includes:
        -   **Project Intelligence:** Handles `get-project-info` and `get-project-suggestions` by analyzing the file system of a repository to detect technologies like Node.js, Python, Delphi, and Lazarus.
        -   **Task Execution:** Executes shell commands for task steps. The `run-task-step` handler now contains logic to interpret and execute the new, ecosystem-specific step types (e.g., `PYTHON_INSTALL_DEPS`). It also handles setting environment variables for tasks.
        -   **Task Log Archiving:** Upon starting a task, it creates a timestamped log file in the user-configured directory. It then streams all `stdout` and `stderr` from the task's execution to this file, in addition to the live view in the UI.
        -   **VCS Commands:** Executes real Git/SVN commands for advanced features like checking status, fetching commit history (now for SVN as well), and managing branches.
        -   **Executable Path Management:** Handles IPC calls for file pickers, auto-detection, and testing of user-configured executable paths.
        -   **External Links:** Handles requests from the renderer to open web links in the user-specified browser.
        -   **GitHub API:** Fetches release information for a repository using a user-provided Personal Access Token.
        -   **Settings I/O:** Manages the import and export of settings files using the `jszip` library.

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
    -   Uses `contextBridge` to expose a safe, limited API (`window.electronAPI`) to the renderer. This includes functions like `getProjectInfo`, `getCommitHistory`, `getDelphiVersions`, etc.

## 3. State Management and Data Flow

-   **Primary State:** The root `App.tsx` component manages the entire application state, including the list of repositories, global settings, dashboard categories, the active view, and the state of modals and panels.
-   **VCS State:** `App.tsx` also holds state for `detailedStatuses` and `branchLists` which are fetched periodically and after tasks complete to keep the UI in sync with the file system.
-   **Parallel Task Execution:** To support running multiple tasks concurrently, a unique `executionId` is generated for each task run. This ID is passed between the renderer and main processes, allowing log output (`task-log`) and completion events (`task-step-end`) to be correctly routed to the appropriate repository and UI components without conflict.
-   **Component Architecture:** The `RepoFormModal` component has been significantly enhanced with the Project Intelligence UI, which conditionally renders task-generation buttons based on data fetched from the `get-project-info` IPC handler. The task editor now renders different configuration options based on the `TaskStepType` enum.

### Data Persistence

All application data, including repositories, categories, and global settings, is persisted to a single `settings.json` file.

-   **Location:** The file is stored in the standard application user data directory for your operating system (e.g., `%APPDATA%` on Windows, `~/Library/Application Support` on macOS). This ensures that user settings are preserved across application updates.
-   **Management:** A `SettingsProvider` context handles loading this data on startup and saving it whenever it changes.
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
--- END OF FILE TECHNICAL_MANUAL.md ---