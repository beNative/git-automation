# Version Log

All notable changes to this project will be documented in this file.

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
