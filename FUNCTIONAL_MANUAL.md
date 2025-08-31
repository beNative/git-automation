# Functional Manual

This manual provides a detailed walkthrough of all the features available in the Git Automation Dashboard.

## 1. Navigating the Application

The application is organized into three main views, which you can switch between using the icons in the top-right of the header:

-   **Dashboard (Home Icon):** The main screen where you can see and interact with all your repository cards.
-   **Settings (Cog Icon):** Where you can configure global application settings.
-   **Info (Information Icon):** An information hub containing this manual and other useful documentation.

## 2. The Main Dashboard

The dashboard is the central hub of the application. It displays all your configured repositories as individual cards.

### Repository Card

Each card gives you an at-a-glance overview of a repository:

-   **Name:** The custom name you assigned to the repository.
-   **Status:** The current state of the repository (e.g., `Idle`, `Syncing`, `Success`, `Failed`).
-   **Remote URL:** The Git or SVN remote URL, which is also a clickable link.
-   **Branch/VCS:** The Git branch being tracked, or an indicator for SVN repositories.
-   **Build Health:** The status of the last build (`Healthy`, `Failing`, `Unknown`).
-   **Last Updated:** The timestamp of the last time an automation was run.

### Card Actions

Each card has a set of action buttons:

-   **Run Task (Play Icon & Dropdown):** Executes a custom automation script on this repository.
    - Clicking the main button runs the first task configured for this repository.
    - Clicking the dropdown arrow allows you to select any of this repository's tasks to run. The dropdown menu is smart; it will open upwards if it detects it would be cut off at the bottom of the screen.
-   **View Logs (Document Icon):** Opens the resizable log panel at the bottom of the screen to show previous logs for this repository.
-   **Configure (Pencil Icon):** Opens the repository configuration modal.
-   **Delete (Trash Icon):** Permanently removes the repository from the dashboard after a confirmation prompt.

## 3. Managing Repositories and Tasks

Tasks (automation scripts) are configured on a per-repository basis.

### Adding a New Repository

1.  Click the **"New Repo"** button in the header.
2.  The "Add New Repository" view will appear.
3.  First, select the **Version Control System** (Git or SVN). The form will update to show relevant fields.
4.  Fill in the repository's details (Name, URL, Local Path, etc.). The **Local Path** must be the absolute path to the repository on your computer for real execution to work.
5.  Configure authentication if required (e.g., SSH key for Git, Username/Password for SVN).
6.  Click **"Save Repository"**.

### Editing a Repository and Managing Its Tasks

1.  On the desired repository card, click the **pencil icon**.
2.  The "Edit Repository" view will appear.
3.  To manage tasks, select a task from the list on the left or click **"New"** to create one.

#### Creating and Editing a Task
This is where you can create powerful, custom automation scripts for the specific repository you are editing.

1. Give your task a descriptive **name** (e.g., "Build & Deploy to Staging").
2. Click **"Add Step"** to build your workflow. The available steps will depend on whether the repository is Git or SVN.
3. **Configure each step:**
   -   **Git Pull:** Pulls the latest changes from the remote.
   -   **SVN Update:** Updates the working copy to the latest revision from the remote.
   -   **Install Dependencies:** Runs `npm install` or `yarn install`.
   -   **Run Custom Command:** Allows you to enter any shell command (e.g., `npm run test` or `msbuild MyProject.dproj`).
5. Continue adding, configuring, and re-ordering steps.
6. Click **"Save Repository"** on the main view to persist all your changes.

## 4. The Resizable Log Panel

When you run a task, a log panel will appear at the bottom of the screen.

-   **Resizing:** Click and drag the top border of the panel to resize it to your desired height.
-   **Content:** Logs are timestamped and color-coded for readability. The view auto-scrolls to the latest output.
-   **Closing:** Click the 'X' icon in the top-right of the panel to close it.

## 5. Global Settings View

Click the **cog icon** in the header to access global settings.

-   **Default Package Manager:** Choose between `npm` and `yarn`. The `Install Dependencies` task step will use this selection.
-   **Appearance:** Choose between a `Light` and `Dark` theme for the application. Your preference is saved automatically.
-   **Enable Notifications:** Toggle on/off the toast notifications that appear in the bottom-right corner.
-   **Enable Simulation Mode:** This is a critical safety feature.
    -   When **enabled (default)**, tasks are only simulated. The log panel will show the commands that *would* run, but no changes will be made to your local files.
    -   When **disabled**, the application will execute real `git`, `svn`, `npm`, and other shell commands in the specified local repository path. **Disable with caution.**