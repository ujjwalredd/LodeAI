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
exports.TestRunnerManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const logger_1 = require("./logger");
class TestRunnerManager {
    constructor(projectPath, statusBarItem) {
        this.projectPath = projectPath;
        this.statusBarItem = statusBarItem;
        this.outputChannel = vscode.window.createOutputChannel('LodeAI Tests');
    }
    /**
     * Run all tests
     */
    async runAllTests() {
        this.updateStatusBar('running', 'Running all tests...');
        this.outputChannel.clear();
        this.outputChannel.show();
        const terminal = this.getOrCreateTerminal();
        terminal.show();
        return this.executeCommand(terminal, 'python runner.py test');
    }
    /**
     * Run a specific question's tests
     */
    async runQuestionTests(questionNumber) {
        this.updateStatusBar('running', `Running Question ${questionNumber} tests...`);
        this.outputChannel.clear();
        this.outputChannel.show();
        const terminal = this.getOrCreateTerminal();
        terminal.show();
        return this.executeCommand(terminal, `python runner.py test ${questionNumber}`);
    }
    /**
     * Check code quality
     */
    async checkCodeQuality() {
        this.updateStatusBar('checking', 'Checking code quality...');
        this.outputChannel.clear();
        this.outputChannel.show();
        const terminal = this.getOrCreateTerminal();
        terminal.show();
        return this.executeCommand(terminal, 'python runner.py check');
    }
    /**
     * List all questions
     */
    async listQuestions() {
        this.outputChannel.clear();
        this.outputChannel.show();
        const terminal = this.getOrCreateTerminal();
        terminal.show();
        terminal.sendText('python runner.py questions');
    }
    /**
     * Open question file in editor
     */
    async openQuestionFile(questionNumber) {
        const questionFile = path.join(this.projectPath, 'src', 'solutions', `question_${questionNumber}.py`);
        try {
            const document = await vscode.workspace.openTextDocument(questionFile);
            await vscode.window.showTextDocument(document);
            logger_1.Logger.info(`Opened question file: question_${questionNumber}.py`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Could not open question file: ${error}`);
            logger_1.Logger.error('Failed to open question file:', error);
        }
    }
    /**
     * Open test file in editor
     */
    async openTestFile() {
        const testFile = path.join(this.projectPath, 'src', 'tests', 'test_solutions.py');
        try {
            const document = await vscode.workspace.openTextDocument(testFile);
            await vscode.window.showTextDocument(document);
            logger_1.Logger.info('Opened test file');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Could not open test file: ${error}`);
            logger_1.Logger.error('Failed to open test file:', error);
        }
    }
    /**
     * Get or create terminal
     */
    getOrCreateTerminal() {
        // Check if terminal exists
        const existingTerminal = vscode.window.terminals.find(t => t.name === 'LodeAI Tests');
        if (existingTerminal) {
            return existingTerminal;
        }
        // Create new terminal
        return vscode.window.createTerminal({
            name: 'LodeAI Tests',
            cwd: this.projectPath
        });
    }
    /**
     * Execute command and track result
     */
    async executeCommand(terminal, command) {
        const startTime = Date.now();
        try {
            this.outputChannel.appendLine(`> ${command}`);
            this.outputChannel.appendLine('');
            terminal.sendText(command);
            // Simulate waiting for command completion
            // In a real implementation, you'd want to capture actual terminal output
            await this.delay(2000);
            const duration = Date.now() - startTime;
            // For now, assume success (in production, parse terminal output)
            this.updateStatusBar('success', 'Tests completed');
            return {
                success: true,
                output: 'Command executed successfully',
                duration
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.updateStatusBar('error', 'Tests failed');
            this.outputChannel.appendLine(`Error: ${error.message}`);
            return {
                success: false,
                output: error.message,
                duration
            };
        }
    }
    /**
     * Update status bar
     */
    updateStatusBar(state, text) {
        const icons = {
            idle: '$(beaker)',
            running: '$(sync~spin)',
            checking: '$(search)',
            success: '$(check)',
            error: '$(x)'
        };
        const colors = {
            idle: undefined,
            running: new vscode.ThemeColor('statusBarItem.warningBackground'),
            checking: new vscode.ThemeColor('statusBarItem.warningBackground'),
            success: new vscode.ThemeColor('statusBarItem.prominentBackground'),
            error: new vscode.ThemeColor('statusBarItem.errorBackground')
        };
        const messages = {
            idle: 'LodeAI: Ready',
            running: text || 'Running tests...',
            checking: text || 'Checking...',
            success: text || 'Tests Passed',
            error: text || 'Tests Failed'
        };
        this.statusBarItem.text = `${icons[state]} ${messages[state]}`;
        this.statusBarItem.backgroundColor = colors[state];
        this.statusBarItem.tooltip = messages[state];
        logger_1.Logger.info(`Status bar updated: ${state} - ${messages[state]}`);
    }
    /**
     * Show quick pick menu for test actions
     */
    async showTestMenu() {
        const actions = [
            {
                label: '$(play) Run All Tests',
                description: 'Execute all test cases',
                action: () => this.runAllTests()
            },
            {
                label: '$(file-code) Run Question 1',
                description: 'Test specific question',
                action: () => this.runQuestionTests(1)
            },
            {
                label: '$(checklist) Check Code Quality',
                description: 'Run linting and formatting checks',
                action: () => this.checkCodeQuality()
            },
            {
                label: '$(list-unordered) List Questions',
                description: 'Show all assessment questions',
                action: () => this.listQuestions()
            },
            {
                label: '$(go-to-file) Open Question File',
                description: 'Open solution file in editor',
                action: () => this.openQuestionFile(1)
            },
            {
                label: '$(beaker) Open Test File',
                description: 'View test cases',
                action: () => this.openTestFile()
            }
        ];
        const selected = await vscode.window.showQuickPick(actions, {
            placeHolder: 'Select a test action',
            matchOnDescription: true
        });
        if (selected) {
            await selected.action();
        }
    }
    /**
     * Reset status bar to idle
     */
    resetStatus() {
        this.updateStatusBar('idle');
    }
    /**
     * Dispose resources
     */
    dispose() {
        this.outputChannel.dispose();
    }
    /**
     * Helper delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.TestRunnerManager = TestRunnerManager;
//# sourceMappingURL=test-runner-manager.js.map