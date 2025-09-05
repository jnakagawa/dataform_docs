"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serveCommand = serveCommand;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const chalk_1 = __importDefault(require("chalk"));
const open_1 = __importDefault(require("open"));
async function serveCommand(options) {
    try {
        const port = parseInt(options.port, 10);
        const servePath = path_1.default.resolve(options.dir);
        // Verify directory exists
        try {
            await fs_1.promises.access(servePath);
        }
        catch {
            throw new Error(`Directory not found: ${servePath}. Run "dataform-docs generate" first.`);
        }
        // Check if manifest.json exists
        try {
            await fs_1.promises.access(path_1.default.join(servePath, 'manifest.json'));
        }
        catch {
            throw new Error(`No manifest.json found in ${servePath}. Run "dataform-docs generate" first.`);
        }
        const app = (0, express_1.default)();
        // Serve static files
        app.use(express_1.default.static(servePath));
        // SPA fallback - serve index.html for any unmatched routes
        app.get('*', (req, res) => {
            res.sendFile(path_1.default.join(servePath, 'index.html'));
        });
        const server = app.listen(port, () => {
            const url = `http://localhost:${port}`;
            console.log(chalk_1.default.green('✅ Documentation server started!'));
            console.log(chalk_1.default.blue(`   📖 Open ${url} in your browser`));
            console.log(chalk_1.default.gray(`   📁 Serving from: ${servePath}`));
            console.log(chalk_1.default.gray('   Press Ctrl+C to stop'));
            if (options.open) {
                (0, open_1.default)(url).catch(err => {
                    console.warn(chalk_1.default.yellow('Could not open browser automatically:', err.message));
                });
            }
        });
        // Handle shutdown gracefully
        process.on('SIGINT', () => {
            console.log(chalk_1.default.yellow('\n🛑 Shutting down server...'));
            server.close(() => {
                console.log(chalk_1.default.green('✅ Server stopped'));
                process.exit(0);
            });
        });
        process.on('SIGTERM', () => {
            server.close(() => {
                process.exit(0);
            });
        });
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ Error starting server:'));
        console.error(chalk_1.default.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
}
//# sourceMappingURL=serve.js.map