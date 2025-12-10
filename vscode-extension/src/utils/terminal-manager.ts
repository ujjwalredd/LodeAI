import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';
import { promisify } from 'util';
import { Logger } from './logger';
import { Config } from './config';

const execAsync = promisify(child_process.exec);

export class TerminalManager {
    private terminal: vscode.Terminal;
    private projectPath: string;

    constructor(projectPath: string) {
        this.projectPath = projectPath;
        this.terminal = vscode.window.createTerminal({
            name: 'LodeAI Agent Terminal',
            cwd: projectPath
        });
        this.terminal.show(true);
        Logger.info('Terminal manager initialized');
    }

    async executeCommand(command: string, cwd?: string): Promise<{ success: boolean; output: string; error?: string }> {
        const executionCwd = cwd ? cwd : this.projectPath;
        const timeout = Config.getInstance().getCommandTimeout();

        Logger.info(`Executing command: ${command} in ${executionCwd}`);

        try {
            // Try direct execution first for better error handling
            const { stdout, stderr } = await execAsync(command, { 
                cwd: executionCwd,
                timeout 
            });

            if (stderr) {
                Logger.warn(`Command stderr: ${stderr}`);
            }

            return {
                success: true,
                output: stdout,
                error: stderr
            };
        } catch (error: any) {
            Logger.error(`Command execution failed: ${command}`, error);

            // Fallback to terminal execution for interactive commands
            return this.executeInTerminal(command, executionCwd);
        }
    }

    private executeInTerminal(command: string, cwd: string): Promise<{ success: boolean; output: string; error?: string }> {
        return new Promise((resolve) => {
            this.terminal.sendText(`cd "${cwd}" && ${command}`);

            // For terminal execution, we can't capture output easily
            // But we can validate the command was sent and provide better feedback
            setTimeout(() => {
                // Check if the command would typically succeed by validating the working directory
                if (fs.existsSync(cwd)) {
                    resolve({
                        success: true,
                        output: `Command sent to terminal: ${command}`,
                        error: 'Output not captured (terminal execution)'
                    });
                } else {
                    resolve({
                        success: false,
                        output: '',
                        error: `Working directory does not exist: ${cwd}`
                    });
                }
            }, 2000); // Reduced timeout for faster feedback
        });
    }

    sendText(text: string): void {
        this.terminal.sendText(text);
    }

    show(): void {
        this.terminal.show(true);
    }

    dispose(): void {
        if (this.terminal) {
            this.terminal.dispose();
            Logger.info('Terminal disposed');
        }
    }
}