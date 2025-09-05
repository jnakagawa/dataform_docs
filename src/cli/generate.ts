import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { SqlxParser } from '../parser/sqlx-parser';
import { DataformCompiler } from '../parser/dataform-compiler';
import { DependencyGraphBuilder } from '../parser/dependency-graph';
import { ManifestBuilder } from '../generator/manifest-builder';

interface GenerateOptions {
  project: string;
  output: string;
  compile: boolean;
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

    // Try using Dataform CLI first, fall back to manual parsing
    let models: Record<string, any> = {};
    let catalog: any = { models: {} };
    
    if (await DataformCompiler.isDataformAvailable()) {
      console.log(chalk.yellow('📁 Compiling project using Dataform CLI...'));
      try {
        const compiler = new DataformCompiler();
        const projectInfo = await compiler.getProjectInfo(projectPath);
        console.log(chalk.gray(`   Project info: ${JSON.stringify(projectInfo)}`));
        
        models = await compiler.compileProject(projectPath);
        catalog = compiler.getCatalog();
        console.log(chalk.green(`   Found ${Object.keys(models).length} models via Dataform compilation`));
        console.log(chalk.green(`   Extracted column info for ${Object.keys(catalog.models).length} models`));
      } catch (error) {
        console.log(chalk.yellow(`   Dataform compilation failed: ${error instanceof Error ? error.message : error}`));
        console.log(chalk.yellow('   Falling back to manual SQLX parsing...'));
        
        const parser = new SqlxParser();
        models = await parser.parseProject(projectPath);
        console.log(chalk.green(`   Found ${Object.keys(models).length} models via manual parsing`));
      }
    } else {
      console.log(chalk.yellow('📁 Dataform CLI not available, parsing SQLX files manually...'));
      const parser = new SqlxParser();
      models = await parser.parseProject(projectPath);
      console.log(chalk.green(`   Found ${Object.keys(models).length} models`));
    }

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
    await copySiteFiles(outputPath);

    console.log(chalk.green('✅ Documentation generated successfully!'));
    console.log(chalk.blue(`   Run "dataform-docs serve -d ${options.output}" to view it`));

  } catch (error) {
    console.error(chalk.red('❌ Error generating documentation:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

async function copySiteFiles(outputPath: string) {
  const siteDistPath = path.join(__dirname, '../site');
  
  console.log(chalk.gray(`   Looking for site files at: ${siteDistPath}`));
  
  try {
    // Check if pre-built site exists
    await fs.access(siteDistPath);
    
    // Copy all files from site to output directory
    const files = await fs.readdir(siteDistPath, { recursive: true });
    console.log(chalk.gray(`   Found ${files.length} files/dirs`));
    
    for (const file of files) {
      if (typeof file === 'string') {
        const srcPath = path.join(siteDistPath, file);
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
    // If site doesn't exist, create a simple placeholder
    console.log(chalk.yellow('   Site files not found, creating placeholder...'));
    await createPlaceholderSite(outputPath);
  }
}

async function createPlaceholderSite(outputPath: string) {
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

  await fs.writeFile(path.join(outputPath, 'index.html'), indexHtml);
}