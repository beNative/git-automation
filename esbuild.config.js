const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');
const isProd = process.env.NODE_ENV === 'production';

const distPath = path.resolve(__dirname, 'dist');

// Clean and recreate the dist directory before each build
fs.rmSync(distPath, { recursive: true, force: true });
fs.mkdirSync(distPath, { recursive: true });


// --- Renderer Build ---
const rendererConfig = {
    entryPoints: ['index.tsx'],
    bundle: true,
    outfile: path.join(distPath, 'renderer.js'),
    platform: 'browser',
    target: 'chrome100', // Electron versions are tied to Chromium versions
    format: 'iife',
    sourcemap: !isProd,
    minify: isProd,
    define: {
        'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
        // API_KEY needs to be available in the renderer process
        'process.env.API_KEY': JSON.stringify(process.env.API_KEY || null)
    },
};

// --- Main Process Build ---
const mainConfig = {
    entryPoints: ['electron/main.ts'],
    bundle: true,
    outfile: path.join(distPath, 'main.js'),
    platform: 'node',
    target: 'node18', // Corresponds to Electron's Node.js version
    format: 'cjs',
    sourcemap: !isProd,
    minify: isProd,
    external: ['electron', 'electron-squirrel-startup', '@google/genai', 'jszip'], // Exclude electron, built-ins, and genai from bundle
    define: {
        'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
        // API_KEY is needed in main process for AI features
        'process.env.API_KEY': JSON.stringify(process.env.API_KEY || null)
    },
};

// --- Preload Script Build ---
const preloadConfig = {
    entryPoints: ['electron/preload.ts'],
    bundle: true,
    outfile: path.join(distPath, 'preload.js'),
    platform: 'node', // Runs in a Node-like context in the renderer
    target: 'node18',
    format: 'cjs',
    sourcemap: !isProd,
    minify: isProd,
    external: ['electron'],
};


// --- Copy Static Files ---
function copyStaticFiles() {
    // Copy index.html
    try {
        fs.copyFileSync(path.resolve(__dirname, 'index.html'), path.resolve(distPath, 'index.html'));
        if (isWatch) {
            console.log('Copied index.html to dist/');
        }
    } catch (e) {
        console.error('Failed to copy index.html:', e);
    }

    // Copy assets directory if it exists
    const assetsSrc = path.resolve(__dirname, 'assets');
    if (fs.existsSync(assetsSrc)) {
        try {
            fs.cpSync(assetsSrc, path.resolve(distPath, 'assets'), { recursive: true });
            if (isWatch) {
                console.log('Copied assets directory to dist/');
            }
        } catch (e) {
            console.error('Failed to copy assets directory:', e);
        }
    }
    
    // Copy documentation files
    const docsDest = path.resolve(distPath, 'docs');
    fs.mkdirSync(docsDest, { recursive: true });
    const docFiles = ['README.md', 'FUNCTIONAL_MANUAL.md', 'TECHNICAL_MANUAL.md', 'CHANGELOG.md'];
    docFiles.forEach(file => {
        try {
            fs.copyFileSync(path.resolve(__dirname, file), path.resolve(docsDest, file));
        } catch (e) {
            console.error(`Failed to copy ${file}:`, e);
        }
    });
     if (isWatch) {
        console.log('Copied documentation files to dist/docs/');
    }
}

// --- Create production package.json for electron-builder ---
function createProdPackageJson() {
    const rootPackageJson = require('./package.json');
    const prodPackageJson = {
        name: rootPackageJson.name,
        version: rootPackageJson.version,
        description: rootPackageJson.description,
        main: 'main.js',
        author: rootPackageJson.author,
        license: rootPackageJson.license,
        dependencies: {}
    };

    const mainExternals = ['@google/genai', 'electron-squirrel-startup', 'jszip'];
    for (const dep of mainExternals) {
        if (rootPackageJson.dependencies[dep]) {
            prodPackageJson.dependencies[dep] = rootPackageJson.dependencies[dep];
        } else {
             console.warn(`[createProdPackageJson] Dependency '${dep}' not found in root package.json`);
        }
    }
    
    try {
        fs.writeFileSync(path.join(distPath, 'package.json'), JSON.stringify(prodPackageJson, null, 2));
        if (isWatch) {
            console.log('Created production package.json in dist/');
        }
    } catch (e) {
        console.error('Failed to create production package.json:', e);
    }
}


// --- Build Logic ---
async function build() {
    try {
        if (isWatch) {
            console.log('Starting esbuild in watch mode...');
            const rendererContext = await esbuild.context(rendererConfig);
            const mainContext = await esbuild.context(mainConfig);
            const preloadContext = await esbuild.context(preloadConfig);
            
            copyStaticFiles(); // Initial copy
            createProdPackageJson(); // Initial create
            
            // Simple file watcher for static files
            fs.watch('index.html', () => copyStaticFiles());
            fs.watch('README.md', () => copyStaticFiles());
            fs.watch('FUNCTIONAL_MANUAL.md', () => copyStaticFiles());
            fs.watch('TECHNICAL_MANUAL.md', () => copyStaticFiles());
            fs.watch('CHANGELOG.md', () => copyStaticFiles());
            fs.watch('package.json', () => createProdPackageJson());

            await rendererContext.watch();
            await mainContext.watch();
            await preloadContext.watch();

        } else {
            console.log('Building for production...');
            await esbuild.build(rendererConfig);
            await esbuild.build(mainConfig);
            await esbuild.build(preloadConfig);
            copyStaticFiles();
            createProdPackageJson();
            console.log('Build successful.');
        }
    } catch (e) {
        console.error('Build failed:', e);
        process.exit(1);
    }
}

build();