# Git Automation Dashboard

A dashboard to manage and automate the workflow for a set of Git repositories, including pulling, installing dependencies, and running build scripts. This project is packaged as a cross-platform desktop application using Electron.

## Features

- Add, edit, and delete Git repository configurations.
- Run automated workflows (pull, install, build) with a single click.
- View real-time logs for automation tasks.
- Configure global settings for package managers and build commands.
- Cross-platform support (Windows, macOS, Linux).

## Development

To run the application in development mode with live-reloading:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Set API Key:**
    This application requires a Google Gemini API key. Please set it as an environment variable named `API_KEY`.

    _On macOS/Linux:_
    ```bash
    export API_KEY="YOUR_API_KEY_HERE"
    ```

    _On Windows (Command Prompt):_
    ```bash
    set API_KEY="YOUR_API_KEY_HERE"
    ```

    _On Windows (PowerShell):_
    ```powershell
    $env:API_KEY="YOUR_API_KEY_HERE"
    ```

3.  **Start the development server:**
    ```bash
    npm start
    ```
    This will launch the Electron application with developer tools open. Changes to the source code will be automatically rebuilt.

## Building Executables

To build the application for your current platform:

1.  **Ensure dependencies are installed:**
    ```bash
    npm install
    ```

2.  **Run the packaging script:**
    ```bash
    npm run pack
    ```

This command will first build the production-ready source files using `esbuild` and then package them into an executable using `electron-builder`.

The final distributable files will be located in the `release/` directory.

### Cross-platform Builds

To build for a specific platform (e.g., building for Windows on a macOS machine), you can use `electron-builder`'s CLI options:

-   `npm run pack -- --win` (for Windows)
-   `npm run pack -- --mac` (for macOS)
-   `npm run pack -- --linux` (for Linux)

Note: Building for macOS requires a macOS host. Building for Windows is possible on other platforms with Docker.

## Testing the Build

After running `npm run pack`, you can test the generated executable:

1.  Navigate to the `release/` directory.
2.  Locate the executable for your platform:
    -   **Windows**: Find the `.exe` installer (e.g., `Git Automation Dashboard Setup 1.0.0.exe`). Run it to install, then launch the application.
    -   **macOS**: Find the `.dmg` file. Open it and drag the application icon to your `Applications` folder. Launch it from there.
    -   **Linux**: Find the `.AppImage` file. Make it executable (`chmod +x *.AppImage`) and then run it. Alternatively, install the `.deb` package if you are on a Debian-based distribution.
3.  Launch the application. It should open and display the main dashboard interface.
4.  Verify functionality by adding a repository and running the automation process.
