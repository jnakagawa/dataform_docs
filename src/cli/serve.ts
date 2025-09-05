import express from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import chalk from 'chalk';
import open from 'open';

interface ServeOptions {
  port: string;
  dir: string;
  open: boolean;
}

export async function serveCommand(options: ServeOptions) {
  try {
    const port = parseInt(options.port, 10);
    const servePath = path.resolve(options.dir);

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

    // Serve static files
    app.use(express.static(servePath));

    // SPA fallback - serve index.html for any unmatched routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(servePath, 'index.html'));
    });

    const server = app.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.log(chalk.green('✅ Documentation server started!'));
      console.log(chalk.blue(`   📖 Open ${url} in your browser`));
      console.log(chalk.gray(`   📁 Serving from: ${servePath}`));
      console.log(chalk.gray('   Press Ctrl+C to stop'));

      if (options.open) {
        open(url).catch(err => {
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