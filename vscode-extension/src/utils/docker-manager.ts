import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from './logger';

const execAsync = promisify(exec);

export interface DockerContainer {
    id: string;
    name: string;
    status: string;
    ports: string[];
    image: string;
}

export interface AssessmentEnvironment {
    containerId: string;
    assessmentType: string;
    candidateEmail: string;
    workingDirectory: string;
    testResults: any;
}

export class DockerManager {
    private static instance: DockerManager;
    private containers: Map<string, AssessmentEnvironment> = new Map();

    private constructor() {}

    public static getInstance(): DockerManager {
        if (!DockerManager.instance) {
            DockerManager.instance = new DockerManager();
        }
        return DockerManager.instance;
    }

    /**
     * Check if Docker is available and running
     */
    public async checkDockerAvailability(): Promise<boolean> {
        try {
            const { stdout } = await execAsync('docker --version');
            Logger.info(`Docker is available: ${stdout.trim()}`);
            return true;
        } catch (error) {
            Logger.error('Docker is not available:', error);
            return false;
        }
    }

    /**
     * Start assessment environment for a candidate
     */
    public async startAssessmentEnvironment(
        candidateEmail: string,
        assessmentType: string = 'fullstack'
    ): Promise<AssessmentEnvironment> {
        try {
            Logger.info(`Starting assessment environment for ${candidateEmail}`);
            
            // Create unique container name
            const containerName = `lodeai-assessment-${candidateEmail.replace('@', '-').replace('.', '-')}`;
            
            // Start Docker Compose services
            const composeCommand = `docker-compose up -d assessment`;
            await execAsync(composeCommand);
            
            // Get container ID
            const { stdout } = await execAsync(`docker ps -q -f name=${containerName}`);
            const containerId = stdout.trim();
            
            if (!containerId) {
                throw new Error('Failed to start assessment container');
            }
            
            // Set up assessment environment
            await this.setupAssessmentEnvironment(containerId, assessmentType);
            
            const environment: AssessmentEnvironment = {
                containerId,
                assessmentType,
                candidateEmail,
                workingDirectory: `/assessment`,
                testResults: null
            };
            
            this.containers.set(candidateEmail, environment);
            
            Logger.info(`Assessment environment started for ${candidateEmail}: ${containerId}`);
            return environment;
            
        } catch (error) {
            Logger.error('Failed to start assessment environment:', error);
            throw error;
        }
    }

    /**
     * Set up the assessment environment inside the container
     */
    private async setupAssessmentEnvironment(
        containerId: string,
        assessmentType: string
    ): Promise<void> {
        try {
            // Copy assessment setup scripts to container
            await execAsync(`docker cp docker/scripts/ ${containerId}:/assessment/scripts/`);
            
            // Set up environment variables
            await execAsync(`docker exec ${containerId} bash -c "export ASSESSMENT_TYPE=${assessmentType}"`);
            
            // Run assessment setup
            await execAsync(`docker exec ${containerId} bash /assessment/scripts/setup-assessments.sh`);
            
            Logger.info(`Assessment environment setup completed for container ${containerId}`);
            
        } catch (error) {
            Logger.error('Failed to setup assessment environment:', error);
            throw error;
        }
    }

    /**
     * Execute command in assessment container
     */
    public async executeInContainer(
        candidateEmail: string,
        command: string,
        workingDirectory?: string
    ): Promise<{ stdout: string; stderr: string }> {
        try {
            const environment = this.containers.get(candidateEmail);
            if (!environment) {
                throw new Error(`No assessment environment found for ${candidateEmail}`);
            }

            const workDir = workingDirectory || environment.workingDirectory;
            const fullCommand = `docker exec -w ${workDir} ${environment.containerId} ${command}`;
            
            Logger.info(`Executing in container: ${fullCommand}`);
            const result = await execAsync(fullCommand);
            
            return result;
            
        } catch (error) {
            Logger.error('Failed to execute command in container:', error);
            throw error;
        }
    }

    /**
     * Run tests in assessment container
     */
    public async runTests(candidateEmail: string): Promise<any> {
        try {
            const environment = this.containers.get(candidateEmail);
            if (!environment) {
                throw new Error(`No assessment environment found for ${candidateEmail}`);
            }

            Logger.info(`Running tests for ${candidateEmail}`);
            
            // Execute test runner script
            const result = await this.executeInContainer(
                candidateEmail,
                'bash /assessment/scripts/run-tests.sh'
            );
            
            // Parse test results
            const testResults = await this.parseTestResults(environment.containerId);
            environment.testResults = testResults;
            
            Logger.info(`Tests completed for ${candidateEmail}: ${JSON.stringify(testResults)}`);
            return testResults;
            
        } catch (error) {
            Logger.error('Failed to run tests:', error);
            throw error;
        }
    }

    /**
     * Parse test results from container
     */
    private async parseTestResults(containerId: string): Promise<any> {
        try {
            // Try to read test report
            const { stdout } = await execAsync(
                `docker exec ${containerId} cat /assessment/test-report.json 2>/dev/null || echo '{}'`
            );
            
            return JSON.parse(stdout);
            
        } catch (error) {
            Logger.error('Failed to parse test results:', error);
            return { error: 'Failed to parse test results' };
        }
    }

    /**
     * Get container status
     */
    public async getContainerStatus(candidateEmail: string): Promise<DockerContainer | null> {
        try {
            const environment = this.containers.get(candidateEmail);
            if (!environment) {
                return null;
            }

            const { stdout } = await execAsync(
                `docker ps --filter id=${environment.containerId} --format "{{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"`
            );
            
            const [id, name, status, ports, image] = stdout.trim().split('\t');
            
            return {
                id,
                name,
                status,
                ports: ports ? ports.split(',') : [],
                image
            };
            
        } catch (error) {
            Logger.error('Failed to get container status:', error);
            return null;
        }
    }

    /**
     * Stop assessment environment
     */
    public async stopAssessmentEnvironment(candidateEmail: string): Promise<void> {
        try {
            const environment = this.containers.get(candidateEmail);
            if (!environment) {
                Logger.warn(`No assessment environment found for ${candidateEmail}`);
                return;
            }

            // Stop container
            await execAsync(`docker stop ${environment.containerId}`);
            await execAsync(`docker rm ${environment.containerId}`);
            
            // Remove from tracking
            this.containers.delete(candidateEmail);
            
            Logger.info(`Assessment environment stopped for ${candidateEmail}`);
            
        } catch (error) {
            Logger.error('Failed to stop assessment environment:', error);
            throw error;
        }
    }

    /**
     * Get all running assessment containers
     */
    public async getRunningContainers(): Promise<DockerContainer[]> {
        try {
            const { stdout } = await execAsync(
                `docker ps --filter "name=lodeai-assessment" --format "{{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"`
            );
            
            return stdout.trim().split('\n').map(line => {
                const [id, name, status, ports, image] = line.split('\t');
                return {
                    id,
                    name,
                    status,
                    ports: ports ? ports.split(',') : [],
                    image
                };
            });
            
        } catch (error) {
            Logger.error('Failed to get running containers:', error);
            return [];
        }
    }

    /**
     * Clean up all assessment containers
     */
    public async cleanupAllContainers(): Promise<void> {
        try {
            await execAsync('docker-compose down');
            await execAsync('docker system prune -f');
            
            this.containers.clear();
            
            Logger.info('All assessment containers cleaned up');
            
        } catch (error) {
            Logger.error('Failed to cleanup containers:', error);
            throw error;
        }
    }
}
