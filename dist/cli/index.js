#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const generate_1 = require("./generate");
const serve_1 = require("./serve");
const chalk_1 = __importDefault(require("chalk"));
const program = new commander_1.Command();
program
    .name('dataform-docs')
    .description('Beautiful documentation generator for Dataform projects')
    .version('1.0.0');
program
    .command('generate')
    .description('Generate documentation for a Dataform project')
    .option('-p, --project <path>', 'Path to Dataform project', process.cwd())
    .option('-o, --output <path>', 'Output directory', './dataform-docs')
    .option('--no-compile', 'Skip SQL compilation')
    .action(generate_1.generateCommand);
program
    .command('serve')
    .description('Serve the generated documentation')
    .option('-p, --port <number>', 'Port to serve on', '8080')
    .option('-d, --dir <path>', 'Directory to serve', './dataform-docs')
    .option('--open', 'Open browser automatically')
    .action(serve_1.serveCommand);
program.parse();
process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk_1.default.red('Unhandled Rejection at:', promise, 'reason:', reason));
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error(chalk_1.default.red('Uncaught Exception:', error));
    process.exit(1);
});
//# sourceMappingURL=index.js.map