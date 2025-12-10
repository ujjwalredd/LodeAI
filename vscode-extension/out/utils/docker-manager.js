"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerManager = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const logger_1 = require("./logger");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class DockerManager {
    constructor() {
        this.containers = new Map();
    }
    static getInstance() {
        if (!DockerManager.instance) {
            DockerManager.instance = new DockerManager();
        }
        return DockerManager.instance;
    }
    /**
     * Check if Docker is available and running
     */
    async checkDockerAvailability() {
        try {
            const { stdout } = await execAsync('docker --version');
            logger_1.Logger.info(`Docker is available: ${stdout.trim()}`);
            return true;
        }
        catch (error) {
            logger_1.Logger.error('Docker is not available:', error);
            return false;
        }
    }
    /**
     * Start assessment environment for a candidate
     */
    async startAssessmentEnvironment(candidateEmail, assessmentType = 'fullstack') {
        try {
            logger_1.Logger.info(`Starting assessment environment for ${candidateEmail}`);
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
            const environment = {
                containerId,
                assessmentType,
                candidateEmail,
                workingDirectory: `/assessment`,
                testResults: null
            };
            this.containers.set(candidateEmail, environment);
            logger_1.Logger.info(`Assessment environment started for ${candidateEmail}: ${containerId}`);
            return environment;
        }
        catch (error) {
            logger_1.Logger.error('Failed to start assessment environment:', error);
            throw error;
        }
    }
    /**
     * Set up the assessment environment inside the container
     */
    async setupAssessmentEnvironment(containerId, assessmentType) {
        try {
            // Copy assessment setup scripts to container
            await execAsync(`docker cp docker/scripts/ ${containerId}:/assessment/scripts/`);
            // Set up environment variables
            await execAsync(`docker exec ${containerId} bash -c "export ASSESSMENT_TYPE=${assessmentType}"`);
            // Run assessment setup
            await execAsync(`docker exec ${containerId} bash /assessment/scripts/setup-assessments.sh`);
            logger_1.Logger.info(`Assessment environment setup completed for container ${containerId}`);
        }
        catch (error) {
            logger_1.Logger.error('Failed to setup assessment environment:', error);
            throw error;
        }
    }
    /**
     * Execute command in assessment container
     */
    async executeInContainer(candidateEmail, command, workingDirectory) {
        try {
            const environment = this.containers.get(candidateEmail);
            if (!environment) {
                throw new Error(`No assessment environment found for ${candidateEmail}`);
            }
            const workDir = workingDirectory || environment.workingDirectory;
            const fullCommand = `docker exec -w ${workDir} ${environment.containerId} ${command}`;
            logger_1.Logger.info(`Executing in container: ${fullCommand}`);
            const result = await execAsync(fullCommand);
            return result;
        }
        catch (error) {
            logger_1.Logger.error('Failed to execute command in container:', error);
            throw error;
        }
    }
    /**
     * Run tests in assessment container
     */
    async runTests(candidateEmail) {
        try {
            const environment = this.containers.get(candidateEmail);
            if (!environment) {
                throw new Error(`No assessment environment found for ${candidateEmail}`);
            }
            logger_1.Logger.info(`Running tests for ${candidateEmail}`);
            // Execute test runner script
            const result = await this.executeInContainer(candidateEmail, 'bash /assessment/scripts/run-tests.sh');
            // Parse test results
            const testResults = await this.parseTestResults(environment.containerId);
            environment.testResults = testResults;
            logger_1.Logger.info(`Tests completed for ${candidateEmail}: ${JSON.stringify(testResults)}`);
            return testResults;
        }
        catch (error) {
            logger_1.Logger.error('Failed to run tests:', error);
            throw error;
        }
    }
    /**
     * Parse test results from container
     */
    async parseTestResults(containerId) {
        try {
            // Try to read test report
            const { stdout } = await execAsync(`docker exec ${containerId} cat /assessment/test-report.json 2>/dev/null || echo '{}'`);
            return JSON.parse(stdout);
        }
        catch (error) {
            logger_1.Logger.error('Failed to parse test results:', error);
            return { error: 'Failed to parse test results' };
        }
    }
    /**
     * Get container status
     */
    async getContainerStatus(candidateEmail) {
        try {
            const environment = this.containers.get(candidateEmail);
            if (!environment) {
                return null;
            }
            const { stdout } = await execAsync(`docker ps --filter id=${environment.containerId} --format "{{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"`);
            const [id, name, status, ports, image] = stdout.trim().split('\t');
            return {
                id,
                name,
                status,
                ports: ports ? ports.split(',') : [],
                image
            };
        }
        catch (error) {
            logger_1.Logger.error('Failed to get container status:', error);
            return null;
        }
    }
    /**
     * Stop assessment environment
     */
    async stopAssessmentEnvironment(candidateEmail) {
        try {
            const environment = this.containers.get(candidateEmail);
            if (!environment) {
                logger_1.Logger.warn(`No assessment environment found for ${candidateEmail}`);
                return;
            }
            // Stop container
            await execAsync(`docker stop ${environment.containerId}`);
            await execAsync(`docker rm ${environment.containerId}`);
            // Remove from tracking
            this.containers.delete(candidateEmail);
            logger_1.Logger.info(`Assessment environment stopped for ${candidateEmail}`);
        }
        catch (error) {
            logger_1.Logger.error('Failed to stop assessment environment:', error);
            throw error;
        }
    }
    /**
     * Get all running assessment containers
     */
    async getRunningContainers() {
        try {
            const { stdout } = await execAsync(`docker ps --filter "name=lodeai-assessment" --format "{{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"`);
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
        }
        catch (error) {
            logger_1.Logger.error('Failed to get running containers:', error);
            return [];
        }
    }
    /**
     * Clean up all assessment containers
     */
    async cleanupAllContainers() {
        try {
            await execAsync('docker-compose down');
            await execAsync('docker system prune -f');
            this.containers.clear();
            logger_1.Logger.info('All assessment containers cleaned up');
        }
        catch (error) {
            logger_1.Logger.error('Failed to cleanup containers:', error);
            throw error;
        }
    }
}
exports.DockerManager = DockerManager;
//# sourceMappingURL=docker-manager.js.map