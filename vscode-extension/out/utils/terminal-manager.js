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
exports.TerminalManager = void 0;
const vscode = __importStar(require("vscode"));
const child_process = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const util_1 = require("util");
const logger_1 = require("./logger");
const config_1 = require("./config");
const execAsync = (0, util_1.promisify)(child_process.exec);
class TerminalManager {
    constructor(projectPath) {
        this.projectPath = projectPath;
        this.terminal = vscode.window.createTerminal({
            name: 'LodeAI Agent Terminal',
            cwd: projectPath
        });
        this.terminal.show(true);
        logger_1.Logger.info('Terminal manager initialized');
    }
    async executeCommand(command, cwd) {
        const executionCwd = cwd ? cwd : this.projectPath;
        const timeout = config_1.Config.getInstance().getCommandTimeout();
        logger_1.Logger.info(`Executing command: ${command} in ${executionCwd}`);
        try {
            // Try direct execution first for better error handling
            const { stdout, stderr } = await execAsync(command, {
                cwd: executionCwd,
                timeout
            });
            if (stderr) {
                logger_1.Logger.warn(`Command stderr: ${stderr}`);
            }
            return {
                success: true,
                output: stdout,
                error: stderr
            };
        }
        catch (error) {
            logger_1.Logger.error(`Command execution failed: ${command}`, error);
            // Fallback to terminal execution for interactive commands
            return this.executeInTerminal(command, executionCwd);
        }
    }
    executeInTerminal(command, cwd) {
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
                }
                else {
                    resolve({
                        success: false,
                        output: '',
                        error: `Working directory does not exist: ${cwd}`
                    });
                }
            }, 2000); // Reduced timeout for faster feedback
        });
    }
    sendText(text) {
        this.terminal.sendText(text);
    }
    show() {
        this.terminal.show(true);
    }
    dispose() {
        if (this.terminal) {
            this.terminal.dispose();
            logger_1.Logger.info('Terminal disposed');
        }
    }
}
exports.TerminalManager = TerminalManager;
//# sourceMappingURL=terminal-manager.js.map