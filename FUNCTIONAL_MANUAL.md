# Functional Manual

This manual provides a detailed walkthrough of all the features available in the Git Automation Dashboard.

## 1. Navigating the Application

The application features a modern, frameless window design with a single, information-rich title bar at the top.

-   **Title Bar:**
    -   Displays the application title on the left.
    -   Hosts the primary dashboard actions ("New Repo", "Check Updates", "Expand/Collapse All") when the dashboard is active, centered for easy access.
    -   Provides quick navigation icons for the main views and a light/dark theme toggle on the right.
    -   Keeps a dedicated **draggable region** outside of the interactive controls so you can reposition the window.
    -   Contains custom **window controls** to minimize, maximize/restore, and close the application.

The three main application views are:
-   **Dashboard (Home Icon):** The main screen where you can see and interact with all your repository cards.
-   **Settings (Cog Icon):** Where you can configure global application settings.
-   **Info (Information Icon):** An information hub containing this manual and other useful documentation.

A powerful **Command Palette** can be opened at any time with the `Ctrl/Cmd+K` shortcut. This allows you to quickly search for and execute almost any action, such as running a task or switching views.

## 2. The Main Dashboard

The dashboard is the central hub of the application. It displays all your configured repositories as individual cards, now organized into categories. You can run tasks on multiple repositories at the same time. Starting a long build on one project won't stop you from running a quick update on another.

The title bar contains a **"Check Updates"** button to check all repositories for remote changes, and a button to **Expand/Collapse All** categories for quick layout management.

### Organizing with Categories

The dashboard is divided into collapsible sections called categories. This allows you to group related projects (e.g., by technology, client, or status).

-   **Creating Categories:** Click the "Add Category" button at the bottom of the dashboard to create a new section.
-   **Renaming & Deleting:** **Double-click** a category's name to edit it. Hover over the title to reveal a **trash icon** for deleting it.
-   **Color Customization:** Hover over a category's title and click the **paintbrush icon**. This opens an integrated styling popover directly below the header. Here you can:
    -   **Choose a Predefined Theme:** Select from an expanded library of professionally designed color schemes.
    -   **Set Custom Colors:** Use the tabbed interface to set distinct background and text colors for both **Light Mode** and **Dark Mode**.
    -   **Fine-Tune Colors:** Use the "Lighten" and "Darken" buttons next to each color picker to easily adjust your custom colors.
    -   **Live Preview:** All your changes are reflected on the category header in real-time.
    -   A "Reset to Default" button is available to clear any custom styling.
-   **Collapsing Sections:** Click the chevron icon (▶) next to a category's title to hide or show the repositories within it. This state is saved automatically, so your layout will be preserved the next time you open the app.
-   **Assigning Repositories:** Simply drag a repository card and drop it onto a category header to assign it.
-   **Reordering:**
    -   **Repositories:** You can reorder repositories in two ways:
        1.  **Drag-and-Drop:** Drag and drop repository cards to reorder them within or between categories. A blue indicator bar will show you exactly where the card will be dropped.
        2.  **Buttons:** Hover over a repository card to reveal **up and down arrow buttons** in its header. Use these for a simple, click-based way to reorder cards within their list.
    -   **Categories:** Drag and drop category headers using the grip handle (⋮⋮) to reorder the sections themselves. In addition to dragging, you can use the **up and down arrow buttons** that appear when hovering over a category header to reorder categories one position at a time. This provides an easy and accessible alternative.
-   **Uncategorized Section:** Any repository not assigned to a category will automatically appear in a default "Uncategorized" section.

### Repository Card

Each card gives you an at-a-glance overview of a repository:

-   **Header:** Contains the repository name, its current status (e.g., `Idle`, `Success`), and a row of action icons:
    -   **Reorder Arrows:** (On hover) Move the card up or down in its current list.
    -   **Refresh:** Manually fetches the latest status from the remote. The icon spins when any operation is in progress.
    -   **Configure (pencil icon):** Opens the repository configuration view.
    -   **Delete (trash icon):** Removes the repository from the dashboard.
-   **Remote URL & Local Path:** The repository's remote URL and local path, each with a copy-to-clipboard button.
-   **Branch & Status Line:** A single line containing:
    -   **Branch Selector:** A dropdown to view and switch between branches for both Git and SVN repositories. SVN users can move between the trunk and feature branches just like Git users, while destructive actions remain Git-specific.
    -   **Status Indicators:** At a glance, see if updates are available, how far ahead/behind the remote you are, and a summary of local file changes.
-   **Metadata:**
    -   **Build Health:** The status of the last build (`Healthy`, `Failing`, `Unknown`).
    -   **Last Updated:** The timestamp of the last automation, neatly aligned on the right.
    -   **Latest Release (Git only):** If a GitHub PAT is configured in settings, this shows the version tag of the latest GitHub release and its status (e.g., `Published`, `Draft`, `Pre-release`).

### Card Actions

Each card has a set of action buttons at the bottom:

-   **Setup & Clone / Clone Repo:** When the local working copy is missing, the card automatically surfaces guided buttons. **Setup & Clone** opens a folder picker so you can select where to place the checkout, then immediately kicks off the clone/checkout. If a path is already stored but empty, a single **Clone Repo** button runs the clone directly. Progress for both flows streams into the log panel.
-   **Task Buttons:** Any task marked with "Show on dashboard" will appear as its own button for one-click execution.
-   **Pinned Launch Buttons:** Launch configurations flagged to "Show on dashboard" appear alongside task buttons with a lightning icon for one-click app launches.
-   **More Tasks (Play Icon):** If there are more tasks available, this button opens a modal to select any of the repository's tasks to run.
-   **Launch Menu (Lightning Icon):** Opens an overflow menu listing unpinned launch configurations and auto-detected executables so you can start tools without leaving the dashboard.
-   **Open in Terminal (Terminal Icon):** Opens the repository's local folder in your system's default terminal.
-   **View Logs (Document Icon):** Opens the resizable log panel to show previous logs for this repository.
-   **View History (Clock Icon):** Opens a modal displaying the commit history for this repository.

### Right-Click Context Menu

For faster access, you can **right-click** on any repository card to bring up a context menu. This menu provides quick access to all the main actions without needing to move your mouse to the bottom of the card, including:
- Checking for updates.
- Running specific tasks (from a submenu).
- Launching configured applications (from a submenu).
- Opening the local folder or terminal.
- Viewing logs and history.
- Configuring or deleting the repository.

## 3. Managing Repositories and Tasks

Tasks (automation scripts) are configured on a per-repository basis.

### Adding a New Repository

1.  Click the **"New Repo"** button in the title bar.
2.  The "Add New Repository" view will appear.
3.  Fill in the repository's details (Name, URL, Local Path, VCS type, etc.). The **Local Path** must be the absolute path to the repository on your computer for real execution to work.
4.  Click **"Save Repository"**.

#### First-Time Checkout Flow

If the saved repository path does not contain a working copy yet, the dashboard highlights the repository card with dedicated **Setup & Clone** controls. Use these buttons to pick a destination folder and trigger the clone (Git) or checkout (SVN) without leaving the app. The application streams the progress into the log panel so you can watch the operation complete before running any tasks.

### Editing a Repository and Managing Its Features

1.  On the desired repository card, click the **pencil icon**.
2.  The "Edit Repository" view will appear. For Git repositories, this is a multi-tab interface.

#### General Settings
This is the main panel where you configure the name, path, URL, and launch configurations for the repository. In addition to the basic metadata, this tab lets you:

-   **Manage Launch Configurations:** Create launchers that either run a shell command or prompt for an executable to open. You can optionally capture command suggestions (pulled from the repo's detected project type), choose a working directory, and mark the launcher to **Show on dashboard** so it renders as a red lightning button on the repository card. Unpinned launchers remain available through the Launch menu on the card header and the card's right-click menu.
-   **Control Dirty Repository Overrides:** The **Ignore Dirty Repository** checkbox bypasses the safety modal described later in this manual. Leave it unchecked to keep the protective prompts.

#### Tasks Tab
This is where you create powerful, custom automation scripts for the specific repository you are editing.
1.  **Project Intelligence:** Based on the repository's local path, the application will analyze its contents to detect the project type (e.g., Node.js, Python, Go, Rust, Java/Maven, .NET, Delphi, Docker, Lazarus). If a known type is found, a colored box will appear with buttons to automatically generate common tasks for that ecosystem—such as Go mod tidy/CI pipelines, Cargo formatting and linting flows, Maven clean/test/package lifecycles, or .NET restore/build/test sequences—ready to drop into your task list.
2.  **Manual Task Creation:**
    -   Give your task a descriptive **name** (e.g., "Build & Deploy to Staging").
    -   Click **"Add Step"** to build your workflow. A new panel will appear, grouping available steps into logical categories like 'Git', 'Node.js', and 'Python', making it easy to find the action you need. The available steps will depend on the repository's VCS type and its detected project type.
    -   Configure each step as needed.
3.  **Variables:**
    -   **Task Variables:** These are for simple text substitution. Define a `KEY` and `VALUE`, then use `${KEY}` in a `Run Command` step's command field.
    -   **Environment Variables:** These are set as actual environment variables in the shell before commands are run. They can be used by scripts and build tools (e.g., `process.env.MY_VAR` in Node.js).
4.  Continue adding, configuring, and re-ordering steps.

#### Dirty Repository Protection

Whenever you launch a task, the app checks the working tree for uncommitted changes. If it finds any, a **Dirty Repository** modal interrupts the run and lists the modified and untracked files. From this dialog you can:

-   **Stash & Continue:** Save the changes to a temporary stash before running the task.
-   **Ignore Selected & Push:** Choose specific untracked files to ignore, then continue. Behind the scenes this uses the shared `ignoreFilesAndPush` IPC handler so the same safety logic applies everywhere.
-   **Pull Anyway:** Force the task to continue without stashing.
-   **Cancel Task:** Abort the run and return to the dashboard.

If you absolutely trust a repository's automation, enable **Ignore Dirty Repository** on the General tab to skip the modal for that repo only.

#### History Tab (Git & SVN)
Displays a detailed list of commits or revisions, including the author, date, and full message. You can search through the history and load more commits as you scroll.

#### Branches Tab
Provides a unified interface to inspect branches for both Git and SVN repositories. The dropdown is backed by the shared `list-branches` IPC handler, so Git and SVN cards use the same data source on the dashboard.

-   **Git Repositories:** View all local and remote branches, create or delete branches, and merge another branch into your current one.
-   **SVN Repositories:** Browse available branches (including trunk) and switch the working copy. Destructive operations such as creating or deleting branches remain Git-only.

#### Releases Tab (Git Only)
This tab provides a complete interface for managing your project's GitHub releases. It requires a GitHub Personal Access Token to be configured in the global settings. To view and manage draft releases, the token must have repository permissions for **"Contents: Read & write"**.
- **View Releases:** See a list of all existing releases, each with its name, tag, creation date, and status badges for "Draft" and "Pre-release". The release notes body is also displayed and supports Markdown rendering.
- **Create Release:** Click the "Create New Release" button to open a form. You can specify a tag name, title, and release notes (in Markdown), and use the **Release Type** selector to publish immediately as a full release, keep it as a draft, or mark it as a pre-release.
- **Edit Release:** Click the "Edit" button on any release to modify its details.
- **Publish/Unpublish:** Quickly toggle a release's draft status.
- **Toggle Pre-release:** Change a release from a stable to a pre-release and vice-versa.
- **Delete Release:** Permanently delete a release from GitHub after a confirmation prompt.

After making any changes, click **"Save Repository"** on the main view to persist them.

## 4. The Task Log Panel

When you run a task or choose to view logs, a panel will appear at the bottom of the screen. This panel is fully integrated into the application's layout.

-   **Integrated View:** The log panel docks at the bottom of the window, resizing the dashboard above it so nothing is ever hidden.
-   **Tabbed Interface:** If you run tasks on multiple repositories at the same time, each task will open in its own tab. You can easily switch between logs by clicking the tabs.
-   **Tab Management:** Each tab has its own close button. When the last tab is closed, the entire panel will hide itself.
-   **Resizing:** Click and drag the top border of the panel to resize it to your desired height.
-   **Content:** Logs are timestamped and color-coded for readability. The view auto-scrolls to the latest output.
-   **Closing:** You can close the entire panel at once by clicking the 'X' icon in the top-right of the panel.

## 5. Global Settings View

Click the **cog icon** in the menu bar to access global settings.

-   **Appearance:**
    -   **Theme:** Choose between a `Light` and `Dark` theme. A quick-toggle button is also available in the header for convenience.
    -   **Icon Set:** Select from the available icon sets to customize the application's iconography. Feather is the default for a clean and consistent look.
    -   **GUI Scale:** Adjust the overall size of the application from 50% to 200% for better readability.
-   **Behavior:**
    -   **GitHub Personal Access Token:** A secure field to store your GitHub Personal Access Token (PAT). This token is required for features that interact with the GitHub API, such as fetching release information. A copy button is provided for convenience. A link is provided to help you create a token with the necessary permissions. For full functionality, including managing draft releases, create a fine-grained token with "Read & write" access to repository "Contents".
    -   **Open Web Links In:** Choose whether to open web links in your system's default browser, or force them to open in Chrome or Firefox.
    -   **Enable Notifications:** Toggle on/off the toast notifications.
    -   **Enable Simulation Mode:** This is a critical safety feature.
        -   When **enabled (default)**, tasks are only simulated. The log panel will show the commands that *would* run, but no changes will be made to your local files.
        -   When **disabled**, the application will execute real `git`, `svn`, `npm`, and other shell commands. **Disable with caution.**
    -   **Check for Pre-Releases:** If enabled, the auto-updater will include beta and other pre-release versions when checking for updates.
    -   **Logging:**
        -   **Save Task Output Logs:** When enabled, the full console output of every executed task will be saved to a `.log` file on your computer.
        -   **Task Log Path:** Specify a custom directory where task logs should be saved. Leave it blank to use the default location inside the application's user data folder.
    -   **Enable Debug Logging:** Controls the verbose internal logging used by the Debug Panel. Disabling this may improve performance.
    -   **Executable Paths:** This new section allows you to specify the full file path to your `git` and `svn` executables. This is crucial if they are installed in a non-standard location and not available in your system's `PATH`.
        -   **Browse (`📁` icon):** Opens a system file picker to help you locate the executable file (e.g., `git.exe`).
        -   **Auto-detect (`✨` icon):** Attempts to automatically find the executable in your system's `PATH` and fills in the field for you.
        -   **Test (`🧪` icon):** Runs a version command on the specified path to verify that it is a valid and working executable, providing instant feedback.

**Note on Data Safety:** All settings and repository configurations are stored in a safe location on your computer. This means your data will be automatically preserved when the application updates to a new version.

### Advanced Configuration (JSON)

For advanced users, the settings view includes a **"JSON Config"** tab. This section provides direct access to the `settings.json` file that powers the application.

-   **Edit JSON:** You can directly modify the raw JSON configuration. Be cautious, as invalid JSON will prevent settings from being saved. After saving, the application will restart to apply the changes.
-   **Export Settings:** Click the "Export Settings" button to save your current configuration into a compressed `.zip` archive. This is useful for creating backups or sharing your setup.
-   **Import Settings:** Click the "Import Settings" button. You can select a `.zip` archive (created via the export feature) or a raw `.json` file to restore a configuration. This will overwrite your current settings and restart the application.

### Documentation Status for 0.25.5

- Conducted a full functional review of the UI flows described in this manual, the README, the Technical Manual, and the keyboard shortcut specification. Everything continues to match the live application for version `0.25.5`. No functional wording changes were needed beyond documenting this verification.
