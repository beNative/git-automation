# Functional Manual

This manual provides a detailed walkthrough of all the features available in the Git Automation Dashboard.

## 1. The Main Dashboard

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
    - Clicking the main button runs the first task in your list.
    - Clicking the dropdown arrow allows you to select any of your created tasks to run.
-   **View Logs (Document Icon):** Opens a modal showing the detailed, real-time logs for the automation process.
-   **Configure (Pencil Icon):** Opens the repository form to edit this repository's configuration.
-   **Delete (Trash Icon):** Permanently removes the repository from the dashboard after a confirmation prompt.

## 2. Managing Repositories

### Adding a New Repository

1.  Click the **"New Repository"** button in the top-right header.
2.  The "Add New Repository" modal will appear.
3.  Fill in the form fields:
    -   **Repository Name:** A friendly name for your dashboard (e.g., "My Project Frontend").
    -   **Remote URL:** The full HTTPS or SSH URL of the Git repository.
    -   **Local Clone Path:** The conceptual local directory for the project.
    -   **Branch:** The name of the branch to sync (e.g., `main`, `develop`).
    -   **Authentication:**
        -   `None`: For public repositories.
        -   `SSH Key Path`: Provide the path to your SSH private key (conceptual).
        -   `HTTPS Token`: Provide a personal access token (PAT) for authentication over HTTPS.
4.  Click **"Save Repository"**.

### Editing a Repository

1.  On the desired repository card, click the **pencil icon**.
2.  The "Edit Repository" modal will appear with the existing data pre-filled.
3.  Make your desired changes and click **"Save Repository"**.

### Deleting a Repository

1.  On the desired repository card, click the **trash icon**.
2.  A confirmation dialog will appear.
3.  Click "OK" to permanently delete the repository from the dashboard. This action cannot be undone.

## 3. Global Settings & Scriptable Tasks

You can configure application-wide settings by clicking the **cog icon** in the header.

### General Tab

-   **Default Package Manager:** Choose between `npm` and `yarn`. The `Install Dependencies` task step will use this selection.
-   **Enable Notifications:** Toggle on/off the toast notifications that appear in the bottom-right corner after a task succeeds or fails.

### Tasks Tab

This is where you can create powerful, custom automation scripts.

#### Creating a New Task
1. Click the **"New Task"** button.
2. A modal will appear. Give your task a descriptive **name** (e.g., "Build & Deploy to Staging").
3. Click **"Add Step"**. A new step is added to the list.
4. **Configure the step:**
   -   Use the dropdown to select the step **type**:
       -   **Git Pull:** Pulls the latest changes from the remote repository.
       -   **Install Dependencies:** Runs `npm install` or `yarn install` based on your global settings.
       -   **Run Custom Command:** Allows you to enter any shell command (e.g., `npm run test`, `electron-builder --win`).
5. Continue adding, configuring, and re-ordering steps using the up/down arrows to build your desired workflow.
6. Click **"Save Task"**.

#### Managing Tasks
- **Edit a Task:** Click the pencil icon next to a task in the list to open the editor.
- **Delete a Task:** Click the trash icon to permanently delete a task.

## 4. Viewing Logs

When you run a task or click the "View Logs" button, a modal appears showing the output from the script.

-   Logs are timestamped and color-coded for readability:
    -   **Cyan:** Commands being executed.
    -   **Green:** Success messages.
    -   **Red:** Error messages.
-   The log view scrolls automatically to show the latest output.
-   Click the **"Close"** button or the 'X' in the corner to dismiss the modal.
