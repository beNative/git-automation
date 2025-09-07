# Functional Manual

This manual provides a detailed walkthrough of all the features available in the Git Automation Dashboard.

## 1. Navigating the Application

The application is organized into three main views, which you can switch between using the icons in the top-right of the header:

-   **Dashboard (Home Icon):** The main screen where you can see and interact with all your repository cards.
-   **Settings (Cog Icon):** Where you can configure global application settings.
-   **Info (Information Icon):** An information hub containing this manual and other useful documentation.

## 2. The Main Dashboard

The dashboard is the central hub of the application. It displays all your configured repositories as individual cards. You can run tasks on multiple repositories at the same time. Starting a long build on one project won't stop you from running a quick update on another.

The header also contains a **"Check Updates"** button. Clicking this will check all of your repositories for new changes on their remotes.

### Repository Card

Each card gives you an at-a-glance overview of a repository:

-   **Name:** The custom name you assigned to the repository.
-   **Status:** The current state of the repository (e.g., `Idle`, `Syncing`, `Success`, `Failed`).
-   **Remote URL & Local Path:** The Git/SVN remote URL and the local path on your machine. Each has a **copy icon** next to it for quickly copying the path to your clipboard.
-   **Branch/VCS:** For Git, this is a dropdown menu to view and switch between all local and remote branches. For SVN, it just indicates the VCS type.
-   **Visual Status:** For Git repos, shows if you are ahead/behind the remote and a summary of changed files (e.g., `+1 ~2` for 1 added, 2 modified).
-   **"Updates Available" Indicator:** Appears below the branch/VCS info if there are changes on the remote that you can pull or update.
-   **Build Health:** The status of the last build (`Healthy`, `Failing`, `Unknown`).
-   **Last Updated:** The timestamp of the last time an automation was run.

### Card Actions

Each card has a set of action buttons at the bottom:

-   **Task Buttons:** Any task marked with "Show on dashboard" will appear as its own button for one-click execution.
-   **More Tasks (Play Icon):** If there are more tasks available, this button opens a modal to select any of the repository's tasks to run.
-   **Open in Terminal (Terminal Icon):** Opens the repository's local folder in your system's default terminal.
-   **View Logs (Document Icon):** Opens the resizable log panel to show previous logs for this repository.
-   **View History (Clock Icon):** Opens a modal displaying the 30 most recent commits for this repository.
-   **Configure (Pencil Icon):** Opens the repository configuration view.
-   **Delete (Trash Icon):** Permanently removes the repository from the dashboard after a confirmation prompt.

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
Displays a detailed list of the 30 most recent commits, including the author, date, and full commit message.

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

-   **Appearance:** Choose between a `Light` and `Dark` theme, and select from multiple icon sets.
-   **Behavior:**
    -   **Default Package Manager:** Choose between `npm` and `yarn`. The `Install Dependencies` task step will use this selection.
    -   **Enable Notifications:** Toggle on/off the toast notifications.
    -   **Enable Simulation Mode:** This is a critical safety feature.
        -   When **enabled (default)**, tasks are only simulated. The log panel will show the commands that *would* run, but no changes will be made to your local files.
        -   When **disabled**, the application will execute real `git`, `svn`, `npm`, and other shell commands. **Disable with caution.**

## 6. The Debug Panel

For advanced troubleshooting, a debug panel is available. You can open it by clicking the **"Debug"** button in the status bar at the very bottom of the window, or by pressing `Ctrl+D` (or `Cmd+D` on macOS).

This panel shows internal application logs, which can be helpful for diagnosing unexpected behavior.

-   **Log Filtering:** The header of the panel has buttons to toggle the visibility of different log levels (`DEBUG`, `INFO`, `WARN`, `ERROR`). This allows you to focus only on the messages you're interested in.
-   **Save to File:** Clicking the "Save logs to file" icon will start writing all subsequent debug logs to a timestamped file on your computer. This is useful for capturing detailed information over a longer session to share in a bug report. Click the button again to stop logging to the file.
-   **Resizing:** Like the Task Log Panel, you can click and drag the top border to resize it.

## 7. Automatic Updates

The application is designed to keep itself up-to-date automatically.

-   **Checking:** On startup, the dashboard silently checks for a new version from the project's official GitHub repository.
-   **Downloading:** If a new version is found, a small notification will appear indicating that the download has started. The download happens in the background.
-   **Installation:** Once the download is complete, a prominent blue banner will appear at the top of the application window. To install the update, simply click the **"Restart & Install"** button. The application will close and restart as the new version.
