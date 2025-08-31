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
-   **Remote URL:** The Git remote URL, which is also a clickable link.
-   **Branch:** The Git branch being tracked.
-   **Build Health:** The status of the last build (`Healthy`, `Failing`, `Unknown`).
-   **Last Updated:** The timestamp of the last time an automation was run.

### Card Actions

Each card has a set of action buttons:

-   **Run Task (Play Icon & Dropdown):** Executes a custom automation script on this repository.
    - Clicking the main button runs the first task configured for this repository.
    - Clicking the dropdown arrow allows you to select any of this repository's tasks to run.
-   **View Logs (Document Icon):** Opens the resizable log panel at the bottom of the screen to show previous logs for this repository.
-   **Configure (Pencil Icon):** Opens the repository configuration modal.
-   **Delete (Trash Icon):** Permanently removes the repository from the dashboard after a confirmation prompt.

## 3. Managing Repositories and Tasks

Tasks (automation scripts) are configured on a per-repository basis.

### Adding a New Repository

1.  Click the **"New Repo"** button in the header.
2.  The "Add New Repository" modal will appear.
3.  On the **"General"** tab, fill in the repository's details (Name, URL, etc.).
4.  Optionally, switch to the **"Tasks"** tab to add automation scripts immediately.
5.  Click **"Save Repository"**.

### Editing a Repository and Managing Its Tasks

1.  On the desired repository card, click the **pencil icon**.
2.  The "Edit Repository" modal will appear. Use the tabs at the top to switch between editing general settings and managing tasks.

#### The "Tasks" Tab
This is where you can create powerful, custom automation scripts for the specific repository you are editing.

1. Click the **"New Task"** button.
2. A new modal will appear. Give your task a descriptive **name** (e.g., "Build & Deploy to Staging").
3. Click **"Add Step"** to build your workflow.
4. **Configure each step:**
   -   Use the dropdown to select the step **type**:
       -   **Git Pull:** Pulls the latest changes from the remote.
       -   **Install Dependencies:** Runs `npm install` or `yarn install`.
       -   **Run Custom Command:** Allows you to enter any shell command (e.g., `npm run test`).
5. Continue adding, configuring, and re-ordering steps.
6. Click **"Save Task"**. This saves the task to the repository configuration form.
7. Click **"Save Repository"** on the main form to persist your changes.

## 4. The Resizable Log Panel

When you run a task, a log panel will appear at the bottom of the screen.

-   **Resizing:** Click and drag the top border of the panel to resize it to your desired height.
-   **Content:** Logs are timestamped and color-coded for readability. The view auto-scrolls to the latest output.
-   **Closing:** Click the 'X' icon in the top-right of the panel to close it.

## 5. Global Settings View

Click the **cog icon** in the header to access global settings.

-   **Default Package Manager:** Choose between `npm` and `yarn`. The `Install Dependencies` task step will use this selection.
-   **Enable Notifications:** Toggle on/off the toast notifications that appear in the bottom-right corner.
