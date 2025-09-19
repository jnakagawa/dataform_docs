import express from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import chalk from 'chalk';
import open from 'open';

function normalizeBasePath(basePath?: string): string {
  if (!basePath) return '';

  // Handle absolute URLs (keep as-is)
  if (basePath.startsWith('http://') || basePath.startsWith('https://')) {
    return basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  }

  // Handle relative paths
  let normalized = basePath;
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

interface ServeOptions {
  port: string;
  dir: string;
  basePath?: string;
  open: boolean;
}

export async function serveCommand(options: ServeOptions) {
  try {
    const port = parseInt(options.port, 10);
    const servePath = path.resolve(options.dir);
    const normalizedBasePath = normalizeBasePath(options.basePath);

    // Verify directory exists
    try {
      await fs.access(servePath);
    } catch {
      throw new Error(`Directory not found: ${servePath}. Run "dataform-docs generate" first.`);
    }

    // Check if manifest.json exists
    try {
      await fs.access(path.join(servePath, 'manifest.json'));
    } catch {
      throw new Error(`No manifest.json found in ${servePath}. Run "dataform-docs generate" first.`);
    }

    const app = express();

    // Helper function to inject base path into HTML
    const getIndexHtmlWithBasePath = async (): Promise<string> => {
      const indexPath = path.join(servePath, 'index.html');
      let html = await fs.readFile(indexPath, 'utf8');

      if (!normalizedBasePath) {
        return html;
      }

      // Inject base path into HTML
      html = html.replace(
        '<head>',
        `<head><script>window.__BASE_PATH__ = "${normalizedBasePath}";</script>`
      );

      // Fix relative asset paths to work with base path
      // Convert ./assets/ to ./dataform/docs/assets/ (for example)
      const basePath = normalizedBasePath.endsWith('/') ? normalizedBasePath.slice(0, -1) : normalizedBasePath;
      html = html.replace(/src="\.\/assets\//g, `src="${basePath}/assets/`);
      html = html.replace(/href="\.\/assets\//g, `href="${basePath}/assets/`);
      html = html.replace(/href="\/favicon\.svg"/g, `href="${basePath}/favicon.svg"`);

      return html;
    };

    // Handle base path root specifically to inject base path
    if (normalizedBasePath) {
      app.get(normalizedBasePath, async (req, res) => {
        try {
          const html = await getIndexHtmlWithBasePath();
          res.send(html);
        } catch (error) {
          console.error('Error serving index.html:', error);
          res.status(500).send('Internal Server Error');
        }
      });

      app.get(`${normalizedBasePath}/`, async (req, res) => {
        try {
          const html = await getIndexHtmlWithBasePath();
          res.send(html);
        } catch (error) {
          console.error('Error serving index.html:', error);
          res.status(500).send('Internal Server Error');
        }
      });

      // Serve static files with base path, excluding index.html
      app.use(normalizedBasePath, express.static(servePath, { index: false }));
    } else {
      app.use(express.static(servePath));
    }

    // SPA fallback - serve index.html for any unmatched routes
    app.get('*', async (req, res) => {
      try {
        // For API routes, serve JSON files directly
        if (req.path.endsWith('.json')) {
          const jsonPath = normalizedBasePath
            ? req.path.replace(normalizedBasePath, '')
            : req.path;
          const filePath = path.join(servePath, jsonPath);

          try {
            await fs.access(filePath);
            return res.sendFile(filePath);
          } catch {
            // File not found, continue to SPA fallback
          }
        }

        // For SPA routes, serve index.html with base path
        const html = await getIndexHtmlWithBasePath();
        res.send(html);
      } catch (error) {
        console.error('Error serving file:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    const server = app.listen(port, () => {
      const baseUrl = `http://localhost:${port}`;
      const fullUrl = normalizedBasePath ? `${baseUrl}${normalizedBasePath}` : baseUrl;
      console.log(chalk.green('✅ Documentation server started!'));
      console.log(chalk.blue(`   📖 Open ${fullUrl} in your browser`));
      console.log(chalk.gray(`   📁 Serving from: ${servePath}`));
      if (normalizedBasePath) {
        console.log(chalk.gray(`   🔗 Base path: ${normalizedBasePath}`));
      }
      console.log(chalk.gray('   Press Ctrl+C to stop'));

      if (options.open) {
        open(fullUrl).catch(err => {
          console.warn(chalk.yellow('Could not open browser automatically:', err.message));
        });
      }
    });

    // Handle shutdown gracefully
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n🛑 Shutting down server...'));
      server.close(() => {
        console.log(chalk.green('✅ Server stopped'));
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      server.close(() => {
        process.exit(0);
      });
    });

  } catch (error) {
    console.error(chalk.red('❌ Error starting server:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}