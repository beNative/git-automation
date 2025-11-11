# Version Log

All notable changes to this project will be documented in this file.

## [Unreleased]

- _No unreleased changes._

## [0.25.7]

### Changed
- **Documentation Audit Trail:** Reconfirmed that `README.md`, `TECHNICAL_MANUAL.md`, `FUNCTIONAL_MANUAL.md`, and `docs/keyboard-shortcut-editor.md` remain accurate for version `0.25.7`, recording the review outcome for this release.

### Fixed
- **Version Metadata:** Incremented the application version to `0.25.7` in `package.json` and `package-lock.json` to prepare this patch release.

## [0.25.6]

### Added
- **Task Cancellation Controls:** Introduced cancel buttons on running task cards and inside the task log panel, wiring the renderer, preload bridge, and Electron main process together so operators can gracefully abort automation that is hanging.

### Changed
- **Update Indicator UX:** Simplified the header's update indicator to an icon-only badge with an explanatory tooltip so the availability signal stays visible without crowding the navigation area.

### Fixed
- **Auto-Update Reliability:** Validated downloaded installers against the filenames published on GitHub, tightened the Windows artifact naming conventions (including the IA32 build), restricted releases to the expected setup executables, and expanded structured logging to make diagnosing updater issues easier.
- **Release Packaging Workflow:** Reworked the release GitHub Action to bundle the documentation directory required by the updater and to keep Windows asset filenames aligned with the publishing rules introduced in this release.

## [0.25.5]

### Changed
- **Documentation Audit Trail:** Reconfirmed that `README.md`, `TECHNICAL_MANUAL.md`, `FUNCTIONAL_MANUAL.md`, and `docs/keyboard-shortcut-editor.md` remain accurate for version `0.25.5`, recording the review outcome for this release.

### Fixed
- **Version Metadata:** Incremented the application version to `0.25.5` in `package.json` to prepare this patch release.

## [0.25.4]

### Changed
- **Documentation Audit Trail:** Reconfirmed that `README.md`, `TECHNICAL_MANUAL.md`, `FUNCTIONAL_MANUAL.md`, and `docs/keyboard-shortcut-editor.md` remain accurate for version `0.25.4`, recording the review outcome for this release.

### Fixed
- **Version Metadata:** Incremented the application version to `0.25.4` in `package.json` to prepare this patch release.

## [0.25.3]

### Changed
- **Documentation Audit Trail:** Reconfirmed that `README.md`, `TECHNICAL_MANUAL.md`, `FUNCTIONAL_MANUAL.md`, and `docs/keyboard-shortcut-editor.md` remain accurate for version `0.25.3`, recording the review outcome for this release.

### Fixed
- **Version Metadata:** Incremented the application version to `0.25.3` in `package.json` to prepare this patch release.

## [0.25.2]

### Changed
- **Documentation Audit Trail:** Reconfirmed that `README.md`, `TECHNICAL_MANUAL.md`, `FUNCTIONAL_MANUAL.md`, and `docs/keyboard-shortcut-editor.md` remain accurate for version `0.25.2`, recording the review outcome for this release.

### Fixed
- **Version Metadata:** Incremented the application version to `0.25.2` in `package.json` to prepare this patch release.

## [0.25.1]

### Changed
- **Documentation Audit Trail:** Reconfirmed that `README.md`, `TECHNICAL_MANUAL.md`, `FUNCTIONAL_MANUAL.md`, and `docs/keyboard-shortcut-editor.md` remain accurate for version `0.25.1`, recording the review outcome for this release.

### Fixed
- **Version Metadata:** Incremented the application version to `0.25.1` in `package.json` to prepare this patch release.

## [0.25.0]

### Changed
- **Documentation Audit Trail:** Added explicit documentation status sections to `README.md`, `TECHNICAL_MANUAL.md`, `FUNCTIONAL_MANUAL.md`, and `docs/keyboard-shortcut-editor.md` confirming that their guidance remains accurate for version `0.25.0`, giving maintainers a recorded review ahead of publishing.
- **Release Notes Prep:** Captured the outcomes of the latest release checklist review so the GitHub release body can reuse this entry verbatim.

### Fixed
- **Version Metadata:** Incremented the application version to `0.25.0` in `package.json` in preparation for this minor maintenance release.

## [0.24.7]

### Changed
- **Documentation Review:** Reconfirmed that `README.md`, `TECHNICAL_MANUAL.md`, and `FUNCTIONAL_MANUAL.md` accurately describe the
  current release workflow and UI, so no content edits were required before publishing this build.

### Fixed
- **Version Metadata:** Incremented the application version to `0.24.7` in `package.json` to prepare this bugfix release.

## [0.24.6]

### Changed
- **Documentation Checklist Clarity:** Clarified the release preparation steps in `README.md` and `TECHNICAL_MANUAL.md` so
  maintainers explicitly record the outcome of their documentation review (even when no edits are required) before publishing a
  release.

### Fixed
- **Version Metadata:** Incremented the application version to `0.24.6` in `package.json` ahead of publishing this patch build.

## [0.24.5]

### Changed
- **Release Process Guidance:** Clarified the README and Technical Manual checklists to explicitly record documentation reviews in the changelog and to require running automated tests before packaging so maintainers have an auditable release workflow.

### Fixed
- **Version Metadata:** Incremented the application version to `0.24.5` in `package.json` ahead of publishing this patch build.

## [0.24.4]

### Changed
- **Release Preparation Docs:** Clarified the README and Technical Manual checklists to explicitly set the Release Type selector
  during publishing and to reuse the freshly written changelog entry for the GitHub release body.

### Fixed
- **Version Metadata:** Incremented the application version to `0.24.4` in `package.json` ahead of publishing this patch build.

## [0.24.3]

### Added
- **Full Release Publishing:** The GitHub release form now includes a release type selector so you can promote a build to a fully published release without leaving the app's workflow.

### Changed
- **Release Documentation:** Updated the README and Technical Manual checklists to remind maintainers to set the release type appropriately when drafting GitHub releases and to reuse the latest changelog entry for the notes body.

### Fixed
- **Documentation Drift:** Re-reviewed the Markdown manuals to ensure they reflect the new release publishing controls before packaging this bugfix update.

## [0.24.2]

### Changed
- **Release Documentation:** Refined the release checklist in the README and Technical Manual to better guide minor and patch
  releases, emphasizing how to reuse changelog entries for GitHub publishing.

### Fixed
- **Documentation Drift:** Re-reviewed the Markdown manuals to ensure their wording matches the current release workflow before
  publishing this bugfix build.

## [0.24.1]

### Changed
- **Release Preparation:** Added a concise checklist in the README and expanded guidance in the Technical Manual so maintainers
  can confidently run through documentation reviews and release packaging steps for minor updates.
- **Documentation Review:** Refreshed the Markdown manuals to ensure their instructions and terminology match the current
  application experience prior to publishing this release.

## [0.24.0]

### Added
- **Frameless Window Design:** Implemented a modern, VSCode-inspired frameless window with a custom title bar for dragging and custom window controls (minimize, maximize, close).
- **Dedicated Menu Bar:** Created a new menu bar below the title bar to house primary application actions ("New Repo", "Check Updates") and view navigation, creating a cleaner and more organized layout.

### Changed
- **Documentation Overhaul:** Updated all documentation files (`README.md`, `FUNCTIONAL_MANUAL.md`, `TECHNICAL_MANUAL.md`) to accurately reflect the new frameless UI and all other recent feature updates and fixes.

### Fixed
- **Dropdown Clipping:** Resolved a critical UI bug where the branch switcher dropdown on repository cards would get cut off by application or card borders. The dropdown now uses a portal to render correctly above all other elements.
- **Editor Layout:** Corrected a flexbox layout issue where the "Edit Repository" view was not sized correctly within the main content area and failed to scroll internally as intended.
- **Startup Stability:** Fortified all calls to the backend Electron API with optional chaining to prevent crashes caused by race conditions during application startup.
- **Module Resolution:** Fixed an invalid import path alias that was causing a `TypeError` when loading the `TitleBar` component.

## [0.23.1]

### Changed
- Updated all documentation files (`README.md`, `FUNCTIONAL_MANUAL.md`, `TECHNICAL_MANUAL.md`, `CHANGELOG.md`) to reflect the current state of the application and prepare for a new release.

## [0.23.0]

### Fixed
- **Dropdown Clipping:** Resolved a critical UI bug where the branch switcher dropdown on repository cards would get cut off by application or card borders. The dropdown now uses a portal to render correctly above all other elements.

## [0.22.0]

### Added
- **Task Log Archiving:** The full console output for every task run is now automatically saved to a timestamped `.log` file in a configurable directory.
- **Logging Settings:** Added a new "Logging" section in the Settings > Behavior view to enable/disable task log saving and configure a custom log path.

### Changed
- **UI:** The light/dark mode theme toggle button in the header has been moved to the end of the navigation icons for better consistency.

### Fixed
- **Dark Mode Colors:** Fixed a bug where custom category colors for dark mode were not being applied correctly on the dashboard.

## [0.21.0]

### Changed
- **Task Step UI:** The 'Add Step' interface in the task editor has been redesigned to group available steps into logical categories, improving discoverability and usability.
- **Commit History UI:** The Commit History dialog no longer flickers or resizes while filtering. It now maintains a stable height, providing a smoother user experience.

## [0.20.0]

### Added
- **Dual-Theme Category Styling:** Categories can now be styled independently for light and dark modes.
- **Expanded Theme Library:** Added 10 new predefined color themes for styling categories.
- **Color Fine-Tuning:** Added 'Lighten' and 'Darken' buttons for easier custom color adjustments in the category style editor.

### Changed
- **Icon Set Standardization:** Removed the Heroicons and Phosphor icon sets to resolve rendering issues. The Feather icon set is now the default for a consistent and clean look.
- **Category Style UI:** Replaced the 'Customize Style' modal with a professionally styled, integrated popover for a seamless, live-preview editing experience.

### Fixed
- **CRITICAL:** Resolved multiple React 'white screen' errors (Error #310) related to conditional hook rendering in the Dashboard and Repository Configuration views, significantly improving application stability.

## [0.19.0]

### Added
- **JSON Settings Import:** Added support for importing settings directly from `.json` files, in addition to `.zip` archives.
- **Theme Toggle:** Added a theme toggle button in the header to quickly switch between light and dark modes.

### Changed
- **Release Management UI:** Improved the "Releases" tab in the repository configuration to provide better guidance on the PAT permissions required for viewing draft releases.

### Fixed
- **GitHub PAT Permissions:** Corrected the help text for the GitHub Personal Access Token to request the appropriate permissions (`Read & write` for `Contents`) needed to view draft releases.

### Removed
- **Status Bar Clock:** Removed the clock display from the status bar to simplify the user interface.

## [0.18.0]

### Added
- **Theme Toggle:** Added a theme toggle button in the header to quickly switch between light and dark modes.

### Removed
- **Status Bar Clock:** Removed the clock display from the status bar to simplify the user interface.

## [0.17.0]

### Fixed
- **CRITICAL:** A long-standing and complex bug in the drag-and-drop system for reordering repositories has been definitively fixed. Reordering repositories within and between categories is now stable and reliable.

### Changed
- **Code Cleanup:** Removed the experimental "Drag & Drop Strategy" setting and all associated debug code, simplifying the implementation and improving maintainability.

## [0.16.0]

### Added
- **Project Intelligence Engine:** The repository configuration screen now automatically detects the project type (e.g., Node.js, Python, Delphi, Lazarus) by analyzing its file structure. It then provides buttons to generate common, pre-configured tasks like "Install Dependencies" or "CI Checks & Build", specific to the detected technology.
- **Advanced Task Steps:** Added a rich set of new, specific task steps for different ecosystems, including:
  - **Node.js:** Install, Lint, Format, Type Check, Test, Build.
  - **Python:** Create Venv, Install Deps, Lint, Format, Type Check, Test, Build.
  - **Delphi:** Build, Boss Install, Package (Inno/NSIS), DUnitX Tests.
  - **Lazarus:** Build Project, Build Package, FPCUnit Tests.
- **Task Environment Variables:** Added a new section in the task editor to define shell environment variables that will be available to all steps within that task. This is separate from substitution variables.
- **SVN Commit History:** The Commit History viewer now fully supports Subversion repositories, allowing users to browse the revision history of their SVN projects.
- **Delphi Version Management:** Delphi-related build tasks now include an option to select a specific, installed Delphi compiler version, which correctly sets up the environment before executing MSBuild.

## [0.15.0]

### Added
- **Drag-and-Drop Debugging:** Added extensive, detailed logging to the drag-and-drop functionality for reordering repositories. This will help diagnose persistent issues if they occur in specific environments. Debug logs can be viewed in the Debug Console (`Ctrl/Cmd+D`).

### Changed
- **Drag-and-Drop Logic:** Further refined the state management logic for drag-and-drop to improve robustness.

## [0.14.0]

### Fixed
- **Repository Drag-and-Drop:** Fixed a long-standing bug that prevented repository cards from being correctly reordered via drag-and-drop. The state management has been refactored to be more robust and atomic.

### Added
- **Reordering Buttons:** Added Up and Down arrow buttons to repository cards, appearing on hover. This provides an alternative, accessible way to reorder them within their categories.

## [0.13.0]

### Added
- **GUI Scaling:** Added a new "GUI Scale" slider in the Settings > Appearance view to adjust the size of the entire user interface from 50% to 200%.
- **Copy PAT Button:** Added a copy-to-clipboard button next to the GitHub Personal Access Token field in Settings.

### Fixed
- **Repository Drag-and-Drop:** Fixed a critical state management bug that prevented repository cards from being correctly placed after being dragged and dropped.
- **Tooltip System:** Completely re-engineered the tooltip system to be more intelligent. Tooltips now dynamically reposition themselves to avoid being clipped by the edges of the application window and no longer flicker on hover.
- **External Links:** Links in the Release Manager and documentation viewer now correctly open in the user's external browser.
- **UI Flickering:** The Commit History dialog no longer resizes itself when searching, which fixes a flickering issue.
- **UI Polish:** The "About" dialog title is now simply "About", and the redundant "Settings" title has been removed from the settings sidebar for a cleaner look.

### Changed
- **Documentation:** Updated all documentation to reflect the new features and to remove any outdated mentions of commit history limits.

## [0.12.0]

### Fixed
- **Category Drag-and-Drop:** Fixed a critical event propagation bug that prevented categories from being reordered correctly via drag-and-drop.

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
  - Improved the repository card layout for better readability and quicker access to actions. Moved status indicators, action buttons, and a manual refresh button.
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
  - **Commit History Viewer:** A new "History" tab in the repository configuration view displays recent commits. A new "History" button on the repository card provides quick access to this information in a modal.
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