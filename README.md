# Welcome to the Git Automation Dashboard

This application provides a simple, powerful dashboard to manage and automate the workflow for a set of Git and SVN repositories. It is designed for developers who need to regularly update, install dependencies, and run build scripts across multiple projects.

## Core Features

-   **Custom Frameless Window:** A modern, VSCode-inspired interface with a custom title bar that combines window controls, navigation, and quick actions in a compact layout.
-   **Centralized Dashboard:** View the status, branch, and build health of all your repositories in one place.
-   **Customizable Dashboard Categories:** Organize your repositories into collapsible sections with **dual-theme (light/dark) color styling**, a library of predefined themes, full drag-and-drop support (for both repositories and categories), and alternative up/down reorder buttons.
-   **Multi-VCS Support:** Manage both Git and Subversion (SVN) repositories seamlessly.
-   **Repository-Specific Tasks:** Create custom, multi-step automation scripts (e.g., pull/update, install, build) for each repository.
-   **Project Intelligence:** Automatically detects project types (Node.js, Python, Go, Rust, Java/Maven, .NET, Delphi, Lazarus, Docker) and provides one-click buttons to generate common, pre-configured tasks.
-   **Advanced Task Steps:** A rich library of specific, pre-built steps for different ecosystems—including Go, Rust, Java/Maven, and .NET—**now organized into logical categories in the UI for easy discovery**, simplifies creating complex workflows.
-   **Task Environment Variables:** Define shell environment variables that are available to all command steps within a task.
-   **Quick Actions:** Manually refresh repository state, copy URLs/paths with a single click, access all common actions via a right-click context menu, and reorder repositories with up/down buttons.
-   **Powerful Command Palette:** Quickly access any action, task, or repository using the keyboard shortcut (`Ctrl/Cmd+K`) to open a powerful search-driven command modal.
-   **Parallel Execution:** Run tasks on multiple repositories at the same time without waiting.
-   **One-Click Update Check:** A "Check Updates" button fetches the latest information from all remotes, showing an "Updates Available" indicator on repositories that are behind.
-   **Detailed VCS Status:** See ahead/behind status (Git) and a summary of file changes directly on the dashboard.
-   **Branch Management (Git):** Quickly switch branches from the dashboard, or view, create, delete, and merge branches in the configuration view.
-   **GitHub Release Management (Git):** See the latest release on the dashboard, and view, create, edit, and manage all your project's releases directly from the configuration view.
-   **Commit History:** View the commit history for any Git or SVN repository, with **a stable, non-flickering UI**, search, and load-on-demand.
-   **Tabbed & Integrated Log Panel:** Monitor the output of every command in a detailed, resizable, and tabbed log panel that integrates smoothly into the main view.
-   **Automatic Task Log Archiving:** The full console output for every task run is automatically saved to a timestamped log file in a configurable directory for historical reference.
-   **Advanced Debugging:** A powerful debug console with log filtering and a save-to-file feature (now including logs from the main process) for in-depth troubleshooting.
-   **Reliable Auto-Updates:** Get notified with a clear banner when a new version is ready and install it with a single click.
-   **Easy Configuration:** Add new repositories and configure them through a simple, unified form.
-   **Persistent UI State:** The application remembers your dashboard layout, including the collapsed state of categories, between sessions.
-   **Persistent & Safe Configuration:** All your settings and repository configurations are stored safely in a persistent location, ensuring they are never lost during application updates.
-   **Settings Import/Export:** Easily back up, restore, or share your complete application configuration using `.zip` or `.json` files.
-   **Robust Executable Handling:** Manually configure paths to your Git/SVN executables, with auto-detect and testing, ensuring the app works in any environment.
-   **Global Settings:** Customize the application theme (with a quick-toggle button in the header), icon set (**Feather icons by default**), notifications, and behavior like enabling pre-release updates or choosing your preferred web browser.
-   **GUI Scaling:** Adjust the overall size of the application's interface for better readability on any screen.

## Quick Start

1.  **Add a Repository:**
    -   Click the **"New Repo"** button in the title bar.
    -   Select the Version Control System (Git or SVN).
    -   Fill in the required details on the "General" tab.
    -   Click **"Save Repository"**.

2.  **Create a Task:**
    -   On the dashboard, click the **pencil icon** on your repository's card to open the configuration modal.
    -   Go to the **"Tasks"** tab.
    -   The application will try to detect your project type and offer to generate tasks for you. Click one of these buttons, or create one manually.
    -   To create one manually, click **"New Task"**, give it a name (e.g., "Build for Windows"), and add the steps you need (e.g., Git Pull/SVN Update, a `NODE_INSTALL_DEPS` step, or Run Command: `npm run build:win`).
    -   Save the task, then save the repository.

3.  **Run a Task:**
    -   Find your repository card on the dashboard.
    -   Click a task button or use the task selection menu to run your task.
    -   The resizable log panel will automatically appear at the bottom, showing the progress of your script.

## Release Preparation Checklist

Follow this checklist when preparing a new minor or patch release:

1.  **Bump the Version:** Update the `version` field in `package.json` and ensure any user-facing references (README, manuals,
    in-app messaging) match the new number.
2.  **Review Documentation:** Re-read the README, Functional Manual, Technical Manual, and CHANGELOG to confirm terminology and
    screenshots reflect the current UI and workflow. Capture any documentation-only tweaks in the upcoming changelog entry, and
    if everything is still accurate, explicitly state that outcome so the review itself is recorded.
3.  **Update Release Notes:** Add a new section to `CHANGELOG.md` summarizing the changes included in the release, including
    any documentation adjustments or reminders for maintainers. Plan to reuse this text verbatim in the GitHub release body.
4.  **Run Automated Checks:** Execute `npm test` (or the appropriate suite documented in the Technical Manual) and confirm it completes successfully before packaging.
5.  **Build Installers:** Run `npm run pack` to generate platform installers and smoke-test the output locally.
6.  **Publish on GitHub:** Draft a new GitHub release, attach the generated artifacts, verify the tag/version details, and set the
    **Release Type** selector to the intended state (Full Release for GA builds, Draft or Pre-release as needed). Paste the freshly
    written changelog entry into the release body so the GitHub notes exactly match the repository history, then publish.

### Documentation Status for 0.25.1

- Re-ran the documentation audit across `README.md`, `FUNCTIONAL_MANUAL.md`, `TECHNICAL_MANUAL.md`, and `docs/keyboard-shortcut-editor.md` for this release.
  No workflow or UI updates were required; this note records that the review confirmed the guidance remains accurate for version
  `0.25.1`.

---
_For developer information, including how to run this project in development mode or build it from source, please see the **Technical Manual** tab in the Info Hub._
