# Version Log

All notable changes to this project will be documented in this file.

## [1.5.0] - YYYY-MM-DD

### Added
- **Deeper Version Control Integration:**
  - **Visual Git Status:** Repository cards now show detailed Git status, including how many commits the local branch is ahead or behind its remote, and a summary of modified, added, and deleted files (`+5 ~3 -1`).
  - **Branch Management:** A new "Branches" tab in the repository configuration view allows users to view, create, delete (local and remote), and merge Git branches.
  - **Branch Switching:** A dropdown menu has been added to repository cards to quickly view and switch between local and remote branches.
  - **Commit History Viewer:** A new "History" tab in the repository configuration view displays the 30 most recent commits. A new "History" button on the repository card provides quick access to this information in a modal.
- **Parallel Task Execution:** Tasks on different repositories can now run concurrently, each in its own process. The UI can handle multiple "processing" states at once.

### Fixed
- **Branch Switching Ambiguity:** The branch switcher now correctly handles repositories with multiple remotes and branches of the same name by displaying the full remote path (e.g., `origin/main`) and using a more precise `git checkout --track` command.

## [1.4.0] - YYYY-MM-DD

### Changed
- **UI Compactness:** Significantly reduced padding, margins, and component sizes across the application to create a more compact, data-dense interface. This affects the Header, Dashboard, Repository Cards, Configuration Views, Log Panel, and Settings.
- Updated all documentation to reflect the latest version and features.

### Fixed
- **Dropdown Visibility:** The "Run Task" dropdown menu on repository cards now dynamically opens upwards when there isn't enough space below, preventing it from being clipped by the viewport.
- Resolved a TypeScript compilation error in `electron/main.ts` related to missing Node.js global type definitions without modifying the build environment.

## [1.3.0] - YYYY-MM-DD

### Added
- **Light/Dark Mode:** Added a theme switcher in the Settings view to toggle between light and dark modes for the entire application.
- The user's theme preference is persisted across application restarts.
- A pre-load script prevents "flash of unstyled content" when opening the app in dark mode.

### Fixed
- Updated the UI of all components to be fully theme-aware.

### Removed
- Removed obsolete, unused components (`LogModal.tsx`, `SettingsModal.tsx`) from the codebase to improve maintainability.

## [1.2.0] - YYYY-MM-DD

### Added
- **Repository-Specific Tasks:** Tasks are now created and managed for each individual repository. The global task list has been removed.
- **Resizable Log Panel:** The log modal has been replaced with a resizable panel at the bottom of the application window for a more integrated experience.
- **Tab-based Navigation:** The main application layout is now controlled by tabs in the header, allowing users to switch between the Dashboard, a new dedicated Settings view, and the Info hub.

### Changed
- **Major UI Refactor:** The settings modal has been converted into a main application view.
- The "Edit Repository" modal now includes a "Tasks" tab for managing that repository's specific automation scripts.
- The application header now serves as the primary navigation control.

## [1.1.0] - YYYY-MM-DD

### Added
- **Scriptable Tasks:** Major new feature allowing users to create, manage, and run custom multi-step automation scripts.
  - New "Tasks" tab in the Settings modal for creating/editing/deleting tasks.
  - Task steps include 'Git Pull', 'Install Dependencies', and 'Run Custom Command'.
  - Repository cards now feature a "Run Task" dropdown to execute any defined task.

### Changed
- Refactored automation engine to support dynamic task steps instead of a hard-coded workflow.
- Updated all documentation to reflect the new scriptable tasks feature.

## [1.0.0] - YYYY-MM-DD

### Added

-   **Initial Release** of the Git Automation Dashboard.
-   Core functionality: Add, edit, delete, and run automation on Git repositories.
-   Real-time log viewer for automation tasks.
-   Global settings for package manager and build commands.
-   **Electron Packaging:** Application is fully packaged for Windows, macOS, and Linux using Electron and esbuild.
-   **Automatic Updates:** Integrated `electron-updater` to automatically check for and install new versions from GitHub Releases.
-   **In-App Documentation Viewer:** Added an "Info Hub" to view the README, functional manual, technical manual, and this changelog directly within the application.