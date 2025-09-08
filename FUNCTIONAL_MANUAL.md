# Functional Manual

This manual provides a detailed walkthrough of all the features available in the Git Automation Dashboard.

## 1. Navigating the Application

The application is organized into three main views, which you can switch between using the icons in the top-right of the header. The header also features a dynamic title that changes color and text to reflect the current view.

-   **Dashboard (Home Icon):** The main screen where you can see and interact with all your repository cards.
-   **Settings (Cog Icon):** Where you can configure global application settings.
-   **Info (Information Icon):** An information hub containing this manual and other useful documentation.

## 2. The Main Dashboard

The dashboard is the central hub of the application. It displays all your configured repositories as individual cards, now organized into categories. You can run tasks on multiple repositories at the same time. Starting a long build on one project won't stop you from running a quick update on another.

The header also contains a **"Check Updates"** button to check all repositories for remote changes, and a button to **Expand/Collapse All** categories for quick layout management.

### Organizing with Categories

The dashboard is divided into collapsible sections called categories. This allows you to group related projects (e.g., by technology, client, or status).

-   **Creating Categories:** Click the "Add Category" button at the bottom of the dashboard to create a new section.
-   **Renaming & Deleting:** **Double-click** a category's name to edit it. Hover over the title to reveal a **trash icon** for deleting it.
-   **Color Customization:** Hover over a category's title and click the **paintbrush icon**. This opens a dedicated dialog where you can style the category. You can choose from a curated list of predefined themes for a polished look, or select custom colors for both the background and text using color pickers. A "Reset to Default" button is available to clear any custom styling.
-   **Collapsing Sections:** Click the chevron icon (▶) next to a category's title to hide or show the repositories within it. This state is saved automatically, so your layout will be preserved the next time you open the app.
-   **Assigning Repositories:** Simply drag a repository card and drop it onto a category header to assign it.
-   **Reordering:**
    -   **Repositories:** Drag and drop repository cards to reorder them within or between categories. When reordering, a blue indicator bar will show you exactly where the card will be dropped.
    -   **Categories:** Drag and drop category headers using the grip handle (⋮⋮) to reorder the sections themselves. In addition to dragging, you can use the **up and down arrow buttons** that appear when hovering over a category header to reorder categories one position at a time. This provides an easy and accessible alternative.
-   **Uncategorized Section:** Any repository not assigned to a category will automatically appear in a default "Uncategorized" section.

### Repository Card

Each card gives you an at-a-glance overview of a repository:

-   **Header:** Contains the repository name, its current status (e.g., `Idle`, `Success`), and a row of action icons:
    -   **Refresh:** Manually fetches the latest status from the remote. The icon spins when any operation is in progress.
    -   **Configure (pencil icon):** Opens the repository configuration view.
    -   **Delete (trash icon):** Removes the repository from the dashboard.
-   **Remote URL & Local Path:** The repository's remote URL and local path, each with a copy-to-clipboard button.
-   **Branch & Status Line:** A single line containing:
    -   **Branch Selector (Git only):** A dropdown to view and switch between branches.
    -   **Status Indicators:** At a glance, see if updates are available, how far ahead/behind the remote you are, and a summary of local file changes.
-   **Metadata:**
    -   **Build Health:** The status of the last build (`Healthy`, `Failing`, `Unknown`).
    -   **Last Updated:** The timestamp of the last automation, neatly aligned on the right.
    -   **Latest Release (Git only):** If a GitHub PAT is configured in settings, this shows the version tag of the latest GitHub release and its status (e.g., `Published`, `Draft`, `Pre-release`).

### Card Actions

Each card has a set of action buttons at the bottom:

-   **Task Buttons:** Any task marked with "Show on dashboard" will appear as its own button for one-click execution.
-   **More Tasks (Play Icon):** If there are more tasks available, this button opens a modal to select any of the repository's tasks to run.
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

1.  Click the **"New Repo"** button in the header.
2.  The "Add New Repository" view will appear.
3.  Fill in the repository's details (Name, URL, Local Path, VCS type, etc.). The **Local Path** must be the absolute path to the repository on your computer for real execution to work.
4.  Click **"Save Repository"**.

### Editing a Repository and Managing Its Features

1.  On the desired repository card, click the **pencil icon**.
2.  The "Edit Repository" view will appear. For Git repositories, this is a multi-tab interface.

#### General Settings
This is the main panel where you configure the name, path, URL, and launch configurations for the repository.

#### Tasks Tab
This is where you create powerful, custom automation scripts for the specific repository you are editing.
1. Give your task a descriptive **name** (e.g., "Build & Deploy to Staging").
2. Click **"Add Step"** to build your workflow. The available steps will depend on whether the repository is Git or SVN.
3. **Configure each step:**
   -   **Git Pull:** Pulls the latest changes from the remote.
   -   **SVN Update:** Updates the working copy to the latest revision from the remote.
   -   **Install Dependencies:** Runs `npm install` or `yarn install`.
   -   **Run Custom Command:** Allows you to enter any shell command (e.g., `npm run test` or `msbuild MyProject.dproj`).
4.  You can also define **task-specific variables** that can be substituted into your commands (e.g., `${VERSION}`).
5. Continue adding, configuring, and re-ordering steps.

#### History Tab (Git Only)
Displays a detailed list of commits, including the author, date, and full commit message. You can search through the history and load more commits as you scroll.

#### Branches Tab (Git Only)
Provides a full interface to manage your Git branches. You can:
- View all local and remote branches.
- Create a new branch.
- Delete local or remote branches.
- Merge another branch into your current one.

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

Click the **cog icon** in the header to access global settings.

-   **Appearance:**
    -   **Theme:** Choose between a `Light` and `Dark` theme.
    -   **Icon Set:** Select from multiple icon sets to customize the application's iconography.
    -   **GUI Scale:** Adjust the overall size of the application from 50% to 200% for better readability.
-   **Behavior:**
    -   **GitHub Personal Access Token:** A secure field to store your GitHub Personal Access Token (PAT). This token is required for features that interact with the GitHub API, such as fetching release information. A copy button is provided for convenience. A link is provided to help you create a token with the necessary permissions.
    -   **Open Web Links In:** Choose whether to open web links in your system's default browser, or force them to open in Chrome or Firefox.
    -   **Enable Notifications:** Toggle on/off the toast notifications.
    -   **Enable Simulation Mode:** This is a critical safety feature.
        -   When **enabled (default)**, tasks are only simulated. The log panel will show the commands that *would* run, but no changes will be made to your local files.
        -   When **disabled**, the application will execute real `git`, `svn`, `npm`, and other shell commands. **Disable with caution.**
    -   **Check for Pre-Releases:** If enabled, the auto-updater will include beta and other pre-release versions when checking for updates.
    -   **Enable Debug Logging:** Controls the verbose internal logging used by the Debug Panel. Disabling this may improve performance.
    -   **Executable Paths:** This new section allows you to specify the full file path to your `git` and `svn` executables. This is crucial if they are installed in a non-standard location and not available in your system's `PATH`.
        -   **Browse (`📁` icon):** Opens a system file picker to help you locate the executable file (e.g., `git.exe`).
        -   **Auto-detect (`✨` icon):** Attempts to automatically find the executable in your system's `PATH` and fills in the field for you.
        -   **Test (`🧪` icon):** Runs a version command on the specified path to verify that it is a valid and working executable, providing instant feedback.

**Note on Data Safety:** All settings and repository configurations are stored in a safe location on your computer. This means your data will be automatically preserved when the application updates to a new version.

### Advanced Configuration (JSON)

For advanced users, the settings view includes a **"JSON Config"** tab. This section provides direct access to the `settings.json` file that powers the application.

-   **Edit JSON:** You can directly modify the raw JSON configuration. Be cautious, as invalid JSON will prevent settings from being saved. After saving, the application will restart to apply the changes.
-   **Export Settings:** Click the "Export Settings" button to save your current `settings.json` file into a `.zip` archive. This is useful for creating backups.
-   **Import Settings:** Click the "Import Settings" button to load a configuration from a `.zip` archive. You will be prompted for confirmation before your current settings are overwritten. The application will restart automatically to apply the imported configuration.

## 6. The Status Bar

The status bar is located at the very bottom of the application window and provides at-a-glance information and quick access to tools.

-   **Repo & Task Count:** The left side displays the total number of repositories and the number of tasks currently running.
-   **Latest Log:** The center of the bar shows the most recent log message from any task.
-   **Simulation Mode Indicator:** Appears when Simulation Mode is active in the settings.
-   **Debug Panel:** Click the **"Debug"** button or press `Ctrl+D` (or `Cmd+D` on macOS) to toggle the debug panel.
-   **Command Palette Hint:** A reminder of the `Ctrl+K` (or `Cmd+K`) shortcut.
-   **App Version & About Dialog:** Displays the current application version. **Clicking the version number** will open the "About" dialog, which contains application credits and copyright information.
-   **Clock:** The current time.

## 7. The Debug Panel

For advanced troubleshooting, a debug panel is available. You can open it by clicking the **"Debug"** button in the status bar at the very bottom of the window, or by pressing `Ctrl+D` (or `Cmd+D` on macOS).

This panel shows internal application logs, which can be helpful for diagnosing unexpected behavior.

-   **Log Filtering:** The header of the panel has buttons to toggle the visibility of different log levels (`DEBUG`, `INFO`, `WARN`, `ERROR`). This allows you to focus only on the messages you're interested in.
-   **Save to File:** Clicking the "Save logs to file" icon will start writing all subsequent debug logs to a timestamped file on your computer. This is useful for capturing detailed information over a longer session to share in a bug report. Click the button again to stop logging to the file.
-   **Resizing:** Like the Task Log Panel, you can click and drag the top border to resize it.

## 8. Command Palette

For keyboard-centric users, the application features a powerful command palette.

-   **Activation:** Press `Ctrl+K` (or `Cmd+K` on macOS) from anywhere in the app to open it.
-   **Functionality:**
    -   Quickly search for and navigate to any view (Dashboard, Settings, Info).
    -   Find and run any task on any repository without using the mouse.
    -   Add a new repository.
-   **Navigation:** Use the **Up and Down arrow keys** to select a command and press **Enter** to execute it. The list will automatically scroll to keep your selection in view. Press **Escape** to close the palette.

## 9. Automatic Updates

The application is designed to keep itself up-to-date automatically.

-   **Checking:** On startup, the dashboard silently checks for a new version from the project's official GitHub repository.
-   **Downloading:** If a new version is found, a small notification will appear indicating that the download has started. The download happens in the background.
-   **Installation:** Once the download is complete, a prominent blue banner will appear at the top of the application window. To install the update, simply click the **"Restart & Install"** button. The application will close and restart as the new version.

## 10. Web Mode (Preview)
When the application is run in a standard web browser (outside of the Electron desktop app), it will load in a "simulation mode" with default settings. This is intended for preview and demonstration purposes, as features that rely on accessing your local file system (like running tasks or cloning repositories) are not available.