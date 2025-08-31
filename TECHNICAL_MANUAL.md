# Technical Manual

This document provides a technical overview of the Git Automation Dashboard application, including its architecture, build process, and development guidelines.

## 1. Technology Stack

-   **Framework:** Electron (for creating the cross-platform desktop application).
-   **UI Library:** React.js with TypeScript.
-   **Styling:** Tailwind CSS (via a CDN for simplicity in this version).
-   **Bundler:** esbuild (for fast and efficient bundling of main, renderer, and preload scripts).
-   **Packager:** electron-builder (for creating distributable installers and packages).
-   **Auto-Updates:** electron-updater.

## 2. Project Architecture

The application is split into three main processes, which is standard for Electron apps:

### Main Process

-   **Entry Point:** `electron/main.ts`
-   **Responsibilities:**
    -   Manages the application lifecycle (`app` events).
    -   Creates and manages `BrowserWindow` instances (the application's windows).
    -   Handles native OS interactions (dialogs, menus).
    -   Listens for and responds to IPC (Inter-Process Communication) events from the renderer process. For example, it handles the `get-doc` event to read documentation files from disk.
    -   Manages the auto-update process via `electron-updater`.

### Renderer Process

-   **Entry Point:** `index.tsx` -> `App.tsx`
-   **Responsibilities:**
    -   Renders the entire user interface using React.
    -   **State Management:** The root `App.tsx` component manages the entire application state, including the list of repositories (which now contain their own tasks), global settings, the active view (`dashboard`, `settings`, or `info`), and the state of the resizable log panel.
    -   **Core Logic:** The `useRepositoryManager` custom hook contains the business logic for managing repositories and running automation tasks.
    -   **Security:** The renderer cannot directly access Node.js APIs. All such operations must be requested from the Main process via the Preload script.

### Preload Script

-   **Entry Point:** `electron/preload.ts`
-   **Responsibilities:**
    -   Acts as a secure bridge between the Renderer and Main processes.
    -   Uses `contextBridge` to expose a safe, limited API (`window.electronAPI`) to the renderer.

## 3. Data Flow for Tasks

A key architectural change is the move from global to repository-specific tasks.

1.  **Storage:** The `repositories` array, which is saved to `localStorage`, is the single source of truth. Each `Repository` object in this array now contains a `tasks: Task[]` property.
2.  **Management:** Tasks are created, updated, and deleted within the `RepoFormModal`. This modal maintains a temporary copy of the repository object in its state.
3.  **Saving:** When the user clicks "Save Repository" in the modal, the entire repository object (including the modified `tasks` array) is passed to the `updateRepository` function, which updates the central state in `App.tsx` and persists it to `localStorage`.

## 4. Development Workflow

1.  **Installation:** Run `npm install` to install all dependencies.
2.  **Environment Variables:** Create a `.env` file or export `API_KEY` in your shell for any services that require it.
3.  **Run in Dev Mode:** `npm start`
    -   This command uses `concurrently` to run `esbuild` in watch mode and launch the Electron app.

## 5. Build and Packaging

-   **Command:** `npm run pack`
-   **Process:**
    1.  The script first runs `npm run build`, which bundles and minifies all source code into the `dist/` directory.
    2.  `electron-builder` then packages the application based on the configuration in `package.json`.
    3.  The final output is placed in the `release/` directory.

## 6. Publishing and Auto-Updates

To publish a new version:

1.  **Configure `package.json`:** Set the `build.publish.owner` and `build.publish.repo` fields to your GitHub repository.
2.  **Create a GitHub Token:** Generate a Personal Access Token with `repo` scope.
3.  **Set Environment Variable:** Export the token as `GH_TOKEN`.
4.  **Increment Version:** Bump the `version` in `package.json`.
5.  **Run Pack:** Execute `npm run pack`.
6.  **Publish Release:** Go to your repository's "Releases" page on GitHub and publish the new draft.
