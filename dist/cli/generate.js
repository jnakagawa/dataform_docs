"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCommand = generateCommand;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const dataform_compiler_1 = require("../parser/dataform-compiler");
const dependency_graph_1 = require("../parser/dependency-graph");
const manifest_builder_1 = require("../generator/manifest-builder");
function normalizeBasePath(basePath) {
    if (!basePath)
        return './';
    // Handle absolute URLs (keep as-is)
    if (basePath.startsWith('http://') || basePath.startsWith('https://')) {
        return basePath.endsWith('/') ? basePath : basePath + '/';
    }
    // Handle relative paths
    let normalized = basePath;
    if (!normalized.startsWith('/')) {
        normalized = '/' + normalized;
    }
    if (!normalized.endsWith('/')) {
        normalized = normalized + '/';
    }
    return normalized;
}
async function generateCommand(options) {
    try {
        console.log(chalk_1.default.blue('🚀 Generating Dataform documentation...'));
        console.log(chalk_1.default.gray(`Project: ${options.project}`));
        console.log(chalk_1.default.gray(`Output: ${options.output}`));
        // Verify project directory exists and has definitions folder
        const projectPath = path_1.default.resolve(options.project);
        const definitionsPath = path_1.default.join(projectPath, 'definitions');
        try {
            await fs_1.promises.access(definitionsPath);
        }
        catch {
            throw new Error(`Definitions folder not found at ${definitionsPath}. Make sure you're in a Dataform project directory.`);
        }
        // Compile project using Dataform CLI (bundled as dependency)
        console.log(chalk_1.default.yellow('📁 Compiling project using Dataform CLI...'));
        const compiler = new dataform_compiler_1.DataformCompiler();
        const projectInfo = await compiler.getProjectInfo(projectPath);
        console.log(chalk_1.default.gray(`   Project info: ${JSON.stringify(projectInfo)}`));
        const models = await compiler.compileProject(projectPath);
        const catalog = compiler.getCatalog();
        console.log(chalk_1.default.green(`   Found ${Object.keys(models).length} models via Dataform compilation`));
        console.log(chalk_1.default.green(`   Extracted column info for ${Object.keys(catalog.models).length} models`));
        console.log(chalk_1.default.yellow('🔗 Building dependency graph...'));
        const graphBuilder = new dependency_graph_1.DependencyGraphBuilder();
        const dependencyGraph = graphBuilder.build(models);
        console.log(chalk_1.default.green(`   Created graph with ${dependencyGraph.nodes.length} nodes and ${dependencyGraph.edges.length} edges`));
        console.log(chalk_1.default.yellow('📄 Generating manifest...'));
        const manifestBuilder = new manifest_builder_1.ManifestBuilder();
        const manifest = manifestBuilder.build(models, dependencyGraph, {
            projectPath,
            version: '1.0.0'
        });
        // Ensure output directory exists
        const outputPath = path_1.default.resolve(options.output);
        await fs_1.promises.mkdir(outputPath, { recursive: true });
        // Write manifest.json
        await fs_1.promises.writeFile(path_1.default.join(outputPath, 'manifest.json'), JSON.stringify(manifest, null, 2));
        // Write catalog.json with column information
        await fs_1.promises.writeFile(path_1.default.join(outputPath, 'catalog.json'), JSON.stringify(catalog, null, 2));
        // Copy static site files
        console.log(chalk_1.default.yellow('📦 Copying site files...'));
        await copySiteFiles(outputPath, options.basePath);
        console.log(chalk_1.default.green('✅ Documentation generated successfully!'));
        console.log(chalk_1.default.blue(`   Run "dataform-docs serve -d ${options.output}" to view it`));
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Error generating documentation:'));
        console.error(chalk_1.default.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
}
async function copySiteFiles(outputPath, basePath) {
    // First try to find pre-built site files
    // When running from compiled dist/, look for src/site relative to package root
    // When running from dev, look for dist/site
    const distSitePath = path_1.default.join(__dirname, '../site');
    const srcSitePath = path_1.default.join(__dirname, '../../src/site');
    const siteGeneratorPath = path_1.default.join(__dirname, '../../site-generator');
    console.log(chalk_1.default.gray(`   Looking for site files at: ${distSitePath}`));
    try {
        // Check if pre-built site exists in dist/site
        await fs_1.promises.access(distSitePath);
        // Copy all files from site to output directory
        const files = await fs_1.promises.readdir(distSitePath, { recursive: true });
        console.log(chalk_1.default.gray(`   Found ${files.length} files/dirs`));
        for (const file of files) {
            if (typeof file === 'string') {
                const srcPath = path_1.default.join(distSitePath, file);
                const destPath = path_1.default.join(outputPath, file);
                const stat = await fs_1.promises.stat(srcPath);
                if (stat.isFile()) {
                    // Ensure destination directory exists
                    await fs_1.promises.mkdir(path_1.default.dirname(destPath), { recursive: true });
                    await fs_1.promises.copyFile(srcPath, destPath);
                }
            }
        }
    }
    catch {
        // Try src/site (for npm package)
        console.log(chalk_1.default.gray(`   Site files not found in dist, trying src...`));
        try {
            await fs_1.promises.access(srcSitePath);
            // Copy all files from src/site to output directory
            const files = await fs_1.promises.readdir(srcSitePath, { recursive: true });
            console.log(chalk_1.default.gray(`   Found ${files.length} files/dirs in src`));
            for (const file of files) {
                if (typeof file === 'string') {
                    const srcPath = path_1.default.join(srcSitePath, file);
                    const destPath = path_1.default.join(outputPath, file);
                    const stat = await fs_1.promises.stat(srcPath);
                    if (stat.isFile()) {
                        // Ensure destination directory exists
                        await fs_1.promises.mkdir(path_1.default.dirname(destPath), { recursive: true });
                        await fs_1.promises.copyFile(srcPath, destPath);
                    }
                }
            }
        }
        catch {
            // Try to build and copy from site-generator directory
            console.log(chalk_1.default.gray(`   Site files not found in dist, checking site-generator...`));
            try {
                await fs_1.promises.access(siteGeneratorPath);
                await buildAndCopySite(siteGeneratorPath, outputPath, basePath);
            }
            catch {
                // If neither exists, create a simple placeholder
                console.log(chalk_1.default.yellow('   Site files not found, creating placeholder...'));
                await createPlaceholderSite(outputPath, basePath);
            }
        }
    }
}
async function buildAndCopySite(siteGeneratorPath, outputPath, basePath) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    console.log(chalk_1.default.gray('   Building React site...'));
    try {
        // Set environment variables for base path before building
        const env = { ...process.env };
        if (basePath) {
            const normalizedPath = normalizeBasePath(basePath);
            env.VITE_BASE_PATH = normalizedPath;
            env.PUBLIC_URL = normalizedPath;
            console.log(chalk_1.default.gray(`   Using base path: ${normalizedPath}`));
        }
        // Build the React app
        await execAsync('npm run build', { cwd: siteGeneratorPath, env });
        // Copy built files directly to output
        const siteDistPath = path_1.default.join(siteGeneratorPath, 'dist');
        const files = await fs_1.promises.readdir(siteDistPath, { recursive: true });
        console.log(chalk_1.default.gray(`   Found ${files.length} built files/dirs`));
        for (const file of files) {
            if (typeof file === 'string') {
                const srcPath = path_1.default.join(siteDistPath, file);
                const destPath = path_1.default.join(outputPath, file);
                const stat = await fs_1.promises.stat(srcPath);
                if (stat.isFile()) {
                    // Ensure destination directory exists
                    await fs_1.promises.mkdir(path_1.default.dirname(destPath), { recursive: true });
                    // For HTML files, inject base path if needed
                    if (file === 'index.html' && basePath) {
                        const normalizedPath = normalizeBasePath(basePath);
                        let html = await fs_1.promises.readFile(srcPath, 'utf8');
                        // Inject base path into HTML if not already present
                        if (!html.includes('window.__BASE_PATH__')) {
                            html = html.replace('<head>', `<head><script>window.__BASE_PATH__ = "${normalizedPath}";</script>`);
                        }
                        await fs_1.promises.writeFile(destPath, html);
                    }
                    else {
                        await fs_1.promises.copyFile(srcPath, destPath);
                    }
                }
            }
        }
        console.log(chalk_1.default.green('   React site built and copied successfully'));
    }
    catch (error) {
        console.log(chalk_1.default.yellow(`   Failed to build React site: ${error instanceof Error ? error.message : error}`));
        console.log(chalk_1.default.yellow('   Creating placeholder...'));
        await createPlaceholderSite(outputPath, basePath);
    }
}
async function createPlaceholderSite(outputPath, basePath) {
    const normalizedBasePath = normalizeBasePath(basePath);
    const assetPath = normalizedBasePath === './' ? './' : normalizedBasePath;
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dataform Documentation</title>
  ${normalizedBasePath ? `<script>window.__BASE_PATH__ = "${normalizedBasePath}";</script>` : ''}

  <!-- Open Graph meta tags for social media sharing -->
  <meta property="og:title" content="Dataform Documentation" />
  <meta property="og:description" content="Interactive documentation for your Dataform projects with dependency graphs, pipeline isolation, and auto-zoom functionality." />
  <meta property="og:image" content="https://raw.githubusercontent.com/jnakagawa/dataform_docs/main/db_demo.png" />
  <meta property="og:url" content="https://jnakagawa.github.io/dataform-climbing-docs/" />
  <meta property="og:type" content="website" />
  
  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Dataform Documentation" />
  <meta name="twitter:description" content="Interactive documentation for your Dataform projects with dependency graphs, pipeline isolation, and auto-zoom functionality." />
  <meta name="twitter:image" content="https://raw.githubusercontent.com/jnakagawa/dataform_docs/main/db_demo.png" />
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; }
    .container { max-width: 800px; margin: 0 auto; }
    .loading { text-align: center; color: #666; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Dataform Documentation</h1>
    <div class="loading">
      <p>Loading documentation...</p>
      <p>If this message persists, the React site may not be built yet.</p>
      <p>Run <code>npm run build:site</code> to build the full documentation site.</p>
    </div>
    
    <h2>Manifest Data</h2>
    <div id="manifest-preview"></div>
  </div>

  <script>
    // Simple preview of manifest data
    fetch('${assetPath}manifest.json')
      .then(res => res.json())
      .then(data => {
        const manifestDiv = document.getElementById('manifest-preview');
        manifestDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
      })
      .catch(err => {
        console.error('Failed to load manifest:', err);
      });
  </script>
</body>
</html>`;
    await fs_1.promises.writeFile(path_1.default.join(outputPath, 'index.html'), indexHtml);
}
//# sourceMappingURL=generate.js.map