import { DataformModel } from '../types';
export declare class SqlxParser {
    parseProject(projectPath: string): Promise<Record<string, DataformModel>>;
    private parseFile;
    private extractConfigBlock;
    private extractJsBlock;
    private extractSqlContent;
    private extractDependencies;
    private parseConfig;
    private parseJavaScriptConfig;
    private parseConfigFallback;
}
//# sourceMappingURL=sqlx-parser.d.ts.map