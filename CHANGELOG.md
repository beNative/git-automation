# Version Log

All notable changes to this project will be documented in this file.

## [0.11.0]

### Fixed
- **Category Drag-and-Drop:** Fixed a critical bug that was preventing dashboard categories from being reordered via drag-and-drop.

### Added
- **Category Reorder Buttons:** Added Up and Down arrow buttons to each category header, providing an alternative, accessible way to reorder categories.

## [0.10.0]

### Added
- **Executable Path Configuration:** In Settings > Behavior, you can now specify the exact path to the `git` and `svn` executables. This makes the application more robust for users who do not have these tools in their system's default `PATH`.
- **Executable Path Helpers:** The new configuration section includes buttons to:
    - **Auto-detect:** Automatically find the executable if it's in the `PATH`.
    - **Browse:** Open a file picker to locate the executable manually.
    - **Test:** Verify that the specified path is valid and works correctly.

## [0.9.1]

### Fixed
- Fixed an issue where GitHub release information was not consistently shown for all repositories. The application now correctly fetches the latest available release, including pre-releases.

## [0.9.0]

### Added
- **GitHub Release Integration (Phase 1):** The dashboard now displays the latest GitHub release information directly on each repository card, including the version tag and status badges for "Published," "Pre-release," or "Draft." This requires a GitHub Personal Access Token to be configured in the settings.

## [0.8.1]

### Fixed
- **CRITICAL:** Fixed a crash (React error #310) that occurred when opening the "Customize Color" modal for a category. This was caused by a violation of the Rules of Hooks.
- Fixed several TypeScript type errors related to event handlers in the Dashboard component, improving code stability.

## [0.8.0]

### Fixed
- **CRITICAL:** Fixed a persistent and critical bug that prevented drag-and-drop reordering of repository cards within the same category and in the "Uncategorized" section.
- Fixed an issue where the application would show a blank "Loading settings..." screen when run in a web browser. It now loads instantly with default settings.

### Changed
- **Category Customization:** Replaced the simple color palette popover with a full-featured modal. Users can now choose from curated themes or select custom background and text colors for each category.
- **UI Consistency:** Updated all tooltips on category headers to use the same styled component as the rest of the application for a more polished look.

## [0.7.0]

### Changed
- **UI/UX Refinements:**
  - Improved the repository card layout for better readability and quicker access to actions. Moved status indicators, action buttons, and added a manual refresh button.
  - Enhanced the Command Palette with a larger interface and full keyboard navigation support.
  - Streamlined category management by enabling double-click to rename and replacing the color picker with a curated set of predefined color themes.

## [0.6.0]

### Added
- **Category Color Customization:** Added the ability to configure custom font and background colors for each dashboard category via a new color picker popover.

## [0.5.0]

### Added
- A new button in the header to expand or collapse all dashboard categories at once.

### Changed
- The collapsed/expanded state of dashboard categories is now saved and persists between application restarts.
- Improved the visual feedback for dragging and dropping repository cards. A clear indicator bar now shows exactly where a card will be placed.
- Replaced the static header title with a dynamic, color-coded title that changes based on the active view (Dashboard, Settings, Info).

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