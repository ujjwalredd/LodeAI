import * as vscode from 'vscode';
import { DockerManager } from './docker-manager';
import { Logger } from './logger';

export class TerminalDockerIntegration {
    private dockerManager: DockerManager;
    private terminals: Map<string, vscode.Terminal> = new Map();
    private candidateEmail: string = '';

    constructor() {
        this.dockerManager = DockerManager.getInstance();
    }

    /**
     * Initialize Docker terminal for candidate
     */
    public async initializeDockerTerminal(candidateEmail: string): Promise<void> {
        try {
            this.candidateEmail = candidateEmail;
            Logger.info(`Initializing Docker terminal for ${candidateEmail}`);

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

            Logger.info(`Docker terminal initialized for ${candidateEmail}`);

        } catch (error) {
            Logger.error('Failed to initialize Docker terminal:', error);
            throw error;
        }
    }

    /**
     * Get Docker shell command for terminal
     */
    private getDockerShellCommand(): string {
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
    private async setupTerminalEnvironment(terminal: vscode.Terminal): Promise<void> {
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

        } catch (error) {
            Logger.error('Failed to setup terminal environment:', error);
            throw error;
        }
    }

    /**
     * Execute command in Docker container
     */
    public async executeCommand(command: string): Promise<string> {
        try {
            const result = await this.dockerManager.executeInContainer(
                this.candidateEmail,
                command
            );

            return result.stdout;

        } catch (error) {
            Logger.error('Failed to execute command:', error);
            throw error;
        }
    }

    /**
     * Run tests in Docker container
     */
    public async runTests(): Promise<any> {
        try {
            Logger.info(`Running tests for ${this.candidateEmail}`);
            
            const testResults = await this.dockerManager.runTests(this.candidateEmail);
            
            // Display results in terminal
            const terminal = this.terminals.get(this.candidateEmail);
            if (terminal) {
                terminal.sendText('echo "🧪 Test Results:"');
                terminal.sendText(`echo "${JSON.stringify(testResults, null, 2)}"`);
            }

            return testResults;

        } catch (error) {
            Logger.error('Failed to run tests:', error);
            throw error;
        }
    }

    /**
     * Get container status
     */
    public async getContainerStatus(): Promise<any> {
        try {
            return await this.dockerManager.getContainerStatus(this.candidateEmail);
        } catch (error) {
            Logger.error('Failed to get container status:', error);
            throw error;
        }
    }

    /**
     * Show container logs
     */
    public async showContainerLogs(): Promise<void> {
        try {
            const terminal = this.terminals.get(this.candidateEmail);
            if (!terminal) {
                throw new Error('No terminal found for candidate');
            }

            terminal.sendText('echo "📋 Container Logs:"');
            terminal.sendText(`docker logs lodeai-assessment-${this.candidateEmail.replace('@', '-').replace('.', '-')}`);

        } catch (error) {
            Logger.error('Failed to show container logs:', error);
            throw error;
        }
    }

    /**
     * Restart container
     */
    public async restartContainer(): Promise<void> {
        try {
            const terminal = this.terminals.get(this.candidateEmail);
            if (!terminal) {
                throw new Error('No terminal found for candidate');
            }

            terminal.sendText('echo "🔄 Restarting container..."');
            terminal.sendText(`docker restart lodeai-assessment-${this.candidateEmail.replace('@', '-').replace('.', '-')}`);

        } catch (error) {
            Logger.error('Failed to restart container:', error);
            throw error;
        }
    }

    /**
     * Clean up terminal and container
     */
    public async cleanup(): Promise<void> {
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

            Logger.info('Docker terminal cleanup completed');

        } catch (error) {
            Logger.error('Failed to cleanup Docker terminal:', error);
            throw error;
        }
    }

    /**
     * Get all running terminals
     */
    public getRunningTerminals(): string[] {
        return Array.from(this.terminals.keys());
    }

    /**
     * Switch to candidate terminal
     */
    public switchToTerminal(candidateEmail: string): void {
        const terminal = this.terminals.get(candidateEmail);
        if (terminal) {
            terminal.show();
        }
    }
}
