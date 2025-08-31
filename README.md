# Git Automation Dashboard

A dashboard to manage and automate the workflow for a set of Git repositories, including pulling, installing dependencies, and running build scripts. This project is packaged as a cross-platform desktop application using Electron.

## Features

- Add, edit, and delete Git repository configurations.
- Run automated workflows (pull, install, build) with a single click.
- View real-time logs for automation tasks.
- Configure global settings for package managers and build commands.
- Cross-platform support (Windows, macOS, Linux).
- **Automatic Updates:** The application automatically checks for new versions and prompts you to install them.

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

## Automatic Updates

This application uses `electron-updater` to handle automatic updates.

### How it Works

1.  When the application starts, it checks for a new version from the GitHub repository specified in `package.json`.
2.  If a new version is found, it will be downloaded in the background.
3.  Once the download is complete, you will be prompted with a dialog to restart the application to apply the update.

### Configuring Your Release Repository

To publish new versions and enable updates, you need to:

1.  **Create a public GitHub repository** to host your releases.

2.  **Update `package.json`:**
    In the `build.publish` section, replace the placeholder values with your GitHub username and repository name:
    ```json
    "publish": {
      "provider": "github",
      "owner": "your-github-username",
      "repo": "your-repo-name"
    }
    ```

3.  **Create a GitHub Access Token:**
    -   Go to [GitHub's Personal Access Tokens page](https://github.com/settings/tokens).
    -   Generate a new token (classic) with the `repo` scope. This token is required for `electron-builder` to create releases and upload your packaged application.

4.  **Set the `GH_TOKEN` Environment Variable:**
    Before running the packaging script, set the `GH_TOKEN` environment variable to the value of the token you just created.
    ```bash
    # On macOS/Linux
    export GH_TOKEN="your_github_token_here"
    
    # On Windows (PowerShell)
    $env:GH_TOKEN="your_github_token_here"
    ```

5.  **Publish a New Release:**
    Run the `npm run pack` command. `electron-builder` will build your application, create a new draft release on GitHub, and upload the installers/executables. You can then publish the draft release from the GitHub UI.

Once a new release is published, existing installations of your app will automatically detect and download it.

## Testing the Build

After running `npm run pack`, you can test the generated executable:

1.  Navigate to the `release/` directory.
2.  Locate the executable for your platform:
    -   **Windows**: Find the `.exe` installer (e.g., `Git Automation Dashboard Setup 1.0.0.exe`). Run it to install, then launch the application.
    -   **macOS**: Find the `.dmg` file. Open it and drag the application icon to your `Applications` folder. Launch it from there.
    -   **Linux**: Find the `.AppImage` file. Make it executable (`chmod +x *.AppImage`) and then run it. Alternatively, install the `.deb` package if you are on a Debian-based distribution.
3.  Launch the application. It should open and display the main dashboard interface.
4.  Verify functionality by adding a repository and running the automation process.