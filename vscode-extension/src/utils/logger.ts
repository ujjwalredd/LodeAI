import * as vscode from 'vscode';

export class Logger {
    private static outputChannel: vscode.OutputChannel;

    static initialize(): void {
        if (!Logger.outputChannel) {
            Logger.outputChannel = vscode.window.createOutputChannel('LodeAI');
        }
    }

    static info(message: string): void {
        const timestamp = new Date().toISOString();
        Logger.outputChannel.appendLine(`[INFO ${timestamp}] ${message}`);
        console.log(`[LodeAI INFO] ${message}`);
    }

    static error(message: string, error?: any): void {
        const timestamp = new Date().toISOString();
        const errorMessage = error ? `${message}: ${error}` : message;
        Logger.outputChannel.appendLine(`[ERROR ${timestamp}] ${errorMessage}`);
        console.error(`[LodeAI ERROR] ${message}`, error);
    }

    static warn(message: string, error?: any): void {
        const timestamp = new Date().toISOString();
        const warnMessage = error ? `${message}: ${error}` : message;
        Logger.outputChannel.appendLine(`[WARN ${timestamp}] ${warnMessage}`);
        console.warn(`[LodeAI WARN] ${message}`, error);
    }

    static show(): void {
        Logger.outputChannel.show();
    }
}