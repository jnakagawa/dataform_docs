import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { DataformCompiler } from '../parser/dataform-compiler';
import { DependencyGraphBuilder } from '../parser/dependency-graph';
import { ManifestBuilder } from '../generator/manifest-builder';

function normalizeBasePath(basePath?: string): string {
  if (!basePath) return './';
  
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

interface GenerateOptions {
  project: string;
  output: string;
  compile: boolean;
  basePath?: string;
}

export async function generateCommand(options: GenerateOptions) {
  try {
    console.log(chalk.blue('🚀 Generating Dataform documentation...'));
    console.log(chalk.gray(`Project: ${options.project}`));
    console.log(chalk.gray(`Output: ${options.output}`));

    // Verify project directory exists and has definitions folder
    const projectPath = path.resolve(options.project);
    const definitionsPath = path.join(projectPath, 'definitions');
    
    try {
      await fs.access(definitionsPath);
    } catch {
      throw new Error(`Definitions folder not found at ${definitionsPath}. Make sure you're in a Dataform project directory.`);
    }

    // Compile project using Dataform CLI (bundled as dependency)
    console.log(chalk.yellow('📁 Compiling project using Dataform CLI...'));
    
    const compiler = new DataformCompiler();
    const projectInfo = await compiler.getProjectInfo(projectPath);
    console.log(chalk.gray(`   Project info: ${JSON.stringify(projectInfo)}`));

    const models = await compiler.compileProject(projectPath);
    const catalog = compiler.getCatalog();
    console.log(chalk.green(`   Found ${Object.keys(models).length} models via Dataform compilation`));
    console.log(chalk.green(`   Extracted column info for ${Object.keys(catalog.models).length} models`));

    console.log(chalk.yellow('🔗 Building dependency graph...'));
    const graphBuilder = new DependencyGraphBuilder();
    const dependencyGraph = graphBuilder.build(models);
    console.log(chalk.green(`   Created graph with ${dependencyGraph.nodes.length} nodes and ${dependencyGraph.edges.length} edges`));

    console.log(chalk.yellow('📄 Generating manifest...'));
    const manifestBuilder = new ManifestBuilder();
    const manifest = manifestBuilder.build(models, dependencyGraph, {
      projectPath,
      version: '1.0.0'
    });

    // Ensure output directory exists
    const outputPath = path.resolve(options.output);
    await fs.mkdir(outputPath, { recursive: true });

    // Write manifest.json
    await fs.writeFile(
      path.join(outputPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Write catalog.json with column information
    await fs.writeFile(
      path.join(outputPath, 'catalog.json'),
      JSON.stringify(catalog, null, 2)
    );

    // Copy static site files
    console.log(chalk.yellow('📦 Copying site files...'));
    await copySiteFiles(outputPath, options.basePath);

    console.log(chalk.green('✅ Documentation generated successfully!'));
    console.log(chalk.blue(`   Run "dataform-docs serve -d ${options.output}" to view it`));

  } catch (error) {
    console.error(chalk.red('❌ Error generating documentation:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

async function copySiteFiles(outputPath: string, basePath?: string) {
  // First try to find pre-built site files
  const distSitePath = path.join(__dirname, '../site');
  const siteGeneratorPath = path.join(__dirname, '../../site-generator');
  
  console.log(chalk.gray(`   Looking for site files at: ${distSitePath}`));
  
  try {
    // Check if pre-built site exists in dist/site
    await fs.access(distSitePath);
    
    // Copy all files from site to output directory
    const files = await fs.readdir(distSitePath, { recursive: true });
    console.log(chalk.gray(`   Found ${files.length} files/dirs`));
    
    for (const file of files) {
      if (typeof file === 'string') {
        const srcPath = path.join(distSitePath, file);
        const destPath = path.join(outputPath, file);
        
        const stat = await fs.stat(srcPath);
        if (stat.isFile()) {
          // Ensure destination directory exists
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.copyFile(srcPath, destPath);
        }
      }
    }
  } catch {
    // Try to build and copy from site-generator directory
    console.log(chalk.gray(`   Site files not found in dist, checking site-generator...`));
    
    try {
      await fs.access(siteGeneratorPath);
      await buildAndCopySite(siteGeneratorPath, outputPath, basePath);
    } catch {
      // If neither exists, create a simple placeholder
      console.log(chalk.yellow('   Site files not found, creating placeholder...'));
      await createPlaceholderSite(outputPath, basePath);
    }
  }
}

async function buildAndCopySite(siteGeneratorPath: string, outputPath: string, basePath?: string) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  console.log(chalk.gray('   Building React site...'));
  
  try {
    // Set environment variables for base path before building
    const env = { ...process.env };
    if (basePath) {
      const normalizedPath = normalizeBasePath(basePath);
      env.VITE_BASE_PATH = normalizedPath;
      env.PUBLIC_URL = normalizedPath;
      console.log(chalk.gray(`   Using base path: ${normalizedPath}`));
    }
    
    // Build the React app
    await execAsync('npm run build', { cwd: siteGeneratorPath, env });
    
    // Copy built files directly to output
    const siteDistPath = path.join(siteGeneratorPath, 'dist');
    const files = await fs.readdir(siteDistPath, { recursive: true });
    console.log(chalk.gray(`   Found ${files.length} built files/dirs`));

    for (const file of files) {
      if (typeof file === 'string') {
        const srcPath = path.join(siteDistPath, file);
        const destPath = path.join(outputPath, file);

        const stat = await fs.stat(srcPath);
        if (stat.isFile()) {
          // Ensure destination directory exists
          await fs.mkdir(path.dirname(destPath), { recursive: true });

          // For HTML files, inject base path if needed
          if (file === 'index.html' && basePath) {
            const normalizedPath = normalizeBasePath(basePath);
            let html = await fs.readFile(srcPath, 'utf8');

            // Inject base path into HTML if not already present
            if (!html.includes('window.__BASE_PATH__')) {
              html = html.replace(
                '<head>',
                `<head><script>window.__BASE_PATH__ = "${normalizedPath}";</script>`
              );
            }

            await fs.writeFile(destPath, html);
          } else {
            await fs.copyFile(srcPath, destPath);
          }
        }
      }
    }
    
    console.log(chalk.green('   React site built and copied successfully'));
  } catch (error) {
    console.log(chalk.yellow(`   Failed to build React site: ${error instanceof Error ? error.message : error}`));
    console.log(chalk.yellow('   Creating placeholder...'));
    await createPlaceholderSite(outputPath, basePath);
  }
}

async function createPlaceholderSite(outputPath: string, basePath?: string) {
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

  await fs.writeFile(path.join(outputPath, 'index.html'), indexHtml);
}

