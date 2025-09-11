#!/usr/bin/env node

import { Command } from 'commander';
import { generateCommand } from './generate';
import { serveCommand } from './serve';
import chalk from 'chalk';

const program = new Command();

program
  .name('dataform-docs')
  .description('Beautiful documentation generator for Dataform projects')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate documentation for a Dataform project')
  .option('-p, --project <path>', 'Path to Dataform project', process.cwd())
  .option('-o, --output <path>', 'Output directory', './dataform-docs')
  .option('-b, --base-path <path>', 'Base path for serving the documentation (e.g., /dataform/docs/)')
  .option('--no-compile', 'Skip SQL compilation')
  .action(generateCommand);

program
  .command('serve')
  .description('Serve the generated documentation')
  .option('-p, --port <number>', 'Port to serve on', '4200')
  .option('-d, --dir <path>', 'Directory to serve', './dataform-docs')
  .option('--open', 'Open browser automatically')
  .action(serveCommand);

program.parse();

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:', promise, 'reason:', reason));
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:', error));
  process.exit(1);
});