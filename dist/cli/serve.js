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
function normalizeBasePath(basePath) {
    if (!basePath)
        return '';
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
async function serveCommand(options) {
    try {
        const port = parseInt(options.port, 10);
        const servePath = path_1.default.resolve(options.dir);
        const normalizedBasePath = normalizeBasePath(options.basePath);
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
        // Helper function to inject base path into HTML
        const getIndexHtmlWithBasePath = async () => {
            const indexPath = path_1.default.join(servePath, 'index.html');
            let html = await fs_1.promises.readFile(indexPath, 'utf8');
            if (!normalizedBasePath) {
                return html;
            }
            // Inject base path into HTML
            html = html.replace('<head>', `<head><script>window.__BASE_PATH__ = "${normalizedBasePath}";</script>`);
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
                }
                catch (error) {
                    console.error('Error serving index.html:', error);
                    res.status(500).send('Internal Server Error');
                }
            });
            app.get(`${normalizedBasePath}/`, async (req, res) => {
                try {
                    const html = await getIndexHtmlWithBasePath();
                    res.send(html);
                }
                catch (error) {
                    console.error('Error serving index.html:', error);
                    res.status(500).send('Internal Server Error');
                }
            });
            // Serve static files with base path, excluding index.html
            app.use(normalizedBasePath, express_1.default.static(servePath, { index: false }));
        }
        else {
            app.use(express_1.default.static(servePath));
        }
        // SPA fallback - serve index.html for any unmatched routes (but not for file requests)
        app.get('*', async (req, res) => {
            try {
                // Check if this is a file request (has file extension)
                const hasFileExtension = path_1.default.extname(req.path) !== '';
                if (hasFileExtension) {
                    // For file requests that weren't caught by static middleware, return 404
                    return res.status(404).send('File not found');
                }
                // For SPA routes (no file extension), serve index.html with base path
                const html = await getIndexHtmlWithBasePath();
                res.send(html);
            }
            catch (error) {
                console.error('Error serving file:', error);
                res.status(500).send('Internal Server Error');
            }
        });
        const server = app.listen(port, () => {
            const baseUrl = `http://localhost:${port}`;
            const fullUrl = normalizedBasePath ? `${baseUrl}${normalizedBasePath}` : baseUrl;
            console.log(chalk_1.default.green('✅ Documentation server started!'));
            console.log(chalk_1.default.blue(`   📖 Open ${fullUrl} in your browser`));
            console.log(chalk_1.default.gray(`   📁 Serving from: ${servePath}`));
            if (normalizedBasePath) {
                console.log(chalk_1.default.gray(`   🔗 Base path: ${normalizedBasePath}`));
            }
            console.log(chalk_1.default.gray('   Press Ctrl+C to stop'));
            if (options.open) {
                (0, open_1.default)(fullUrl).catch(err => {
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