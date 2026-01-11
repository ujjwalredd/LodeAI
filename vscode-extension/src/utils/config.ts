import * as vscode from 'vscode';

export class Config {
    private static instance: Config;
    private context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    static initialize(context: vscode.ExtensionContext): void {
        Config.instance = new Config(context);
    }

    static getInstance(): Config {
        if (!Config.instance) {
            throw new Error('Config not initialized. Call initialize() first.');
        }
        return Config.instance;
    }

    getClaudeApiKey(): string {
        const config = vscode.workspace.getConfiguration('lodeai');
        const apiKey = config.get<string>('claudeApiKey') || process.env.CLAUDE_API_KEY || 'API_KEY';
        
        if (!apiKey || apiKey === 'YOUR_CLAUDE_API_KEY_HERE') {
            throw new Error('Claude API key not configured. Please replace YOUR_CLAUDE_API_KEY_HERE with your actual API key in config.ts');
        }
        
        return apiKey;
    }

    // Keep for backward compatibility, but now returns Claude key
    getOpenAIApiKey(): string {
        return this.getClaudeApiKey();
    }

    getSupabaseConfig(): { url: string; key: string } {
        const config = vscode.workspace.getConfiguration('lodeai');
        
        return {
            url: config.get<string>('supabaseUrl') || 'URL',
            key: config.get<string>('supabaseKey') || 'KEY'
        };
    }

    getMaxRetryAttempts(): number {
        const config = vscode.workspace.getConfiguration('lodeai');
        return config.get<number>('maxRetryAttempts') || 2;
    }

    getCommandTimeout(): number {
        const config = vscode.workspace.getConfiguration('lodeai');
        return config.get<number>('commandTimeout') || 30000; // 30 seconds
    }

    shouldUseAIPlanning(): boolean {
        const config = vscode.workspace.getConfiguration('lodeai');
        return config.get<boolean>('useAIPlanning') || true;
    }
}
