# Welcome to the Git Automation Dashboard

This application provides a simple, powerful dashboard to manage and automate the workflow for a set of Git and SVN repositories. It is designed for developers who need to regularly update, install dependencies, and run build scripts across multiple projects.

## Core Features

-   **Centralized Dashboard:** View the status, branch, and build health of all your repositories in one place.
-   **Multi-VCS Support:** Manage both Git and Subversion (SVN) repositories seamlessly.
-   **Repository-Specific Tasks:** Create custom, multi-step automation scripts (e.g., pull/update, install, build) for each repository.
-   **Quick Actions:** Copy repository URLs/paths with a single click and access all common actions via a right-click context menu.
-   **Parallel Execution:** Run tasks on multiple repositories at the same time without waiting.
-   **One-Click Update Check:** A "Check Updates" button fetches the latest information from all remotes, showing an "Updates Available" indicator on repositories that are behind.
-   **Detailed Git Status:** See ahead/behind status and a summary of file changes directly on the dashboard.
-   **Branch Management:** Quickly switch branches from the dashboard, or view, create, delete, and merge branches in the configuration view.
-   **Commit History:** View the 30 most recent commits for any repository.
-   **Tabbed & Integrated Log Panel:** Monitor the output of every command in a detailed, resizable, and tabbed log panel that integrates smoothly into the main view.
-   **Advanced Debugging:** A powerful debug console with log filtering and a save-to-file feature for in-depth troubleshooting.
-   **Easy Configuration:** Add new repositories and configure them through a simple, unified form.
-   **Global Settings:** Customize the default package manager (`npm` or `yarn`), theme, and more.
-   **Cross-Platform:** Works on Windows, macOS, and Linux.

## Quick Start

1.  **Add a Repository:**
    -   Click the **"New Repo"** button in the header.
    -   Select the Version Control System (Git or SVN).
    -   Fill in the required details on the "General" tab.
    -   Click **"Save Repository"**.

2.  **Create a Task:**
    -   On the dashboard, click the **pencil icon** on your repository's card to open the configuration modal.
    -   Go to the **"Tasks"** tab.
    -   Click **"New Task"**, give it a name (e.g., "Build for Windows"), and add the steps you need (e.g., Git Pull/SVN Update, Install Dependencies, Run Command: `npm run build:win`).
    -   Save the task, then save the repository.

3.  **Run a Task:**
    -   Find your repository card on the dashboard.
    -   Click a task button or use the task selection menu to run your task.
    -   The resizable log panel will automatically appear at the bottom, showing the progress of your script.
---
_For developer information, including how to run this project in development mode or build it from source, please see the **Technical Manual** tab in the Info Hub._