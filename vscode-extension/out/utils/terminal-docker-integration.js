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
exports.TerminalDockerIntegration = void 0;
const vscode = __importStar(require("vscode"));
const docker_manager_1 = require("./docker-manager");
const logger_1 = require("./logger");
class TerminalDockerIntegration {
    constructor() {
        this.terminals = new Map();
        this.candidateEmail = '';
        this.dockerManager = docker_manager_1.DockerManager.getInstance();
    }
    /**
     * Initialize Docker terminal for candidate
     */
    async initializeDockerTerminal(candidateEmail) {
        try {
            this.candidateEmail = candidateEmail;
            logger_1.Logger.info(`Initializing Docker terminal for ${candidateEmail}`);
            // Create Docker terminal
            const terminal = vscode.window.createTerminal({
                name: `LodeAI Assessment - ${candidateEmail}`,
                shellPath: 'bash',
                shellArgs: ['-c', this.getDockerShellCommand()]
            });
            this.terminals.set(candidateEmail, terminal);
            terminal.show();
            // Set up terminal environment
            await this.setupTerminalEnvironment(terminal);
            logger_1.Logger.info(`Docker terminal initialized for ${candidateEmail}`);
        }
        catch (error) {
            logger_1.Logger.error('Failed to initialize Docker terminal:', error);
            throw error;
        }
    }
    /**
     * Get Docker shell command for terminal
     */
    getDockerShellCommand() {
        return `
# LodeAI Docker Assessment Environment
echo "🐳 LodeAI Docker Assessment Environment"
echo "========================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Get assessment container
CONTAINER_NAME="lodeai-assessment-${this.candidateEmail.replace('@', '-').replace('.', '-')}"
CONTAINER_ID=$(docker ps -q -f name=$CONTAINER_NAME)

if [ -z "$CONTAINER_ID" ]; then
    echo "🚀 Starting assessment container..."
    docker-compose up -d assessment
    CONTAINER_ID=$(docker ps -q -f name=$CONTAINER_NAME)
fi

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Failed to start assessment container"
    exit 1
fi

echo "✅ Assessment container running: $CONTAINER_ID"
echo ""

# Enter Docker container
echo "🔧 Entering assessment environment..."
docker exec -it $CONTAINER_ID bash
        `.trim();
    }
    /**
     * Set up terminal environment
     */
    async setupTerminalEnvironment(terminal) {
        try {
            // Wait a moment for terminal to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Send setup commands
            const setupCommands = [
                'echo "Setting up LodeAI assessment environment..."',
                'cd /assessment',
                'pwd',
                'ls -la',
                'echo "Environment ready! You can now start coding."'
            ];
            for (const command of setupCommands) {
                terminal.sendText(command);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        catch (error) {
            logger_1.Logger.error('Failed to setup terminal environment:', error);
            throw error;
        }
    }
    /**
     * Execute command in Docker container
     */
    async executeCommand(command) {
        try {
            const result = await this.dockerManager.executeInContainer(this.candidateEmail, command);
            return result.stdout;
        }
        catch (error) {
            logger_1.Logger.error('Failed to execute command:', error);
            throw error;
        }
    }
    /**
     * Run tests in Docker container
     */
    async runTests() {
        try {
            logger_1.Logger.info(`Running tests for ${this.candidateEmail}`);
            const testResults = await this.dockerManager.runTests(this.candidateEmail);
            // Display results in terminal
            const terminal = this.terminals.get(this.candidateEmail);
            if (terminal) {
                terminal.sendText('echo "🧪 Test Results:"');
                terminal.sendText(`echo "${JSON.stringify(testResults, null, 2)}"`);
            }
            return testResults;
        }
        catch (error) {
            logger_1.Logger.error('Failed to run tests:', error);
            throw error;
        }
    }
    /**
     * Get container status
     */
    async getContainerStatus() {
        try {
            return await this.dockerManager.getContainerStatus(this.candidateEmail);
        }
        catch (error) {
            logger_1.Logger.error('Failed to get container status:', error);
            throw error;
        }
    }
    /**
     * Show container logs
     */
    async showContainerLogs() {
        try {
            const terminal = this.terminals.get(this.candidateEmail);
            if (!terminal) {
                throw new Error('No terminal found for candidate');
            }
            terminal.sendText('echo "📋 Container Logs:"');
            terminal.sendText(`docker logs lodeai-assessment-${this.candidateEmail.replace('@', '-').replace('.', '-')}`);
        }
        catch (error) {
            logger_1.Logger.error('Failed to show container logs:', error);
            throw error;
        }
    }
    /**
     * Restart container
     */
    async restartContainer() {
        try {
            const terminal = this.terminals.get(this.candidateEmail);
            if (!terminal) {
                throw new Error('No terminal found for candidate');
            }
            terminal.sendText('echo "🔄 Restarting container..."');
            terminal.sendText(`docker restart lodeai-assessment-${this.candidateEmail.replace('@', '-').replace('.', '-')}`);
        }
        catch (error) {
            logger_1.Logger.error('Failed to restart container:', error);
            throw error;
        }
    }
    /**
     * Clean up terminal and container
     */
    async cleanup() {
        try {
            // Stop container
            await this.dockerManager.stopAssessmentEnvironment(this.candidateEmail);
            // Close terminal
            const terminal = this.terminals.get(this.candidateEmail);
            if (terminal) {
                terminal.dispose();
            }
            this.terminals.delete(this.candidateEmail);
            this.candidateEmail = '';
            logger_1.Logger.info('Docker terminal cleanup completed');
        }
        catch (error) {
            logger_1.Logger.error('Failed to cleanup Docker terminal:', error);
            throw error;
        }
    }
    /**
     * Get all running terminals
     */
    getRunningTerminals() {
        return Array.from(this.terminals.keys());
    }
    /**
     * Switch to candidate terminal
     */
    switchToTerminal(candidateEmail) {
        const terminal = this.terminals.get(candidateEmail);
        if (terminal) {
            terminal.show();
        }
    }
}
exports.TerminalDockerIntegration = TerminalDockerIntegration;
//# sourceMappingURL=terminal-docker-integration.js.map