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
exports.AssessmentOrchestrator = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const agents_1 = require("../agents");
const logger_1 = require("../utils/logger");
const mcp_service_1 = require("../utils/mcp-service");
const ai_streaming_service_1 = require("../utils/ai-streaming-service");
class AssessmentOrchestrator {
    constructor(panel, projectPath, webviewProvider) {
        this.panel = panel;
        this.projectPath = projectPath;
        this.webviewProvider = webviewProvider;
        this.mcpService = mcp_service_1.MCPService.getInstance();
        this.aiStreamingService = ai_streaming_service_1.AIStreamingService.getInstance();
        this.sessionId = `orchestrator-${Date.now()}`;
        this.initializeMCP();
        logger_1.Logger.info('Assessment orchestrator initialized with MCP coordination and AI streaming');
    }
    initializeMCP() {
        // Register orchestration tools with MCP
        this.mcpService.registerTool({
            name: 'assessment_orchestration',
            description: 'Coordinate assessment creation across all agents',
            parameters: {
                jobDescription: { type: 'string' },
                resumeText: { type: 'string' },
                projectPath: { type: 'string' }
            },
            execute: async (params) => {
                return await this.createAssessment(params.jobDescription, params.resumeText);
            }
        });
        // Listen for orchestration events
        this.mcpService.on('message:notification', (message) => {
            this.handleMCPNotification(message);
        });
        // Monitor agent states
        this.mcpService.on('agentStateChanged', (data) => {
            logger_1.Logger.info(`Agent state changed: ${data.agentId}`);
        });
        logger_1.Logger.info(`Assessment orchestrator registered with MCP`);
    }
    handleMCPNotification(message) {
        switch (message.action) {
            case 'planning_completed':
                this.notify('info', 'Assessment plan received from planner agent');
                break;
            case 'execution_completed':
                this.notify('info', 'Task execution completed by executor agent');
                break;
            case 'error_resolved':
                this.notify('info', 'Error resolved by error handler agent');
                break;
        }
    }
    async notify(level, action, taskDescription, progress, additionalContext) {
        try {
            // Generate AI streaming message
            const aiMessage = await this.aiStreamingService.generateStreamingMessage({
                agentType: 'orchestrator',
                action,
                taskDescription,
                progress,
                additionalContext
            });
            if (this.panel) {
                this.panel.webview.postMessage({
                    type: 'agentMessage',
                    payload: {
                        agent: 'Orchestrator',
                        level,
                        content: aiMessage,
                        timestamp: new Date(),
                        progress
                    }
                });
            }
            // Send to webview provider if available
            if (this.webviewProvider && this.webviewProvider._webviewView) {
                this.webviewProvider._webviewView.webview.postMessage({
                    type: 'agentMessage',
                    payload: {
                        agent: 'Orchestrator',
                        level,
                        content: aiMessage,
                        timestamp: new Date(),
                        progress
                    }
                });
            }
            // Also show in status bar for sidebar-only mode
            vscode.window.setStatusBarMessage(`LodeAI: ${aiMessage}`, 3000);
        }
        catch (error) {
            logger_1.Logger.error('Failed to generate AI streaming message:', error);
            // Fallback to simple message
            const fallbackMessage = `Orchestrating: ${action}`;
            this.sendNotification(level, fallbackMessage, progress);
        }
    }
    sendNotification(level, content, progress) {
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'agentMessage',
                payload: {
                    agent: 'Orchestrator',
                    level,
                    content,
                    timestamp: new Date(),
                    progress
                }
            });
        }
        if (this.webviewProvider && this.webviewProvider._webviewView) {
            this.webviewProvider._webviewView.webview.postMessage({
                type: 'agentMessage',
                payload: {
                    agent: 'Orchestrator',
                    level,
                    content,
                    timestamp: new Date(),
                    progress
                }
            });
        }
        vscode.window.setStatusBarMessage(`LodeAI: ${content}`, 3000);
    }
    async createAssessment(jobDescription, resumeText, preferredLanguage) {
        await this.notify('info', 'initializing_pipeline', 'Initializing AI-powered assessment creation pipeline with MCP coordination', 0);
        logger_1.Logger.info('Starting assessment creation pipeline with MCP');
        logger_1.Logger.info(`✅ Step 3: Preferred language passed to orchestrator: ${preferredLanguage || 'not specified'}`);
        logger_1.Logger.info(`📄 Job Description (first 200 chars): ${jobDescription.substring(0, 200)}...`);
        logger_1.Logger.info(`📄 Resume (first 200 chars): ${resumeText.substring(0, 200)}...`);
        // Initialize MCP session
        this.mcpService.setSharedData('session_id', this.sessionId);
        this.mcpService.setSharedData('project_path', this.projectPath);
        this.mcpService.setSharedData('assessment_status', 'starting');
        this.mcpService.setSharedData('preferred_language', preferredLanguage); // Store language in MCP
        const errorHandler = new agents_1.ErrorHandlerAgent(this.panel, this.projectPath, this.webviewProvider);
        const executor = new agents_1.ExecutorAgent(this.panel, this.projectPath, errorHandler, this.webviewProvider);
        const planner = new agents_1.PlannerAgent(this.panel, this.webviewProvider);
        try {
            // Phase 1: Planning with MCP coordination (20% progress)
            await this.notify('plan', 'phase_1_planning', 'Phase 1: Analyzing candidate profile and job requirements with MCP', 20);
            logger_1.Logger.info('Starting planning phase with MCP coordination');
            // Request plan generation via MCP
            const planMessage = {
                id: `plan-request-${Date.now()}`,
                agentId: this.sessionId,
                type: 'request',
                action: 'generate_plan',
                payload: { jobDescription, resumeText, preferredLanguage },
                timestamp: new Date()
            };
            this.mcpService.sendMessage(planMessage);
            // Wait for plan to be available via MCP
            let plan = this.mcpService.getSharedData('current_assessment_plan');
            if (!plan) {
                // Fallback to direct method if MCP doesn't have the plan yet
                plan = await planner.createAssessmentPlan(jobDescription, resumeText, preferredLanguage);
            }
            if (!plan || !plan.tasks || plan.tasks.length === 0) {
                throw new Error('Invalid assessment plan generated');
            }
            this.mcpService.setSharedData('assessment_status', 'planning_completed');
            await this.notify('info', 'plan_coordinated', 'Assessment plan coordinated via MCP');
            // Phase 2: Execution with MCP coordination (20-80% progress)
            await this.notify('execute', 'phase_2_execution', 'Phase 2: Building assessment environment and files with MCP', 40);
            logger_1.Logger.info('Starting execution phase with MCP coordination');
            // Share execution context via MCP
            this.mcpService.setSharedData('current_plan', plan);
            this.mcpService.setSharedData('assessment_status', 'executing');
            const success = await executor.executePlan(plan);
            if (success) {
                // Phase 3: Verification with MCP coordination (80-100% progress)
                await this.notify('verify', 'phase_3_verification', 'Phase 3: Verifying assessment structure and completeness with MCP', 90);
                logger_1.Logger.info('Starting verification phase with MCP coordination');
                this.mcpService.setSharedData('assessment_status', 'verifying');
                await this.finalVerification(plan);
                this.mcpService.setSharedData('assessment_status', 'completed');
                await this.notify('success', 'assessment_completed', 'Assessment created successfully with MCP coordination! Ready for candidate use.', 100);
                // Clear any pending retry attempts via MCP
                this.mcpService.setSharedData('clear_retry_attempts', true);
                logger_1.Logger.info('Assessment creation completed successfully with MCP');
                return true;
            }
            else {
                this.mcpService.setSharedData('assessment_status', 'execution_failed');
                await this.notify('error', 'execution_failed', 'Assessment creation failed during execution phase', 100);
                logger_1.Logger.error('Assessment creation failed during execution phase');
                return false;
            }
        }
        catch (error) {
            logger_1.Logger.error('MCP orchestration failed', error);
            this.mcpService.setSharedData('assessment_status', 'failed');
            await this.notify('error', 'orchestration_failed', undefined, 100, { error: String(error) });
            return false;
        }
        finally {
            executor.dispose();
            this.mcpService.setSharedData('assessment_status', 'cleanup');
            logger_1.Logger.info('Assessment orchestrator cleanup completed with MCP');
        }
    }
    async finalVerification(plan) {
        logger_1.Logger.info('Starting final verification');
        const essentialFiles = [
            'README.md',
            'src/',
            'tests/'
        ];
        const verificationResults = [];
        for (const file of essentialFiles) {
            const fullPath = path.join(this.projectPath, file);
            const exists = fs.existsSync(fullPath);
            let size;
            if (exists) {
                const stats = fs.statSync(fullPath);
                size = stats.isDirectory() ? undefined : stats.size;
            }
            verificationResults.push({ file, exists, size });
            if (exists) {
                logger_1.Logger.info(`Verification passed: ${file}`);
            }
            else {
                logger_1.Logger.warn(`Verification failed: ${file} not found`);
            }
        }
        // Check for assessment-specific files
        if (plan.assessment_type === 'data_science') {
            const dataPath = path.join(this.projectPath, 'data/dataset.csv');
            const dataExists = fs.existsSync(dataPath);
            verificationResults.push({ file: 'data/dataset.csv', exists: dataExists });
            if (dataExists) {
                logger_1.Logger.info('Dataset verification passed');
            }
            else {
                logger_1.Logger.warn('Dataset verification failed');
            }
        }
        const passedChecks = verificationResults.filter(r => r.exists).length;
        const totalChecks = verificationResults.length;
        const successRate = Math.round((passedChecks / totalChecks) * 100);
        logger_1.Logger.info(`Verification completed: ${successRate}% success rate`);
        if (successRate >= 80) {
            logger_1.Logger.info('Assessment verification passed');
        }
        else {
            logger_1.Logger.warn('Assessment verification has some issues');
        }
    }
}
exports.AssessmentOrchestrator = AssessmentOrchestrator;
//# sourceMappingURL=assessment-orchestrator.js.map