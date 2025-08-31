# Welcome to the Git Automation Dashboard

This application provides a simple, powerful dashboard to manage and automate the workflow for a set of Git and SVN repositories. It is designed for developers who need to regularly update, install dependencies, and run build scripts across multiple projects.

## Core Features

-   **Centralized Dashboard:** View the status, branch, and build health of all your repositories in one place.
-   **Multi-VCS Support:** Manage both Git and Subversion (SVN) repositories seamlessly.
-   **Repository-Specific Tasks:** Create custom, multi-step automation scripts (e.g., pull/update, install, build) for each repository.
-   **Resizable Log Panel:** Monitor the output of every command in a detailed, resizable log panel at the bottom of the window.
-   **Easy Configuration:** Add new repositories and configure authentication (e.g., SSH key for Git, username/password for SVN) through a simple, unified form.
-   **Global Settings:** Customize the default package manager (`npm` or `yarn`) to fit your projects.
-   **Cross-Platform:** Works on Windows, macOS, and Linux.
-   **Automatic Updates:** The application automatically checks for new versions and prompts you to install them.

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
    -   Click the **"Run Task"** dropdown and select the task you created.
    -   The resizable log panel will automatically appear at the bottom, showing the progress of your script.
---
_For developer information, including how to run this project in development mode or build it from source, please see the **Technical Manual** tab in the Info Hub._