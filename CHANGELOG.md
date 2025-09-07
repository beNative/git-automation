# Version Log

All notable changes to this project will be documented in this file.

## [0.4.0]

### Added
- **Dashboard Categories:** Major feature allowing repositories to be organized into customizable, collapsible sections on the dashboard.
- Full drag-and-drop support for reordering repositories, reordering categories, and assigning repositories to categories.
- Categories can be created, renamed, and deleted directly from the dashboard UI.

### Fixed
- Fixed a `ReferenceError` related to `uncategorizedRepos` initialization that could prevent the dashboard from rendering.

## [0.3.0]

### Changed
- Replaced all native confirmation dialogs (`window.confirm`) with a custom, consistently styled modal for a more attractive and integrated user experience.

## [0.2.3]

### Added
- **Settings Import/Export:** Added the ability to import and export the complete application configuration (`settings.json`) as a `.zip` file from the JSON Configuration screen. This allows for easy backup, restoration, and sharing of setups.

## [0.2.2]

### Fixed
- **CRITICAL:** Fixed a major bug where `settings.json` was deleted during an auto-update, causing all user settings and repositories to be lost. The application now correctly stores all user data in the standard persistent user data directory. A one-time migration process has been added to automatically move existing settings for users updating from older versions.

## [0.2.1]

### Added
- **Configurable Auto-Updates:** Added a setting to enable or disable checking for pre-release versions.
- **Configurable Browser:** Added a setting to choose which browser (System Default, Chrome, or Firefox) is used to open web links.

## [0.2.0]

### Fixed
- **Auto-Update Installation:** Fixed a critical bug where downloaded updates were not installed upon restarting the application.

### Added
- **Update Installation Banner:** When an update is downloaded, a prominent banner now appears at the top of the application with a "Restart & Install" button, providing a clear and reliable way to apply updates.

## [0.1.9]

### Added
- **Context Menu:** A right-click context menu has been added to repository cards, providing quick access to all common actions (run tasks, open folder, view logs, etc.).
- **Copy to Clipboard:** Added one-click copy buttons for the Remote URL and Local Path on each repository card for convenience.

### Fixed
- Fixed a bug where the auto-updater would fail if the latest GitHub release was marked as a pre-release. The updater is now configured to allow pre-releases.
- Fixed a critical React rendering error ("white screen") that occurred when trying to open the context menu due to a violation of the Rules of Hooks.
- Corrected several minor TypeScript errors and potential bugs throughout the frontend and main process code for improved stability.

## [0.1.7]

### Added
- **Check for Updates:** A new "Check Updates" button in the header allows fetching remote changes for all valid repositories at once.
- **"Updates Available" Indicator:** Repository cards now display a clear indicator when new commits or a higher SVN revision are available on the remote.
- **Tabbed Log Viewing:** The Task Log Panel now features a tabbed interface, allowing users to view logs from multiple concurrent tasks simultaneously.

### Changed
- **Integrated Log Panel:** The Task Log Panel is no longer an overlay. It is now integrated into the main layout, smoothly resizing the dashboard view to prevent any overlap.

## [0.1.6]

### Added
- **Enhanced Debug Panel:** The debug panel now includes level-based filtering (Debug, Info, Warn, Error) and an option to save live logs directly to a file for easier troubleshooting.

### Changed
- **UI Improvement:** The documentation tabs in the Info Hub are now sticky, remaining visible while scrolling through long documents.

### Fixed
- The debug console now displays multiline messages and data objects fully by default, removing the need to hover to see all content.

## [0.1.5]

### Added
- **Deeper Version Control Integration:**
  - **Visual Git Status:** Repository cards now show detailed Git status, including how many commits the local branch is ahead or behind its remote, and a summary of modified, added, and deleted files (`+5 ~3 -1`).
  - **Branch Management:** A new "Branches" tab in the repository configuration view allows users to view, create, delete (local and remote), and merge Git branches.
  - **Branch Switching:** A dropdown menu has been added to repository cards to quickly view and switch between local and remote branches.
  - **Commit History Viewer:** A new "History" tab in the repository configuration view displays the 30 most recent commits. A new "History" button on the repository card provides quick access to this information in a modal.
- **Parallel Task Execution:** Tasks on different repositories can now run concurrently, each in its own process. The UI can handle multiple "processing" states at once.

### Fixed
- **Branch Switching Ambiguity:** The branch switcher now correctly handles repositories with multiple remotes and branches of the same name by displaying the full remote path (e.g., `origin/main`) and using a more precise `git checkout --track` command.

## [0.1.4]

### Changed
- **UI Compactness:** Significantly reduced padding, margins, and component sizes across the application to create a more compact, data-dense interface. This affects the Header, Dashboard, Repository Cards, Configuration Views, Log Panel, and Settings.
- Updated all documentation to reflect the latest version and features.

### Fixed
- **Dropdown Visibility:** The "Run Task" dropdown menu on repository cards now dynamically opens upwards when there isn't enough space below, preventing it from being clipped by the viewport.
- Resolved a TypeScript compilation error in `electron/main.ts` related to missing Node.js global type definitions without modifying the build environment.

## [0.1.3]

### Added
- **Light/Dark Mode:** Added a theme switcher in the Settings view to toggle between light and dark modes for the entire application.
- The user's theme preference is persisted across application restarts.
- A pre-load script prevents "flash of unstyled content" when opening the app in dark mode.

### Fixed
- Updated the UI of all components to be fully theme-aware.

### Removed
- Removed obsolete, unused components (`LogModal.tsx`, `SettingsModal.tsx`) from the codebase to improve maintainability.

## [0.1.2] 

### Added
- **Repository-Specific Tasks:** Tasks are now created and managed for each individual repository. The global task list has been removed.
- **Resizable Log Panel:** The log modal has been replaced with a resizable panel at the bottom of the application window for a more integrated experience.
- **Tab-based Navigation:** The main application layout is now controlled by tabs in the header, allowing users to switch between the Dashboard, a new dedicated Settings view, and the Info hub.

### Changed
- **Major UI Refactor:** The settings modal has been converted into a main application view.
- The "Edit Repository" modal now includes a "Tasks" tab for managing that repository's specific automation scripts.
- The application header now serves as the primary navigation control.

## [0.1.0]

### Added
- **Scriptable Tasks:** Major new feature allowing users to create, manage, and run custom multi-step automation scripts.
  - New "Tasks" tab in the Settings modal for creating/editing/deleting tasks.
  - Task steps include 'Git Pull', 'Install Dependencies', and 'Run Custom Command'.
  - Repository cards now feature a "Run Task" dropdown to execute any defined task.

### Changed
- Refactored automation engine to support dynamic task steps instead of a hard-coded workflow.
- Updated all documentation to reflect the new scriptable tasks feature.

## [0.0.1]

### Added

-   **Initial Release** of the Git Automation Dashboard.
-   Core functionality: Add, edit, delete, and run automation on Git repositories.
-   Real-time log viewer for automation tasks.
-   Global settings for package manager and build commands.
-   **Electron Packaging:** Application is fully packaged for Windows, macOS, and Linux using Electron and esbuild.
-   **Automatic Updates:** Integrated `electron-updater` to automatically check for and install new versions from GitHub Releases.
-   **In-App Documentation Viewer:** Added an "Info Hub" to view the README, functional manual, technical manual, and this changelog directly within the application.