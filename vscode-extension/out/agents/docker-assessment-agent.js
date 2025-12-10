"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerAssessmentAgent = void 0;
const claude_client_1 = require("../utils/claude-client");
const logger_1 = require("../utils/logger");
const docker_manager_1 = require("../utils/docker-manager");
class DockerAssessmentAgent {
    constructor() {
        this.currentAssessment = [];
        this.candidateEmail = '';
        this.claudeClient = claude_client_1.ClaudeClient.getInstance();
        this.dockerManager = docker_manager_1.DockerManager.getInstance();
    }
    /**
     * Initialize assessment for a candidate
     */
    async initializeAssessment(candidateEmail, jobDescription, assessmentType = 'fullstack') {
        try {
            this.candidateEmail = candidateEmail;
            logger_1.Logger.info(`Initializing Docker assessment for ${candidateEmail}`);
            // Check Docker availability
            const dockerAvailable = await this.dockerManager.checkDockerAvailability();
            if (!dockerAvailable) {
                throw new Error('Docker is not available. Please install Docker and try again.');
            }
            // Start Docker assessment environment
            const environment = await this.dockerManager.startAssessmentEnvironment(candidateEmail, assessmentType);
            // Generate assessment tasks based on job description
            await this.generateAssessmentTasks(jobDescription, assessmentType);
            // Set up initial project structure
            await this.setupProjectStructure();
            logger_1.Logger.info(`Docker assessment initialized for ${candidateEmail}`);
        }
        catch (error) {
            logger_1.Logger.error('Failed to initialize Docker assessment:', error);
            throw error;
        }
    }
    /**
     * Generate assessment tasks based on job description
     */
    async generateAssessmentTasks(jobDescription, assessmentType) {
        try {
            const systemPrompt = `You are an AI assessment coordinator. Based on the job description, create a comprehensive assessment plan with specific tasks.

Job Description: ${jobDescription}
Assessment Type: ${assessmentType}

Create 5-7 assessment tasks that cover:
1. Environment setup and configuration
2. Core development tasks
3. Testing and quality assurance
4. Problem-solving challenges
5. Best practices implementation

Return the tasks as a JSON array with this structure:
{
  "tasks": [
    {
      "id": "task-1",
      "title": "Task Title",
      "description": "Detailed task description",
      "type": "setup|development|testing|deployment",
      "difficulty": "easy|medium|hard",
      "estimatedTime": 30,
      "requirements": ["requirement1", "requirement2"],
      "acceptanceCriteria": ["criteria1", "criteria2"],
      "testCases": [
        {
          "id": "test-1",
          "name": "Test Name",
          "description": "Test description",
          "input": {},
          "expectedOutput": {},
          "type": "unit|integration|e2e"
        }
      ]
    }
  ]
}`;
            const response = await this.claudeClient.chatCompletion([{ role: 'user', content: systemPrompt }]);
            const assessmentData = JSON.parse(response.content);
            this.currentAssessment = assessmentData.tasks;
            logger_1.Logger.info(`Generated ${this.currentAssessment.length} assessment tasks`);
        }
        catch (error) {
            logger_1.Logger.error('Failed to generate assessment tasks:', error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }
    /**
     * Set up initial project structure in Docker container
     */
    async setupProjectStructure() {
        try {
            const setupCommands = [
                'mkdir -p /assessment/src /assessment/tests /assessment/docs',
                'cd /assessment',
                'npm init -y',
                'npm install --save-dev jest @types/node typescript',
                'echo "console.log(\'Assessment environment ready!\');" > src/index.js'
            ];
            for (const command of setupCommands) {
                await this.dockerManager.executeInContainer(this.candidateEmail, command);
            }
            logger_1.Logger.info('Project structure setup completed');
        }
        catch (error) {
            logger_1.Logger.error('Failed to setup project structure:', error);
            throw error;
        }
    }
    /**
     * Get current assessment tasks
     */
    getAssessmentTasks() {
        return this.currentAssessment;
    }
    /**
     * Execute a specific task in the Docker environment
     */
    async executeTask(taskId) {
        try {
            const task = this.currentAssessment.find(t => t.id === taskId);
            if (!task) {
                throw new Error(`Task ${taskId} not found`);
            }
            logger_1.Logger.info(`Executing task: ${task.title}`);
            // Create task-specific files
            await this.createTaskFiles(task);
            // Run any setup commands
            await this.runTaskSetup(task);
            // Execute tests for the task
            const testResults = await this.runTaskTests(task);
            return {
                taskId,
                status: 'completed',
                testResults,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            logger_1.Logger.error(`Failed to execute task ${taskId}:`, error);
            throw error;
        }
    }
    /**
     * Create task-specific files in Docker container
     */
    async createTaskFiles(task) {
        try {
            // Create task description file
            const taskFile = `/assessment/tasks/${task.id}.md`;
            const taskContent = `# ${task.title}

## Description
${task.description}

## Requirements
${task.requirements.map(req => `- ${req}`).join('\n')}

## Acceptance Criteria
${task.acceptanceCriteria.map(criteria => `- ${criteria}`).join('\n')}

## Test Cases
${task.testCases.map(test => `### ${test.name}\n${test.description}`).join('\n\n')}
`;
            await this.dockerManager.executeInContainer(this.candidateEmail, `mkdir -p /assessment/tasks`);
            await this.dockerManager.executeInContainer(this.candidateEmail, `echo '${taskContent.replace(/'/g, "'\\''")}' > ${taskFile}`);
            // Create test files
            for (const testCase of task.testCases) {
                await this.createTestCaseFile(task.id, testCase);
            }
        }
        catch (error) {
            logger_1.Logger.error('Failed to create task files:', error);
            throw error;
        }
    }
    /**
     * Create test case file
     */
    async createTestCaseFile(taskId, testCase) {
        try {
            const testFile = `/assessment/tests/${taskId}-${testCase.id}.test.js`;
            const testContent = `describe('${testCase.name}', () => {
  it('${testCase.description}', () => {
    // Test implementation
    const input = ${JSON.stringify(testCase.input)};
    const expected = ${JSON.stringify(testCase.expectedOutput)};
    
    // TODO: Implement the test logic
    expect(true).toBe(true);
  });
});
`;
            await this.dockerManager.executeInContainer(this.candidateEmail, `echo '${testContent.replace(/'/g, "'\\''")}' > ${testFile}`);
        }
        catch (error) {
            logger_1.Logger.error('Failed to create test case file:', error);
            throw error;
        }
    }
    /**
     * Run task setup commands
     */
    async runTaskSetup(task) {
        try {
            // Install dependencies if needed
            if (task.requirements.some(req => req.includes('npm') || req.includes('package'))) {
                await this.dockerManager.executeInContainer(this.candidateEmail, 'npm install');
            }
            // Run any other setup commands based on task requirements
            for (const requirement of task.requirements) {
                if (requirement.includes('install')) {
                    const packageName = requirement.split(' ').pop();
                    if (packageName) {
                        await this.dockerManager.executeInContainer(this.candidateEmail, `npm install ${packageName}`);
                    }
                }
            }
        }
        catch (error) {
            logger_1.Logger.error('Failed to run task setup:', error);
            throw error;
        }
    }
    /**
     * Run tests for a specific task
     */
    async runTaskTests(task) {
        try {
            // Run Jest tests
            const testResult = await this.dockerManager.executeInContainer(this.candidateEmail, 'npm test -- --testPathPattern=' + task.id);
            // Parse test results
            const testResults = {
                taskId: task.id,
                testOutput: testResult.stdout,
                testErrors: testResult.stderr,
                timestamp: new Date().toISOString()
            };
            return testResults;
        }
        catch (error) {
            logger_1.Logger.error('Failed to run task tests:', error);
            return {
                taskId: task.id,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            };
        }
    }
    /**
     * Get AI assistance for a specific task
     */
    async getTaskAssistance(taskId, question) {
        try {
            const task = this.currentAssessment.find(t => t.id === taskId);
            if (!task) {
                throw new Error(`Task ${taskId} not found`);
            }
            const systemPrompt = `You are an AI coding assistant helping a candidate with an assessment task.

Task: ${task.title}
Description: ${task.description}
Requirements: ${task.requirements.join(', ')}

The candidate is asking: ${question}

Provide helpful guidance without giving away the complete solution. Focus on:
1. Understanding the requirements
2. Suggesting approaches
3. Pointing to relevant documentation
4. Helping with debugging

Keep your response concise and educational.`;
            const response = await this.claudeClient.chatCompletion([{ role: 'user', content: systemPrompt }]);
            return response.content;
        }
        catch (error) {
            logger_1.Logger.error('Failed to get task assistance:', error);
            return 'I apologize, but I encountered an error while processing your request. Please try again.';
        }
    }
    /**
     * Run all tests and generate assessment report
     */
    async generateAssessmentReport() {
        try {
            logger_1.Logger.info('Generating assessment report...');
            // Run all tests
            const testResults = await this.dockerManager.runTests(this.candidateEmail);
            // Calculate scores
            const totalTasks = this.currentAssessment.length;
            const completedTasks = testResults.passed || 0;
            const score = (completedTasks / totalTasks) * 100;
            const report = {
                candidateEmail: this.candidateEmail,
                timestamp: new Date().toISOString(),
                totalTasks,
                completedTasks,
                score: Math.round(score),
                testResults,
                tasks: this.currentAssessment.map(task => ({
                    id: task.id,
                    title: task.title,
                    difficulty: task.difficulty,
                    status: 'completed' // This would be determined by test results
                }))
            };
            logger_1.Logger.info(`Assessment report generated: ${JSON.stringify(report)}`);
            return report;
        }
        catch (error) {
            logger_1.Logger.error('Failed to generate assessment report:', error);
            throw error;
        }
    }
    /**
     * Clean up assessment environment
     */
    async cleanupAssessment() {
        try {
            await this.dockerManager.stopAssessmentEnvironment(this.candidateEmail);
            this.currentAssessment = [];
            this.candidateEmail = '';
            logger_1.Logger.info('Assessment cleanup completed');
        }
        catch (error) {
            logger_1.Logger.error('Failed to cleanup assessment:', error);
            throw error;
        }
    }
}
exports.DockerAssessmentAgent = DockerAssessmentAgent;
//# sourceMappingURL=docker-assessment-agent.js.map