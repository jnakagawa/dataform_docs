# dataform-docs

Generate beautiful, interactive documentation for your Dataform projects with dependency graphs, pipeline isolation, and auto-zoom functionality.

## Features

✨ **Interactive Dependency Graph** - Visualize your entire data pipeline with hierarchical DAG layout
🔍 **Pipeline Isolation** - Focus on specific models and their dependencies
🎯 **Auto-zoom** - Automatically zoom to isolated pipelines for better visibility
📊 **Column Definitions** - View table schemas and column descriptions
🔗 **Deep Linking** - Share direct links to specific models with full URL state management
🌐 **Base Path Support** - Deploy under custom paths for proxy/subdirectory hosting
🚀 **Fast & Static** - Generates self-contained HTML that can be hosted anywhere

## Demo

🌟 **[View Live Demo](https://jnakagawa.github.io/dataform-climbing-docs/)** - Interactive climbing database documentation

![Demo Screenshot](db_demo.png)


## Requirements

- **Node.js** 16 or higher
- **Dataform CLI** - Automatically installed as a dependency for optimal column extraction and compilation

## Quick Start

The easiest way to use dataform-docs is with npx (no installation required):

```bash
# From your Dataform project directory
npx dataform-docs generate
npx dataform-docs serve
```

Open http://localhost:4200 to view your documentation.

## Installation

### Global Installation (Recommended)

```bash
npm install -g dataform-docs
```

Then from any Dataform project:

```bash
dataform-docs generate
dataform-docs serve
```

### Local Installation

```bash
npm install --save-dev dataform-docs
```

Add to your `package.json` scripts:

```json
{
  "scripts": {
    "docs:generate": "dataform-docs generate",
    "docs:serve": "dataform-docs serve",
    "docs": "dataform-docs generate && dataform-docs serve"
  }
}
```

## Usage

### Generate Documentation

```bash
dataform-docs generate [options]

Options:
  -p, --project <path>    Path to Dataform project (default: current directory)
  -o, --output <path>     Output directory for documentation (default: ./dataform-docs)
  -b, --base-path <path>  Base path for serving the documentation (e.g., /dataform/docs/)
  --no-compile            Skip SQL compilation
```

### Serve Documentation

```bash
dataform-docs serve [options]

Options:
  -p, --port <number>     Port to serve on (default: 4200)
  -d, --dir <path>        Directory to serve (default: ./dataform-docs)
  -b, --base-path <path>  Base path for routing (e.g., /dataform/docs/)
  --open                  Open browser automatically
```

## Base Path Support

Use base paths when deploying under custom URL paths or proxy configurations:

### Local Development with Base Path
```bash
# Generate with base path
dataform-docs generate -b /my-project/docs/

# Serve with base path
dataform-docs serve -b /my-project/docs/
# Opens http://localhost:4200/my-project/docs/
```

### Common Deployment Scenarios

#### GitHub Pages with Project Path
```bash
# For https://username.github.io/project-name/dataform/
dataform-docs generate -o ./docs -b /project-name/dataform/
```

#### Proxy/Subdirectory Hosting
```bash
# For https://company.com/internal/dataform-docs/
dataform-docs generate -b /internal/dataform-docs/
dataform-docs serve -b /internal/dataform-docs/
```

#### Docker/Kubernetes with Ingress
```bash
# For ingress path /api/v1/dataform/
dataform-docs generate -b /api/v1/dataform/
```

## Deploy to GitHub Pages

```bash
# Generate docs with GitHub Pages base path
dataform-docs generate -o ./docs -b /your-repo-name/

# Commit and push
git add docs
git commit -m "Update documentation"
git push

# Enable GitHub Pages from /docs folder in repository settings
```

## Requirements

- Node.js 16.0.0 or higher
- A Dataform project with `dataform.json` configuration

## License

MIT
