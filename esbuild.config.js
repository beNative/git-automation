const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');
const isProd = process.env.NODE_ENV === 'production';

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

// --- Renderer Build ---
const rendererConfig = {
    entryPoints: ['index.tsx'],
    bundle: true,
    outfile: 'dist/renderer.js',
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
    outfile: 'dist/main.js',
    platform: 'node',
    target: 'node18', // Corresponds to Electron's Node.js version
    format: 'cjs',
    sourcemap: !isProd,
    minify: isProd,
    external: ['electron', 'electron-squirrel-startup'], // Exclude electron from the bundle
    define: {
        'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
    },
};


// --- Copy HTML ---
function copyHtml() {
    try {
        fs.copyFileSync(path.resolve(__dirname, 'index.html'), path.resolve(__dirname, 'dist/index.html'));
        if (isWatch) {
            console.log('Copied index.html to dist/');
        }
    } catch (e) {
        console.error('Failed to copy index.html:', e);
    }
}


// --- Build Logic ---
async function build() {
    try {
        if (isWatch) {
            console.log('Starting esbuild in watch mode...');
            const rendererContext = await esbuild.context(rendererConfig);
            const mainContext = await esbuild.context(mainConfig);
            copyHtml(); // Initial copy
            // Simple file watcher for index.html
            fs.watch('index.html', () => copyHtml());

            await rendererContext.watch();
            await mainContext.watch();
        } else {
            console.log('Building for production...');
            await esbuild.build(rendererConfig);
            await esbuild.build(mainConfig);
            copyHtml();
            console.log('Build successful.');
        }
    } catch (e) {
        console.error('Build failed:', e);
        process.exit(1);
    }
}

build();