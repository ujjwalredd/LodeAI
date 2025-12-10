"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const vscode = __importStar(require("vscode"));
class Config {
    constructor(context) {
        this.context = context;
    }
    static initialize(context) {
        Config.instance = new Config(context);
    }
    static getInstance() {
        if (!Config.instance) {
            throw new Error('Config not initialized. Call initialize() first.');
        }
        return Config.instance;
    }
    getClaudeApiKey() {
        const config = vscode.workspace.getConfiguration('lodeai');
        const apiKey = config.get('claudeApiKey') || process.env.CLAUDE_API_KEY || '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';
        if (!apiKey || apiKey === 'YOUR_CLAUDE_API_KEY_HERE') {
            throw new Error('Claude API key not configured. Please replace YOUR_CLAUDE_API_KEY_HERE with your actual API key in config.ts');
        }
        return apiKey;
    }
    // Keep for backward compatibility, but now returns Claude key
    getOpenAIApiKey() {
        return this.getClaudeApiKey();
    }
    getSupabaseConfig() {
        const config = vscode.workspace.getConfiguration('lodeai');
        return {
            url: config.get('supabaseUrl') || 'https://sgoplnmetluhnqiwigxs.supabase.co',
            key: config.get('supabaseKey') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb3Bsbm1ldGx1aG5xaXdpZ3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjI0NTUsImV4cCI6MjA3MzY5ODQ1NX0.Rd9b2df0ME8zbNGFsJqH1xoRxW1NW8ch-lBhlRk8h6w'
        };
    }
    getMaxRetryAttempts() {
        const config = vscode.workspace.getConfiguration('lodeai');
        return config.get('maxRetryAttempts') || 2;
    }
    getCommandTimeout() {
        const config = vscode.workspace.getConfiguration('lodeai');
        return config.get('commandTimeout') || 30000; // 30 seconds
    }
    shouldUseAIPlanning() {
        const config = vscode.workspace.getConfiguration('lodeai');
        return config.get('useAIPlanning') || true;
    }
}
exports.Config = Config;
//# sourceMappingURL=config.js.map