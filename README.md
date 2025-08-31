# Welcome to the Git Automation Dashboard

This application provides a simple, powerful dashboard to manage and automate the workflow for a set of Git repositories. It is designed for developers who need to regularly pull the latest changes, install dependencies, and run build scripts across multiple projects.

## Core Features

- **Centralized Dashboard:** View the status, branch, and build health of all your repositories in one place.
- **Scriptable Tasks:** Create custom, multi-step automation scripts (e.g., pull, install dependencies, run build commands) and run them on any repository with two clicks.
- **Real-time Logging:** Monitor the output of every command in a detailed log viewer to easily debug issues.
- **Easy Configuration:** Add new repositories and configure authentication (SSH key or HTTPS token) through a simple form.
- **Global Settings:** Customize the default package manager (`npm` or `yarn`) to fit your projects.
- **Cross-Platform:** Works on Windows, macOS, and Linux.
- **Automatic Updates:** The application automatically checks for new versions and prompts you to install them, ensuring you always have the latest features.

## Quick Start

1.  **Add a Repository:**
    -   Click the **"New Repository"** button in the header.
    -   Fill in the required details: a name for the repository, its remote URL, the local path where it's cloned, and the branch you want to track.
    -   Click **"Save Repository"**.

2.  **Create a Task:**
    -   Click the **cog icon** in the header to open Settings.
    -   Go to the **"Tasks"** tab.
    -   Click **"New Task"**, give it a name (e.g., "Build for Windows"), and add the steps you need (e.g., Git Pull, Install Dependencies, Run Command: `npm run build:win`).
    -   Save the task.

3.  **Run a Task:**
    -   Find your repository card on the dashboard.
    -   Click the **"Run Task"** dropdown and select the task you created.
    -   The log viewer will automatically open, showing the progress of your custom script.
---
_For developer information, including how to run this project in development mode or build it from source, please see the **Technical Manual** tab in the Info Hub._
