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
            url: config.get<string>('supabaseUrl') || 'https://sgoplnmetluhnqiwigxs.supabase.co',
            key: config.get<string>('supabaseKey') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb3Bsbm1ldGx1aG5xaXdpZ3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjI0NTUsImV4cCI6MjA3MzY5ODQ1NX0.Rd9b2df0ME8zbNGFsJqH1xoRxW1NW8ch-lBhlRk8h6w'
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
