import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from './logger';

const execAsync = promisify(exec);

export interface SandboxResult {
    success: boolean;
    output: string;
    error?: string;
    exitCode: number;
    executionTime: number;
    resourceUsage?: {
        memoryMB: number;
        cpuPercent: number;
    };
}

export interface SandboxConfig {
    assessmentPath: string;
    timeout: number; // in seconds
    memoryLimit: string; // e.g., "512m"
    cpuLimit: string; // e.g., "0.5"
    networkDisabled: boolean;
}

export class SandboxManager {
    private static instance: SandboxManager;
    private activeSandboxes: Map<string, string> = new Map(); // assessmentId -> containerId
    private readonly SANDBOX_IMAGE = 'lodeai-multi-language-sandbox';
    private readonly DEFAULT_TIMEOUT = 300; // 5 minutes

    private constructor() {
        // Check Docker availability asynchronously (don't block constructor)
        this.checkDockerAvailability().catch(err => {
            Logger.warn('Docker check failed in constructor:', err);
        });
    }

    static getInstance(): SandboxManager {
        if (!SandboxManager.instance) {
            SandboxManager.instance = new SandboxManager();
        }
        return SandboxManager.instance;
    }

    /**
     * Check if Docker is installed and running
     * @param showError - Whether to show error message to user (default: false)
     */
    private async checkDockerAvailability(showError: boolean = false): Promise<boolean> {
        try {
            await execAsync('docker --version');
            await execAsync('docker info');
            Logger.info('Docker is available and running');
            return true;
        } catch (error) {
            Logger.error('Docker is not available', error);
            if (showError) {
                vscode.window.showErrorMessage(
                    'Docker is not installed or not running. Please install Docker Desktop and start it to run assessments in sandbox mode.'
                );
            }
            return false;
        }
    }

    /**
     * Build the sandbox Docker image
     */
    async buildSandboxImage(): Promise<boolean> {
        Logger.info('Building sandbox Docker image...');

        // Check Docker availability first
        const dockerAvailable = await this.checkDockerAvailability(true);
        if (!dockerAvailable) {
            return false;
        }

        try {
            // Find the LodeAI project root (where docker/ folder exists)
            let projectRoot: string | undefined;

            // Try workspace folders first
            const workspaceFolders = vscode.workspace.workspaceFolders;
            Logger.info(`Workspace folders found: ${workspaceFolders?.length || 0}`);
            
            if (workspaceFolders) {
                for (const folder of workspaceFolders) {
                    Logger.info(`Checking workspace folder: ${folder.uri.fsPath}`);
                    const dockerPath = path.join(folder.uri.fsPath, 'docker', 'Dockerfile.multi-language-sandbox');
                    Logger.info(`Looking for dockerfile at: ${dockerPath}`);
                    if (fs.existsSync(dockerPath)) {
                        projectRoot = folder.uri.fsPath;
                        Logger.info(`Found project root in workspace: ${projectRoot}`);
                        break;
                    }
                }
            }

            // If not found, try to find LodeAI in parent directories
            if (!projectRoot) {
                const extensionPath = __dirname;
                let currentPath = extensionPath;
                Logger.info(`Extension path: ${extensionPath}`);
                Logger.info(`Searching for project root from extension path...`);

                // Go up directories to find project root
                for (let i = 0; i < 10; i++) { // Increased from 5 to 10 for better detection
                    currentPath = path.dirname(currentPath);
                    const dockerPath = path.join(currentPath, 'docker', 'Dockerfile.multi-language-sandbox');
                    Logger.info(`Checking path: ${currentPath}, dockerfile: ${dockerPath}`);
                    if (fs.existsSync(dockerPath)) {
                        projectRoot = currentPath;
                        Logger.info(`Found project root in parent directories: ${projectRoot}`);
                        break;
                    }
                }
            }

            // Additional fallback: try common locations
            if (!projectRoot) {
                Logger.info(`Trying additional fallback locations...`);
                const commonPaths = [
                    '/Users/ujjwalreddyks/Downloads/LodeAI', // Direct path for this user
                    path.join(os.homedir(), 'Downloads', 'LodeAI'),
                    path.join(os.homedir(), 'Documents', 'LodeAI'),
                    path.join(os.homedir(), 'LodeAI')
                ];

                for (const commonPath of commonPaths) {
                    const dockerPath = path.join(commonPath, 'docker', 'Dockerfile.multi-language-sandbox');
                    Logger.info(`Checking common path: ${commonPath}, dockerfile: ${dockerPath}`);
                    if (fs.existsSync(dockerPath)) {
                        projectRoot = commonPath;
                        Logger.info(`Found project root in common paths: ${projectRoot}`);
                        break;
                    }
                }
            }

            if (!projectRoot) {
                throw new Error('Could not find LodeAI project root with docker/ folder. Please open the LodeAI project in VSCode.');
            }

            const dockerfilePath = path.join(projectRoot, 'docker', 'Dockerfile.multi-language-sandbox');
            const requirementsPath = path.join(projectRoot, 'docker', 'python-requirements.txt');

            // Verify required files exist
            if (!fs.existsSync(dockerfilePath)) {
                throw new Error(`Dockerfile not found at: ${dockerfilePath}`);
            }
            if (!fs.existsSync(requirementsPath)) {
                throw new Error(`Requirements file not found at: ${requirementsPath}`);
            }

            const buildCommand = `docker build -t ${this.SANDBOX_IMAGE} -f "${dockerfilePath}" "${projectRoot}"`;

            Logger.info(`Building from: ${projectRoot}`);
            Logger.info(`Build command: ${buildCommand}`);

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Building sandbox environment...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Starting build...' });

                const { stderr } = await execAsync(buildCommand, {
                    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
                });

                if (stderr && !stderr.includes('WARNING')) {
                    Logger.warn('Docker build warnings:', stderr);
                }

                Logger.info('Sandbox image built successfully');
                progress.report({ increment: 100, message: 'Build complete!' });
            });

            return true;
        } catch (error: any) {
            Logger.error('Failed to build sandbox image', error);
            vscode.window.showErrorMessage(`Failed to build sandbox: ${error.message}`);
            return false;
        }
    }

    /**
     * Create and run a sandbox container for an assessment
     */
    async createSandbox(assessmentId: string, config: SandboxConfig, command?: string): Promise<string | null> {
        try {
            // Check if image exists, build if not
            const imageExists = await this.checkImageExists();
            if (!imageExists) {
                const built = await this.buildSandboxImage();
                if (!built) {
                    return null;
                }
            }

            const containerName = `lodeai-sandbox-${assessmentId}-${Date.now()}`;
            const timeout = config.timeout || this.DEFAULT_TIMEOUT;

            // Create container with security constraints
            const createCommand = [
                'docker create',
                `--name ${containerName}`,
                `--memory=${config.memoryLimit || '512m'}`,
                `--cpus=${config.cpuLimit || '0.5'}`,
                '--security-opt=no-new-privileges:true',
                '--cap-drop=ALL',
                config.networkDisabled ? '--network=none' : '',
                `--tmpfs /tmp:rw,noexec,nosuid,size=100m`,
                `--tmpfs /home/sandbox/.pytest_cache:rw,noexec,nosuid,size=50m`,
                `-v "${config.assessmentPath}:/assessment:ro"`,
                `-w /assessment`,
                `-e PYTHONPATH=/assessment`,
                `-e ASSESSMENT_TIMEOUT=${timeout}`,
                this.SANDBOX_IMAGE,
                command ? command : '' // Override CMD if provided
            ].filter(Boolean).join(' ');

            const { stdout } = await execAsync(createCommand);
            const containerId = stdout.trim();

            this.activeSandboxes.set(assessmentId, containerId);
            Logger.info(`Sandbox created: ${containerName} (${containerId})${command ? ' with custom command: ' + command : ''}`);

            return containerId;
        } catch (error: any) {
            Logger.error('Failed to create sandbox', error);
            vscode.window.showErrorMessage(`Failed to create sandbox: ${error.message}`);
            return null;
        }
    }

    /**
     * Run tests in the sandbox
     */
    async runTests(assessmentId: string, config: SandboxConfig): Promise<SandboxResult> {
        const startTime = Date.now();

        // Check Docker availability first
        const dockerAvailable = await this.checkDockerAvailability(true);
        if (!dockerAvailable) {
            return {
                success: false,
                output: '',
                error: 'Docker is not available. Please install Docker Desktop and start it.',
                exitCode: -1,
                executionTime: 0
            };
        }

        try {
            // Read assessment metadata to get the test command
            const metadataPath = path.join(config.assessmentPath, '.lodeai.json');
            let testCommand = 'python3 -m pytest -v --tb=short --timeout=120'; // default - reduced from 300 to 120 seconds
            let language = 'python';

            if (fs.existsSync(metadataPath)) {
                try {
                    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                    language = metadata.language || 'python';
                    const mainFile = metadata.main_file || 'runner.py';

                    // Determine the test command based on language and main file
                    // Include dependency installation before running tests
                    if (language === 'python') {
                        // Install Python dependencies if requirements.txt exists, then run
                        testCommand = `bash -c "[ -f requirements.txt ] && pip3 install --user -q -r requirements.txt; python3 ${mainFile}"`;
                    } else if (language === 'javascript') {
                        // Install npm dependencies if package.json exists, then run
                        testCommand = `bash -c "[ -f package.json ] && npm install --silent; node ${mainFile}"`;
                    } else if (language === 'typescript') {
                        // Install npm dependencies and compile TypeScript if needed
                        testCommand = `bash -c "[ -f package.json ] && npm install --silent; ts-node ${mainFile}"`;
                    } else if (language === 'java') {
                        // Compile Java files first, then run
                        const className = mainFile.replace('.java', '');
                        testCommand = `bash -c "javac ${mainFile} && java ${className}"`;
                    } else if (language === 'go') {
                        // Go will automatically fetch dependencies
                        testCommand = `go run ${mainFile}`;
                    } else if (language === 'cpp') {
                        // Compile C++ and run
                        testCommand = `bash -c "g++ -std=c++17 ${mainFile} -o runner && ./runner"`;
                    }

                    Logger.info(`✅ Step 6: Using test command: ${testCommand} (language: ${language})`);
                } catch (error) {
                    Logger.warn('Failed to read assessment metadata, using default command', error);
                }
            }

            // Create sandbox with custom test command
            const containerId = await this.createSandbox(assessmentId, config, testCommand);
            if (!containerId) {
                return {
                    success: false,
                    output: '',
                    error: 'Failed to create sandbox container',
                    exitCode: -1,
                    executionTime: 0
                };
            }

            // Start container
            await execAsync(`docker start ${containerId}`);
            Logger.info(`Sandbox started: ${containerId}`);

            // Wait for container to finish or timeout
            const timeout = (config.timeout || this.DEFAULT_TIMEOUT) * 1000;
            const waitCommand = `docker wait ${containerId}`;

            const { stdout: exitCodeStr } = await Promise.race([
                execAsync(waitCommand),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), timeout)
                )
            ]) as { stdout: string };

            const exitCode = parseInt(exitCodeStr.trim(), 10);

            // Get logs
            const { stdout: output, stderr: errorOutput } = await execAsync(
                `docker logs ${containerId}`
            );

            // Get resource usage stats
            const stats = await this.getContainerStats(containerId);

            const executionTime = Date.now() - startTime;

            // Cleanup
            await this.cleanupSandbox(assessmentId, containerId);

            return {
                success: exitCode === 0,
                output: output || '',
                error: errorOutput || undefined,
                exitCode,
                executionTime,
                resourceUsage: stats
            };

        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            Logger.error('Sandbox execution failed', error);

            // Cleanup on error
            const containerId = this.activeSandboxes.get(assessmentId);
            if (containerId) {
                await this.cleanupSandbox(assessmentId, containerId);
            }

            return {
                success: false,
                output: '',
                error: error.message,
                exitCode: -1,
                executionTime
            };
        }
    }

    /**
     * Get container resource usage statistics
     */
    private async getContainerStats(containerId: string): Promise<{ memoryMB: number; cpuPercent: number } | undefined> {
        try {
            const { stdout } = await execAsync(
                `docker stats ${containerId} --no-stream --format "{{.MemUsage}}|{{.CPUPerc}}"`
            );

            const [memUsage, cpuPerc] = stdout.trim().split('|');

            // Parse memory (e.g., "45.5MiB / 512MiB")
            const memMatch = memUsage.match(/([\d.]+)MiB/);
            const memoryMB = memMatch ? parseFloat(memMatch[1]) : 0;

            // Parse CPU (e.g., "12.5%")
            const cpuMatch = cpuPerc.match(/([\d.]+)%/);
            const cpuPercent = cpuMatch ? parseFloat(cpuMatch[1]) : 0;

            return { memoryMB, cpuPercent };
        } catch (error) {
            Logger.warn('Failed to get container stats', error);
            return undefined;
        }
    }

    /**
     * Check if sandbox image exists
     */
    private async checkImageExists(): Promise<boolean> {
        try {
            const { stdout } = await execAsync(`docker images -q ${this.SANDBOX_IMAGE}`);
            return stdout.trim().length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Cleanup sandbox container
     */
    async cleanupSandbox(assessmentId: string, containerId?: string): Promise<void> {
        try {
            const id = containerId || this.activeSandboxes.get(assessmentId);
            if (!id) {
                return;
            }

            // Stop container if running
            try {
                await execAsync(`docker stop ${id}`, { timeout: 5000 });
            } catch (error) {
                // Container might already be stopped
            }

            // Remove container
            await execAsync(`docker rm -f ${id}`);

            this.activeSandboxes.delete(assessmentId);
            Logger.info(`Sandbox cleaned up: ${id}`);
        } catch (error) {
            Logger.error('Failed to cleanup sandbox', error);
        }
    }

    /**
     * Cleanup all active sandboxes
     */
    async cleanupAllSandboxes(): Promise<void> {
        Logger.info('Cleaning up all active sandboxes...');

        const cleanupPromises = Array.from(this.activeSandboxes.entries()).map(
            ([assessmentId, containerId]) => this.cleanupSandbox(assessmentId, containerId)
        );

        await Promise.all(cleanupPromises);
        this.activeSandboxes.clear();

        Logger.info('All sandboxes cleaned up');
    }

    /**
     * Get status of all active sandboxes
     */
    getActiveSandboxes(): Array<{ assessmentId: string; containerId: string }> {
        return Array.from(this.activeSandboxes.entries()).map(
            ([assessmentId, containerId]) => ({ assessmentId, containerId })
        );
    }

    /**
     * Execute a single command in sandbox (for testing/debugging)
     */
    async executeCommand(
        assessmentPath: string,
        command: string,
        timeout: number = 60
    ): Promise<SandboxResult> {
        const tempAssessmentId = `temp-${Date.now()}`;
        const startTime = Date.now();

        try {
            const containerId = await this.createSandbox(tempAssessmentId, {
                assessmentPath,
                timeout,
                memoryLimit: '256m',
                cpuLimit: '0.5',
                networkDisabled: true
            });

            if (!containerId) {
                throw new Error('Failed to create sandbox');
            }

            await execAsync(`docker start ${containerId}`);

            const { stdout, stderr } = await execAsync(
                `docker exec ${containerId} ${command}`,
                { timeout: timeout * 1000 }
            );

            const executionTime = Date.now() - startTime;
            await this.cleanupSandbox(tempAssessmentId, containerId);

            return {
                success: true,
                output: stdout,
                error: stderr || undefined,
                exitCode: 0,
                executionTime
            };
        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            const containerId = this.activeSandboxes.get(tempAssessmentId);
            if (containerId) {
                await this.cleanupSandbox(tempAssessmentId, containerId);
            }

            return {
                success: false,
                output: '',
                error: error.message,
                exitCode: -1,
                executionTime
            };
        }
    }
}
