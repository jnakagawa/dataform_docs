"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCommand = generateCommand;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const sqlx_parser_1 = require("../parser/sqlx-parser");
const dataform_compiler_1 = require("../parser/dataform-compiler");
const dependency_graph_1 = require("../parser/dependency-graph");
const manifest_builder_1 = require("../generator/manifest-builder");
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
        // Try using Dataform CLI first, fall back to manual parsing
        let models = {};
        let catalog = { models: {} };
        if (await dataform_compiler_1.DataformCompiler.isDataformAvailable()) {
            console.log(chalk_1.default.yellow('📁 Compiling project using Dataform CLI...'));
            try {
                const compiler = new dataform_compiler_1.DataformCompiler();
                const projectInfo = await compiler.getProjectInfo(projectPath);
                console.log(chalk_1.default.gray(`   Project info: ${JSON.stringify(projectInfo)}`));
                models = await compiler.compileProject(projectPath);
                catalog = compiler.getCatalog();
                console.log(chalk_1.default.green(`   Found ${Object.keys(models).length} models via Dataform compilation`));
                console.log(chalk_1.default.green(`   Extracted column info for ${Object.keys(catalog.models).length} models`));
            }
            catch (error) {
                console.log(chalk_1.default.yellow(`   Dataform compilation failed: ${error instanceof Error ? error.message : error}`));
                console.log(chalk_1.default.yellow('   Falling back to manual SQLX parsing...'));
                const parser = new sqlx_parser_1.SqlxParser();
                models = await parser.parseProject(projectPath);
                console.log(chalk_1.default.green(`   Found ${Object.keys(models).length} models via manual parsing`));
            }
        }
        else {
            console.log(chalk_1.default.yellow('📁 Dataform CLI not available, parsing SQLX files manually...'));
            const parser = new sqlx_parser_1.SqlxParser();
            models = await parser.parseProject(projectPath);
            console.log(chalk_1.default.green(`   Found ${Object.keys(models).length} models`));
        }
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
        await copySiteFiles(outputPath);
        console.log(chalk_1.default.green('✅ Documentation generated successfully!'));
        console.log(chalk_1.default.blue(`   Run "dataform-docs serve -d ${options.output}" to view it`));
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Error generating documentation:'));
        console.error(chalk_1.default.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
}
async function copySiteFiles(outputPath) {
    const siteDistPath = path_1.default.join(__dirname, '../site');
    console.log(chalk_1.default.gray(`   Looking for site files at: ${siteDistPath}`));
    try {
        // Check if pre-built site exists
        await fs_1.promises.access(siteDistPath);
        // Copy all files from site to output directory
        const files = await fs_1.promises.readdir(siteDistPath, { recursive: true });
        console.log(chalk_1.default.gray(`   Found ${files.length} files/dirs`));
        for (const file of files) {
            if (typeof file === 'string') {
                const srcPath = path_1.default.join(siteDistPath, file);
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
        // If site doesn't exist, create a simple placeholder
        console.log(chalk_1.default.yellow('   Site files not found, creating placeholder...'));
        await createPlaceholderSite(outputPath);
    }
}
async function createPlaceholderSite(outputPath) {
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dataform Documentation</title>
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
    fetch('./manifest.json')
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