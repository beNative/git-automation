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

-   **Entry Point:** `index.tsx`
-   **Responsibilities:**
    -   Renders the entire user interface using React.
    -   Manages application state, including repositories, logs, settings, and custom tasks.
    -   The core application logic for running automation workflows resides in the `useRepositoryManager` custom hook.
    -   It cannot directly access Node.js APIs or the file system for security reasons. All such operations must be requested from the Main process via the Preload script.

### Preload Script

-   **Entry Point:** `electron/preload.ts`
-   **Responsibilities:**
    -   Acts as a secure bridge between the Renderer and Main processes.
    -   It runs in the renderer's context but has access to Node.js globals.
    -   It uses `contextBridge` to expose a safe, limited API (`window.electronAPI`) to the renderer, which can then be used to invoke `ipcRenderer` methods. This is crucial for maintaining `contextIsolation`.

## 3. File Structure

```
.
├── assets/                 # Icons and other build resources
├── components/             # React components
│   ├── modals/             # Modal dialog components
│   └── icons/              # SVG icon components
├── electron/               # Electron-specific files
│   ├── main.ts             # Main process entry point
│   └── preload.ts          # Preload script
├── hooks/                  # Custom React hooks (useRepositoryManager)
├── services/               # Business logic services (e.g., automation simulation)
├── CHANGELOG.md            # Version log
├── esbuild.config.js       # esbuild configuration file
├── FUNCTIONAL_MANUAL.md    # User manual
├── package.json            # Project dependencies and scripts
├── README.md               # App's main readme
├── TECHNICAL_MANUAL.md     # This file
└── tsconfig.json           # TypeScript configuration
```

## 4. Development Workflow

1.  **Installation:** Run `npm install` to install all dependencies.
2.  **Environment Variables:** Create a `.env` file or export `API_KEY` in your shell for any services that require it.
3.  **Run in Dev Mode:** `npm start`
    -   This command uses `concurrently` to run two scripts:
        -   `npm:watch`: Runs `esbuild` in watch mode. It continuously monitors source files and rebuilds the `main`, `renderer`, and `preload` bundles in the `dist/` directory on any change.
        -   `npm:electron`: Uses `wait-on` to wait for the initial build to complete, then launches the Electron application.

## 5. Build and Packaging

-   **Command:** `npm run pack`
-   **Process:**
    1.  The script first runs `npm run build`, which executes `esbuild.config.js` with `NODE_ENV=production`. This transpiles, bundles, and minifies the source TypeScript files into production-ready JavaScript in the `dist/` directory.
    2.  `esbuild.config.js` also copies static assets like `index.html` and the documentation files into `dist/`.
    3.  After the build is successful, `electron-builder` is invoked.
    4.  `electron-builder` reads the configuration from the `build` key in `package.json`.
    5.  It packages the application, including the contents of `dist/` and any `extraResources` (like our `docs` folder), into platform-specific installers (`.exe`, `.dmg`, `.AppImage`, etc.).
    6.  The final output is placed in the `release/` directory.

## 6. Publishing and Auto-Updates

To publish a new version that users can automatically update to:

1.  **Configure `package.json`:** Set the `build.publish.owner` and `build.publish.repo` fields to point to your public GitHub repository.
2.  **Create a GitHub Token:** Generate a Personal Access Token with `repo` scope on GitHub.
3.  **Set Environment Variable:** Export the token as `GH_TOKEN` in your terminal environment.
4.  **Increment Version:** Bump the `version` number in `package.json` (e.g., `1.0.0` -> `1.0.1`).
5.  **Run Pack:** Execute `npm run pack`. `electron-builder` will build, package, and upload the artifacts to a new draft release on GitHub.
6.  **Publish Release:** Go to your repository's "Releases" page on GitHub, edit the draft, add release notes, and publish it.

Existing clients will now detect and download this new version automatically.
