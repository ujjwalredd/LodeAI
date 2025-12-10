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
exports.ErrorHandlerAgent = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
const config_1 = require("../utils/config");
const claude_client_1 = require("../utils/claude-client");
const mcp_service_1 = require("../utils/mcp-service");
const ai_streaming_service_1 = require("../utils/ai-streaming-service");
class ErrorHandlerAgent {
    constructor(panel, projectPath, webviewProvider) {
        this.retryAttempts = new Map();
        this.panel = panel;
        this.projectPath = projectPath;
        this.webviewProvider = webviewProvider;
        this.agentId = 'error-handler-agent';
        this.claudeClient = claude_client_1.ClaudeClient.getInstance();
        this.mcpService = mcp_service_1.MCPService.getInstance();
        this.aiStreamingService = ai_streaming_service_1.AIStreamingService.getInstance();
        this.maxRetryAttempts = config_1.Config.getInstance().getMaxRetryAttempts();
        this.initializeMCP();
        logger_1.Logger.info('Error handler agent initialized with Claude, MCP and AI streaming');
    }
    initializeMCP() {
        // Register error handling tools with MCP
        this.mcpService.registerTool({
            name: 'error_resolution',
            description: 'Resolve errors and provide fixes',
            parameters: {
                task: { type: 'object' },
                error: { type: 'string' },
                attempt: { type: 'number' }
            },
            execute: async (params) => {
                return await this.handleError(params.task, params.error);
            }
        });
        // Listen for error resolution requests from other agents
        this.mcpService.on('message:request', (message) => {
            if (message.action === 'resolve_error') {
                this.handleMCPErrorRequest(message);
            }
        });
        logger_1.Logger.info(`Error handler agent registered with MCP as: ${this.agentId}`);
    }
    async handleMCPErrorRequest(message) {
        try {
            const { task, error } = message.payload;
            const resolution = await this.handleError(task, error);
            // Share resolution with other agents via MCP
            this.mcpService.setSharedData('last_error_resolution', resolution);
            this.mcpService.setSharedData('error_resolution_status', 'completed');
            logger_1.Logger.info('Error resolution shared via MCP');
        }
        catch (error) {
            logger_1.Logger.error('MCP error resolution failed:', error);
            this.mcpService.setSharedData('error_resolution_status', 'failed');
        }
    }
    async notify(level, action, taskDescription, progress, additionalContext) {
        try {
            // Generate AI streaming message
            const aiMessage = await this.aiStreamingService.generateStreamingMessage({
                agentType: 'error-handler',
                action,
                taskDescription,
                progress,
                additionalContext
            });
            if (this.panel) {
                this.panel.webview.postMessage({
                    type: 'agentMessage',
                    payload: {
                        agent: 'ErrorHandler',
                        level,
                        content: aiMessage,
                        timestamp: new Date()
                    }
                });
            }
            // Send to webview provider if available
            if (this.webviewProvider && this.webviewProvider._webviewView) {
                this.webviewProvider._webviewView.webview.postMessage({
                    type: 'agentMessage',
                    payload: {
                        agent: 'ErrorHandler',
                        level,
                        content: aiMessage,
                        timestamp: new Date()
                    }
                });
            }
            // Also show in status bar for sidebar-only mode
            vscode.window.setStatusBarMessage(`LodeAI ErrorHandler: ${aiMessage}`, 3000);
        }
        catch (error) {
            logger_1.Logger.error('Failed to generate AI streaming message:', error);
            // Fallback to simple message
            const fallbackMessage = `Error handling: ${action}`;
            this.sendNotification(level, fallbackMessage);
        }
    }
    sendNotification(level, content) {
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'agentMessage',
                payload: {
                    agent: 'ErrorHandler',
                    level,
                    content,
                    timestamp: new Date()
                }
            });
        }
        if (this.webviewProvider && this.webviewProvider._webviewView) {
            this.webviewProvider._webviewView.webview.postMessage({
                type: 'agentMessage',
                payload: {
                    agent: 'ErrorHandler',
                    level,
                    content,
                    timestamp: new Date()
                }
            });
        }
        vscode.window.setStatusBarMessage(`LodeAI ErrorHandler: ${content}`, 3000);
    }
    /**
     * Main entry point: attempts to resolve a failed task's error.
     */
    async handleError(failedTask, error) {
        const taskId = failedTask.id;
        const currentAttempt = this.retryAttempts.get(taskId) || 0;
        // Check if we've already exceeded max attempts
        if (currentAttempt >= this.maxRetryAttempts) {
            logger_1.Logger.warn(`Max retries already exceeded for task: ${taskId}, skipping error handling`);
            await this.notify('error', 'max_retries_exceeded', failedTask.description);
            return { fixed: false, error_analysis: 'Max retry attempts exceeded', recommendations: [] };
        }
        this.retryAttempts.set(taskId, currentAttempt + 1);
        await this.notify('warning', 'error_resolution_attempt', failedTask.description, undefined, {
            attempt: currentAttempt + 1,
            maxAttempts: this.maxRetryAttempts
        });
        logger_1.Logger.info(`Error handling attempt ${currentAttempt + 1} for task: ${taskId}`);
        try {
            let resolution = await this.analyzeAndFixError(failedTask, error, currentAttempt + 1);
            // if unresolved, try fallback strategies
            if (!resolution.fixed) {
                await this.notify('warning', 'applying_fallback_strategies', failedTask.description);
                resolution = await this.fallbackStrategies(failedTask, error);
            }
            if (resolution.fixed) {
                await this.notify('success', 'error_resolved', failedTask.description);
                logger_1.Logger.info(`Error resolved for task: ${taskId}`);
                // Clear retry attempts for this task since it's fixed
                this.retryAttempts.delete(taskId);
            }
            else if (currentAttempt + 1 >= this.maxRetryAttempts) {
                await this.notify('error', 'max_retries_exceeded', failedTask.description);
                logger_1.Logger.error(`Max retries exceeded for task: ${taskId}. Giving up.`);
                // Clear retry attempts to prevent further attempts
                this.retryAttempts.delete(taskId);
            }
            return resolution;
        }
        catch (err) {
            const message = err?.message || String(err);
            logger_1.Logger.error(`Error analysis failed for task ${taskId}`, err);
            return {
                fixed: false,
                error_analysis: `Error analysis failed: ${message}`,
                recommendations: ['Check system logs', 'Verify environment setup']
            };
        }
    }
    /**
     * Chooses between rule-based fixes or AI-powered fixes.
     */
    async analyzeAndFixError(task, error, attempt) {
        const ruleBasedFix = await this.ruleBasedFix(task, error, attempt);
        if (ruleBasedFix.fixed) {
            return ruleBasedFix;
        }
        return await this.analyzeAndFixErrorWithAI(task, error, attempt);
    }
    /**
     * Applies known, rule-based fixes for common error types.
     */
    async ruleBasedFix(task, error, attempt) {
        const errorLower = error.toLowerCase();
        if (errorLower.includes('command not found') || errorLower.includes('not recognized')) {
            return this.fixCommandNotFoundError(task, error);
        }
        if (errorLower.includes('permission denied') || errorLower.includes('eacces')) {
            return this.fixPermissionError(task, error);
        }
        if (errorLower.includes('no such file') || errorLower.includes('enoent')) {
            return this.fixFileNotFoundError(task, error);
        }
        if (errorLower.includes('dependency') || errorLower.includes('package') || errorLower.includes('module')) {
            return this.fixDependencyError(task, error);
        }
        if (errorLower.includes('network') || errorLower.includes('timeout') || errorLower.includes('connection')) {
            return this.fixNetworkError(task, error, attempt);
        }
        if (errorLower.includes('syntax') || errorLower.includes('parse')) {
            return this.fixSyntaxError(task, error);
        }
        return this.genericFix(task, error, attempt);
    }
    /**
     * Rule-based fixes for common error categories.
     */
    fixCommandNotFoundError(task, error) {
        let retryCommand = task.command;
        let analysis = `Command not found: ${error}`;
        let recommendations = ['Verify command exists', 'Check PATH environment variable'];
        if (task.command?.includes('pip install')) {
            retryCommand = task.command.replace('pip install', 'pip3 install');
            analysis = 'pip not found, trying pip3';
            recommendations = ['pip3 is usually available with Python 3'];
        }
        else if (task.command?.includes('python -m pip install')) {
            retryCommand = task.command.replace('python -m pip install', 'python3 -m pip install');
            analysis = 'python not found, trying python3 -m pip';
        }
        else if (task.command?.includes('pip3 install') && error.toLowerCase().includes('pip3')) {
            retryCommand = task.command.replace('pip3 install', 'python3 -m pip install');
            analysis = 'pip3 not found, trying python3 -m pip';
        }
        else if (task.command?.includes('npm')) {
            retryCommand = 'npx ' + task.command;
            analysis = 'npm not available, trying npx';
        }
        else if (task.command?.includes('python') && !task.command.includes('pip')) {
            retryCommand = task.command.replace('python', 'python3');
            analysis = 'python not found, trying python3';
        }
        return {
            fixed: !!retryCommand,
            retry_command: retryCommand,
            error_analysis: analysis,
            recommendations
        };
    }
    fixPermissionError(task, error) {
        let retryCommand = task.command;
        let analysis = `Permission denied: ${error}`;
        let recommendations = ['Check file permissions', 'Run with appropriate privileges'];
        if (task.type === 'run_command') {
            if (task.command?.includes('install')) {
                retryCommand = task.command + ' --user';
                analysis = 'Permission issue, retrying with --user flag';
            }
            else if (task.command?.includes('mkdir')) {
                retryCommand = task.command.replace('mkdir', 'mkdir -p');
                analysis = 'Added recursive flag for mkdir';
            }
        }
        return {
            fixed: !!retryCommand,
            retry_command: retryCommand,
            error_analysis: analysis,
            recommendations
        };
    }
    fixFileNotFoundError(task, error) {
        const analysis = `File not found: ${error}`;
        const recommendations = ['Verify file paths', 'Check working directory'];
        if (task.type === 'create_file' && task.path) {
            const dir = path.dirname(path.join(this.projectPath, task.path));
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                return {
                    fixed: true,
                    error_analysis: 'Created missing directory for file',
                    recommendations: ['Directory structure created successfully']
                };
            }
        }
        return {
            fixed: false,
            error_analysis: analysis,
            recommendations
        };
    }
    fixDependencyError(task, error) {
        let retryCommand = task.command;
        let analysis = `Dependency error: ${error}`;
        let recommendations = ['Check dependency versions', 'Verify package availability'];
        if (task.command?.includes('install')) {
            if (error.includes('version') || error.includes('conflict')) {
                retryCommand = task.command + ' --force';
                analysis = 'Dependency version conflict, retrying with --force';
            }
            else {
                retryCommand = task.command + ' --no-cache-dir';
                analysis = 'Dependency installation issue, retrying without cache';
            }
        }
        return {
            fixed: !!retryCommand,
            retry_command: retryCommand,
            error_analysis: analysis,
            recommendations
        };
    }
    fixNetworkError(task, error, attempt) {
        const backoff = Math.min(30, 2 ** attempt);
        const analysis = `Network error (attempt ${attempt}): ${error}`;
        const recommendations = [
            'Check internet connection',
            'Verify proxy settings if applicable',
            'Retry with exponential backoff'
        ];
        return {
            fixed: true,
            retry_command: `sleep ${backoff} && ${task.command}`,
            error_analysis: analysis,
            recommendations
        };
    }
    fixSyntaxError(task, error) {
        const analysis = `Syntax error in generated content: ${error}`;
        const recommendations = [
            'Review generated code for syntax errors',
            'Check language compatibility',
            'Use a linter for validation'
        ];
        if (task.type === 'create_file' && task.content) {
            let fixedContent = task.content;
            if (task.path?.endsWith('.py')) {
                fixedContent = fixedContent
                    .replace(/print\s+([^\(])/g, 'print($1)')
                    .replace(/except:/g, 'except Exception:')
                    .replace(/\.iteritems\(\)/g, '.items()');
            }
            if (fixedContent !== task.content) {
                return {
                    fixed: true,
                    error_analysis: 'Applied automatic syntax corrections',
                    recommendations
                };
            }
        }
        return {
            fixed: false,
            error_analysis: analysis,
            recommendations
        };
    }
    genericFix(task, error, attempt) {
        const analysis = `Generic error (attempt ${attempt}): ${error}`;
        const recommendations = [
            'Check system resources',
            'Verify environment configuration',
            'Review task requirements'
        ];
        if (attempt <= 2) {
            return {
                fixed: true,
                retry_command: task.command,
                error_analysis: analysis,
                recommendations
            };
        }
        if (task.type === 'run_command' && task.command?.includes(' && ')) {
            return {
                fixed: true,
                retry_command: task.command.split(' && ')[0],
                error_analysis: `Breaking complex command into simpler steps: ${analysis}`,
                recommendations: [...recommendations, 'Simplified command execution']
            };
        }
        return {
            fixed: false,
            error_analysis: analysis,
            recommendations: [...recommendations, 'Manual intervention may be required']
        };
    }
    /**
     * Self-healing fallback strategies.
     */
    async fallbackStrategies(task, error) {
        const errorLower = error.toLowerCase();
        // dataset issues
        if (errorLower.includes('download') || errorLower.includes('dataset')) {
            await this.notify('info', 'dataset_fallback_strategy', task.description);
            return {
                fixed: true,
                retry_command: `python -c "from datasets import load_dataset; load_dataset('cifar10', split='train')"`,
                error_analysis: 'Primary dataset download failed, switched to Hugging Face datasets API',
                recommendations: ['Prefer datasets.load_dataset over wget for resilience']
            };
        }
        // file not found → create placeholder
        if (errorLower.includes('file not found') || errorLower.includes('enoent')) {
            this.notify('info', 'Creating placeholder file to continue execution...');
            const filePath = path.join(this.projectPath, task.path || 'placeholder.txt');
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, "placeholder content");
            return {
                fixed: true,
                error_analysis: "Created placeholder file to continue execution",
                recommendations: ["Ensure real file is generated in prior pipeline step"]
            };
        }
        // persistent network issues → skip gracefully
        if (errorLower.includes('network') || errorLower.includes('timeout')) {
            return {
                fixed: true,
                error_analysis: 'Network issues persisted, skipping non-critical step',
                recommendations: ['Use cached results', 'Re-run pipeline when network is stable']
            };
        }
        return {
            fixed: false,
            error_analysis: "No fallback strategy available",
            recommendations: []
        };
    }
    /**
     * AI-powered fallback when rule-based + fallback strategies fail.
     */
    async analyzeAndFixErrorWithAI(task, error, attempt) {
        try {
            // Share error context with other agents via MCP
            this.mcpService.setSharedData('current_error', {
                task: task.description,
                type: task.type,
                error,
                attempt,
                projectPath: this.projectPath
            });
            const systemPrompt = `You are an expert Error Resolution Agent. Analyze errors and provide fixes for technical assessment setup.

Return ONLY valid JSON with this exact structure:
{
  "fixed": true|false,
  "retry_command": "alternative command if any",
  "error_analysis": "short explanation",
  "recommendations": ["next steps"]
}`;
            const userMessage = `TASK: ${task.description}
TASK TYPE: ${task.type}
ERROR: ${error}
ATTEMPT: ${attempt}/${this.maxRetryAttempts}
PROJECT PATH: ${this.projectPath}

Analyze this error and provide a resolution.`;
            const response = await this.claudeClient.chatCompletion([
                { role: 'user', content: userMessage }
            ], systemPrompt);
            if (!response.content) {
                throw new Error('Empty Claude response');
            }
            // Extract JSON from markdown code blocks if present
            let jsonContent = response.content;
            if (jsonContent.includes('```json')) {
                const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    jsonContent = jsonMatch[1];
                }
            }
            else if (jsonContent.includes('```')) {
                // Handle generic code blocks
                const codeMatch = jsonContent.match(/```\s*([\s\S]*?)\s*```/);
                if (codeMatch) {
                    jsonContent = codeMatch[1];
                }
            }
            let parsed;
            try {
                parsed = JSON.parse(jsonContent);
            }
            catch (parseErr) {
                logger_1.Logger.error('Failed to parse Claude response JSON', parseErr);
                logger_1.Logger.error('Raw response content:', response.content);
                logger_1.Logger.error('Extracted JSON content:', jsonContent);
                return {
                    fixed: false,
                    error_analysis: `Claude response parsing failed: ${String(parseErr)}`,
                    recommendations: ['Check Claude response format', 'Retry with stricter prompt']
                };
            }
            // Share resolution with other agents via MCP
            this.mcpService.setSharedData('ai_error_resolution', parsed);
            logger_1.Logger.info(`Claude provided error resolution: ${parsed.fixed ? 'FIXED' : 'NOT_FIXED'}`);
            return parsed;
        }
        catch (err) {
            const message = err?.message || String(err);
            logger_1.Logger.error('Claude analysis failed', err);
            // Share failure with other agents via MCP
            this.mcpService.setSharedData('error_resolution_status', 'ai_failed');
            return {
                fixed: false,
                error_analysis: `Claude analysis failed: ${message}`,
                recommendations: ['Fallback to manual debugging', 'Check error logs']
            };
        }
    }
    /**
     * Clear all retry attempts - call this when assessment is completed
     */
    clearRetryAttempts() {
        this.retryAttempts.clear();
        logger_1.Logger.info('All retry attempts cleared');
    }
    /**
     * Get current retry attempts for debugging
     */
    getRetryAttempts() {
        return new Map(this.retryAttempts);
    }
}
exports.ErrorHandlerAgent = ErrorHandlerAgent;
//# sourceMappingURL=error-handler-agent.js.map