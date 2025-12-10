import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AssessmentPlan, PlanTask, ExecutionResult } from '../types/assessment-types';
import { ErrorHandlerAgent } from './error-handler-agent';
import { TerminalManager } from '../utils/terminal-manager';
import { Logger } from '../utils/logger';
import { Config } from '../utils/config';
import { MCPService } from '../utils/mcp-service';
import { AIStreamingService } from '../utils/ai-streaming-service';

export class ExecutorAgent {
    private panel: vscode.WebviewPanel | undefined;
    private projectPath: string;
    private terminalManager: TerminalManager;
    private errorHandler: ErrorHandlerAgent;
    private webviewProvider: any;
    private retryCount: Map<string, number> = new Map();
    private maxRetryAttempts: number;
    private disposed = false;
    private mcpService: MCPService;
    private aiStreamingService: AIStreamingService;
    private agentId: string;

    constructor(panel: vscode.WebviewPanel | undefined, projectPath: string, errorHandler: ErrorHandlerAgent, webviewProvider?: any) {
        this.panel = panel;
        this.projectPath = projectPath;
        this.errorHandler = errorHandler;
        this.webviewProvider = webviewProvider;
        this.agentId = 'executor-agent';
        
        this.terminalManager = new TerminalManager(projectPath);
        this.mcpService = MCPService.getInstance();
        this.aiStreamingService = AIStreamingService.getInstance();
        this.maxRetryAttempts = Config.getInstance().getMaxRetryAttempts();
        
        this.initializeMCP();
        Logger.info('Executor agent initialized with MCP and AI streaming');
    }

    private initializeMCP(): void {
        // Register execution tools with MCP
        this.mcpService.registerTool({
            name: 'task_execution',
            description: 'Execute assessment tasks and manage project structure',
            parameters: {
                task: { type: 'object' },
                projectPath: { type: 'string' }
            },
            execute: async (params) => {
                return await this.executeTask(params.task);
            }
        });

        // Register file operations tool for other agents
        this.mcpService.registerTool({
            name: 'file_management',
            description: 'Create and manage files for assessment',
            parameters: {
                operation: { type: 'string', enum: ['create_file', 'create_folder', 'write_content'] },
                path: { type: 'string' },
                content: { type: 'string', optional: true }
            },
            execute: async (params) => {
                const fullPath = path.join(this.projectPath, params.path);
                
                switch (params.operation) {
                    case 'create_file':
                        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
                        await fs.promises.writeFile(fullPath, params.content || '');
                        return { success: true, path: fullPath };
                    case 'create_folder':
                        await fs.promises.mkdir(fullPath, { recursive: true });
                        return { success: true, path: fullPath };
                    case 'write_content':
                        await fs.promises.writeFile(fullPath, params.content);
                        return { success: true, path: fullPath };
                    default:
                        throw new Error(`Unknown file operation: ${params.operation}`);
                }
            }
        });

        // Listen for execution requests from other agents
        this.mcpService.on('message:request', (message) => {
            if (message.action === 'execute_task') {
                this.handleMCPExecutionRequest(message);
            }
        });

        Logger.info(`Executor agent registered with MCP as: ${this.agentId}`);
    }

    private async handleMCPExecutionRequest(message: any): Promise<void> {
        try {
            const { task } = message.payload;
            const result = await this.executeTask(task);
            
            // Share execution result with other agents via MCP
            this.mcpService.setSharedData('last_execution_result', result);
            this.mcpService.setSharedData('execution_status', result.success ? 'completed' : 'failed');
            
            Logger.info('Task execution result shared via MCP');
        } catch (error: any) {
            Logger.error('MCP execution request failed:', error);
            this.mcpService.setSharedData('execution_status', 'failed');
        }
    }

    private async notify(level: string, action: string, taskDescription?: string, progress?: number, additionalContext?: any) {
        if (this.disposed) return;
        
        try {
            // Generate AI streaming message
            const aiMessage = await this.aiStreamingService.generateStreamingMessage({
                agentType: 'executor',
                action,
                taskDescription,
                progress,
                additionalContext
            });

            if (this.panel) {
                this.panel.webview.postMessage({ 
                    type: 'agentMessage',
                    payload: { 
                        agent: 'Executor', 
                        level, 
                        content: aiMessage, 
                        timestamp: new Date(),
                        progress 
                    } 
                }).then(undefined, (err: any) => {
                    Logger.warn(`Failed to send notification: ${err.message}`);
                });
            }
            
            // Send to webview provider if available
            if (this.webviewProvider && this.webviewProvider._webviewView) {
                this.webviewProvider._webviewView.webview.postMessage({
                    type: 'agentMessage',
                    payload: {
                        agent: 'Executor',
                        level,
                        content: aiMessage,
                        timestamp: new Date(),
                        progress
                    }
                });
            }
            
            // Also show in status bar for sidebar-only mode
            vscode.window.setStatusBarMessage(`LodeAI Executor: ${aiMessage}`, 3000);
        } catch (error: any) {
            Logger.error('Failed to generate AI streaming message:', error);
            // Fallback to simple message
            const fallbackMessage = `Executing: ${action}`;
            this.sendNotification(level, fallbackMessage, progress);
        }
    }

    private sendNotification(level: string, content: string, progress?: number) {
        if (this.panel) {
            this.panel.webview.postMessage({ 
                type: 'agentMessage',
                payload: { 
                    agent: 'Executor', 
                    level, 
                    content, 
                    timestamp: new Date(),
                    progress 
                } 
            }).then(undefined, (err: any) => {
                Logger.warn(`Failed to send notification: ${err.message}`);
            });
        }
        
        if (this.webviewProvider && this.webviewProvider._webviewView) {
            this.webviewProvider._webviewView.webview.postMessage({
                type: 'agentMessage',
                payload: {
                    agent: 'Executor',
                    level,
                    content,
                    timestamp: new Date(),
                    progress
                }
            });
        }
        
        vscode.window.setStatusBarMessage(`LodeAI Executor: ${content}`, 3000);
    }

    async executePlan(plan: AssessmentPlan): Promise<boolean> {
        if (!plan.tasks || plan.tasks.length === 0) {
            await this.notify('warning', 'no_tasks_available');
            return true;
        }

        await this.notify('execute', 'cleaning_environment');
        await this.cleanWorkingDirectory();
        
        await this.notify('execute', 'starting_execution', `Processing ${plan.tasks.length} assessment tasks`);
        Logger.info(`Starting execution of ${plan.tasks.length} tasks`);

        const executedTasks = new Set<string>();
        const taskQueue = [...plan.tasks];
        const totalTasks = taskQueue.length;
        let completedTasks = 0;
        let attempts = 0;
        const maxAttempts = totalTasks * 3; // Prevent infinite loops

        while (taskQueue.length > 0 && attempts < maxAttempts && !this.disposed) {
            attempts++;
            const task = taskQueue.shift()!;
            
            // Skip tasks if dependencies not yet met
            if (task.dependencies && task.dependencies.some(dep => !executedTasks.has(dep))) {
                taskQueue.push(task);
                continue;
            }

            await this.notify('info', 'executing_task', task.description, this.calcProgress(completedTasks, totalTasks));
            Logger.info(`Executing task: ${task.id} - ${task.description}`);

            const result = await this.executeTask(task);
            
            if (result.success) {
                executedTasks.add(task.id);
                completedTasks++;
                await this.notify('success', 'task_completed', task.description, this.calcProgress(completedTasks, totalTasks));
                Logger.info(`Task completed: ${task.id}`);
            } else {
                const currentAttempt = this.retryCount.get(task.id) || 0;
                
                if (currentAttempt < this.maxRetryAttempts) {
                    this.retryCount.set(task.id, currentAttempt + 1);
                    await this.notify('warning', 'task_failed_retry', task.description, undefined, { 
                        attempt: currentAttempt + 1, 
                        maxAttempts: this.maxRetryAttempts 
                    });
                    Logger.warn(`Task failed, attempting error resolution: ${task.id}`);

                    const resolution = await this.errorHandler.handleError(task, result.error ?? 'Unknown error');
                    
                    if (resolution.fixed && resolution.retry_command) {
                        const retryTask: PlanTask = {
                            ...task,
                            id: `${task.id}_retry_${currentAttempt + 1}`,
                            command: resolution.retry_command,
                            description: `${task.description} (retry ${currentAttempt + 1})`
                        };
                        
                        await this.notify('info', 'retrying_with_fix', task.description);
                        const retryResult = await this.executeTask(retryTask);
                        
                        if (retryResult.success) {
                            executedTasks.add(task.id);
                            completedTasks++;
                            await this.notify('success', 'task_fixed_completed', task.description, this.calcProgress(completedTasks, totalTasks));
                            Logger.info(`Task completed after retry: ${task.id}`);
                        } else {
                            taskQueue.push(task); // Requeue for another attempt
                            await this.notify('warning', 'retry_failed_requeue', task.description);
                        }
                    } else {
                        taskQueue.push(task); // Requeue for another attempt
                        await this.notify('warning', 'error_handler_no_fix', task.description);
                    }
                } else {
                    await this.notify('error', 'max_retries_exceeded', task.description);
                    Logger.error(`Max retries exceeded for task: ${task.id}`);
                    return false;
                }
            }

            await this.delay(500); // Avoid overwhelming the system
        }

        const success = executedTasks.size === totalTasks;
        if (success) {
            await this.notify('success', 'all_tasks_completed', undefined, 100, { 
                totalTasks, 
                completedTasks: executedTasks.size 
            });
            Logger.info(`All ${totalTasks} tasks completed successfully`);
        } else {
            await this.notify('error', 'partial_execution', undefined, this.calcProgress(executedTasks.size, totalTasks), { 
                completedTasks: executedTasks.size, 
                totalTasks 
            });
            Logger.error(`Execution incomplete: ${executedTasks.size}/${totalTasks} tasks completed`);
        }
        
        return success;
    }

    private async executeTask(task: PlanTask): Promise<ExecutionResult> {
        const startTime = Date.now();
        
        try {
            let result: ExecutionResult;
            
            switch (task.type) {
                case 'create_folder': result = await this.createFolder(task); break;
                case 'create_file': result = await this.createFile(task); break;
                case 'run_command': result = await this.runCommand(task); break;
                case 'assessment_question': result = await this.createAssessmentQuestion(task); break;
                case 'download_dataset': result = await this.downloadDataset(task); break;
                case 'setup_environment': result = await this.setupEnvironment(task); break;
                case 'install_dependencies': result = await this.installDependencies(task); break;
                case 'create_virtual_env': result = await this.createVirtualEnvironment(task); break;
                case 'run_validation': result = await this.runValidation(task); break;
                default:
                    result = { success: false, error: `Unknown task type: ${task.type}`, task };
            }

            result.duration = Date.now() - startTime;
            return result;
        } catch (error: any) {
            Logger.error(`Task execution error: ${task.id}`, error);
            return { 
                success: false, 
                error: `Execution error: ${error.message ?? error}`, 
                task,
                duration: Date.now() - startTime 
            };
        }
    }

    private async createFolder(task: PlanTask): Promise<ExecutionResult> {
        if (!task.path) return { success: false, error: 'Missing folder path', task };
        const fullPath = path.join(this.projectPath, task.path);
        
        try {
            await fs.promises.mkdir(fullPath, { recursive: true });
            return { success: true, task };
        } catch (error: any) {
            return { success: false, error: `Failed to create folder: ${error.message}`, task };
        }
    }

    private async createFile(task: PlanTask): Promise<ExecutionResult> {
        if (!task.path) return { success: false, error: 'Missing file path', task };
        const fullPath = path.join(this.projectPath, task.path);

        try {
            await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.promises.writeFile(fullPath, task.content || '');

            // Log file creation for verification
            const fileName = path.basename(task.path);
            if (fileName.includes('runner') || fileName.includes('test') || fileName === '.lodeai.json') {
                Logger.info(`✅ Step 5: Created file: ${task.path}`);
            }

            return { success: true, task };
        } catch (error: any) {
            return { success: false, error: `Failed to create file: ${error.message}`, task };
        }
    }

    private async runCommand(task: PlanTask): Promise<ExecutionResult> {
        if (!task.command) return { success: false, error: 'Missing command to run', task };
        try {
            const cwd = task.cwd ? path.join(this.projectPath, task.cwd) : this.projectPath;
            const result = await this.terminalManager.executeCommand(task.command, cwd);
            return { 
                success: result.success, 
                output: result.output, 
                error: result.error,
                task 
            };
        } catch (error: any) {
            return { success: false, error: `Command execution failed: ${error.message}`, task };
        }
    }

    private async createAssessmentQuestion(task: PlanTask): Promise<ExecutionResult> {
        try {
            const fullPath = path.join(this.projectPath, task.path || 'ASSESSMENT_QUESTIONS.md');
            const content = task.content || `# Assessment Questions\n\n${task.description ?? ''}`;
            
            await fs.promises.writeFile(fullPath, content);
            return { success: true, task };
        } catch (error: any) {
            return { success: false, error: `Failed to create assessment questions: ${error.message}`, task };
        }
    }

    private async downloadDataset(task: PlanTask): Promise<ExecutionResult> {
        if (!task.path) return { success: false, error: 'Missing dataset path', task };
        try {
            // Use AI-powered dataset search instead of predefined datasets
            const jobDescription = this.mcpService.getSharedData('job_description') || 'Data analysis role';
            const techStack = this.mcpService.getSharedData('tech_stack') || ['python', 'pandas'];
            const jobTitle = this.mcpService.getSharedData('job_title') || 'Data Scientist';
            
            const datasetResult = await this.mcpService.executeTool('ai_dataset_search', {
                jobDescription: jobDescription,
                jobTitle: jobTitle,
                targetPath: path.dirname(path.join(this.projectPath, task.path)),
                techStack: techStack
            }, this.agentId);

            if (datasetResult.success) {
                await this.notify('success', 'ai_dataset_downloaded', 
                    `AI-recommended dataset downloaded: ${datasetResult.dataset.name}`);
                return { success: true, task };
            } else {
                // Fallback to synthetic data
                const syntheticResult = await this.mcpService.executeTool('synthetic_data_generation', {
                    dataType: 'classification',
                    targetPath: path.join(this.projectPath, task.path),
                    rows: 1000,
                    features: 5
                }, this.agentId);

                if (syntheticResult.success) {
                    await this.notify('success', 'synthetic_dataset_created', 'Generated synthetic dataset as fallback');
                    return { success: true, task };
                } else {
                    return { success: false, error: `Both AI dataset search and synthetic generation failed: ${datasetResult.error}`, task };
                }
            }
        } catch (error: any) {
            return { success: false, error: `Dataset download failed: ${error.message}`, task };
        }
    }

    private async cleanWorkingDirectory(): Promise<void> {
        try {
            if (!fs.existsSync(this.projectPath)) {
                return;
            }

            const items = await fs.promises.readdir(this.projectPath);
            if (items.length === 0) {
                return;
            }

            for (const item of items) {
                const itemPath = path.join(this.projectPath, item);
                try {
                    await fs.promises.rm(itemPath, { recursive: true, force: true });
                } catch (err: any) {
                    Logger.warn(`Could not clean ${item}: ${err.message}`);
                }
            }
        } catch (error: any) {
            Logger.error('Failed to clean working directory', error);
            throw error;
        }
    }

    private async setupEnvironment(task: PlanTask): Promise<ExecutionResult> {
        try {
            await this.notify('info', 'setting_up_environment', 'Setting up development environment');
            
            // Get job context from MCP to determine tech stack and requirements
            const jobDescription = this.mcpService.getSharedData('job_description') || '';
            const assessmentPlan = this.mcpService.getSharedData('assessment_plan');
            const techStack = assessmentPlan?.tech_stack || ['python'];
            const requiresDatasets = assessmentPlan?.requires_datasets || false;
            
            // Use MCP full environment setup tool with terminal access
            const envSetupResult = await this.mcpService.executeTool('full_environment_setup', {
                projectPath: this.projectPath,
                techStack: techStack,
                requiresDatasets: requiresDatasets,
                jobType: jobDescription.toLowerCase().includes('data') ? 'data_scientist' : 'general'
            }, this.agentId);
            
            if (!envSetupResult.success) {
                return { success: false, error: `MCP environment setup failed: ${envSetupResult.error}`, task };
            }

            // Create virtual environment
            const venvResult = await this.runCommand({
                id: 'create_venv',
                type: 'run_command',
                description: 'Create Python virtual environment',
                command: 'python -m venv assessment_env',
                priority: 'high',
                dependencies: []
            });
            
            if (!venvResult.success) {
                return { success: false, error: `Failed to create virtual environment: ${venvResult.error}`, task };
            }

            // Download datasets if required
            if (requiresDatasets) {
                await this.notify('info', 'checking_datasets', 'Checking if datasets are required for this assessment');
                const datasetResult = await this.downloadRequiredDatasets(jobDescription, techStack);
                if (!datasetResult.success) {
                    await this.notify('warning', 'dataset_download_failed', `Dataset download failed: ${datasetResult.error}`);
                    await this.notify('info', 'using_synthetic_data', 'Will use synthetic data generation instead');
                }
            }

            // Install dependencies
            const depsResult = await this.installDependencies(task);
            
            return { success: depsResult.success, error: depsResult.error, task };
        } catch (error: any) {
            return { success: false, error: `Environment setup failed: ${error.message}`, task };
        }
    }

    private async downloadRequiredDatasets(jobDescription: string, techStack: string[]): Promise<ExecutionResult> {
        try {
            await this.notify('info', 'ai_dataset_search', 'AI is analyzing job requirements to find the most appropriate dataset...');
            
            // Determine job type for dataset selection
            let jobType = 'general';
            if (jobDescription.toLowerCase().includes('data scientist') || jobDescription.toLowerCase().includes('data analyst')) {
                jobType = 'data_scientist';
            } else if (jobDescription.toLowerCase().includes('ml engineer') || jobDescription.toLowerCase().includes('machine learning')) {
                jobType = 'ml_engineer';
            } else if (jobDescription.toLowerCase().includes('backend') || jobDescription.toLowerCase().includes('api')) {
                jobType = 'backend_engineer';
            }

            // Get job details from shared data
            const jobTitle = this.mcpService.getSharedData('job_title') || 'Data Science Role';
            
            // Use AI-powered dataset search tool
            const datasetResult = await this.mcpService.executeTool('ai_dataset_search', {
                jobDescription: jobDescription,
                jobTitle: jobTitle,
                targetPath: path.join(this.projectPath, 'datasets'),
                techStack: techStack
            }, this.agentId);

            if (datasetResult.success) {
                await this.notify('success', 'ai_dataset_downloaded', 
                    `AI-recommended dataset downloaded: ${datasetResult.dataset.name} (${datasetResult.dataset.type})`);
                await this.notify('info', 'dataset_reasoning', `AI reasoning: ${datasetResult.dataset.reasoning}`);
                return { success: true, error: undefined, task: { id: 'ai_dataset_download', type: 'download_dataset', description: 'Download AI-recommended dataset' } as PlanTask };
            } else {
                // Try synthetic data generation as fallback
                await this.notify('warning', 'ai_dataset_failed', `AI dataset search failed: ${datasetResult.error}`);
                await this.notify('info', 'trying_synthetic', 'AI will generate synthetic dataset instead...');
                
                const syntheticResult = await this.mcpService.executeTool('synthetic_data_generation', {
                    dataType: jobDescription.toLowerCase().includes('nlp') ? 'nlp' : 
                             jobDescription.toLowerCase().includes('regression') ? 'regression' : 'classification',
                    targetPath: path.join(this.projectPath, 'datasets', 'synthetic_dataset.csv'),
                    rows: 1000,
                    features: 5
                }, this.agentId);

                if (syntheticResult.success) {
                    await this.notify('success', 'synthetic_dataset_created', 
                        `AI generated synthetic dataset successfully: ${syntheticResult.dataset.name} (${syntheticResult.rows} rows, ${syntheticResult.features} features)`);
                    return { success: true, error: undefined, task: { id: 'synthetic_dataset', type: 'generate_dataset', description: 'Generate synthetic assessment dataset' } as PlanTask };
                } else {
                    return { success: false, error: `Both AI dataset search and synthetic generation failed. AI error: ${datasetResult.error}. Synthetic error: ${syntheticResult.error}`, task: { id: 'dataset_fallback', type: 'generate_dataset', description: 'Generate assessment dataset' } as PlanTask };
                }
            }
        } catch (error: any) {
            return { success: false, error: `Dataset download failed: ${error.message}`, task: { id: 'dataset_download', type: 'download_dataset', description: 'Download assessment datasets' } as PlanTask };
        }
    }

    private async installDependencies(task: PlanTask): Promise<ExecutionResult> {
        try {
            await this.notify('info', 'installing_dependencies', 'Installing project dependencies');
            
            const commands = [
                'source assessment_env/bin/activate',
                'pip install --upgrade pip',
                'pip install -r requirements.txt'
            ];
            
            for (const command of commands) {
                const result = await this.runCommand({
                    id: `install_${command.split(' ')[1]}`,
                    type: 'run_command',
                    description: `Installing ${command.split(' ')[1]}`,
                    command: command,
                    priority: 'high',
                    dependencies: []
                });
                
                if (!result.success) {
                    return { success: false, error: `Failed to install dependencies: ${result.error}`, task };
                }
            }
            
            return { success: true, task };
        } catch (error: any) {
            return { success: false, error: `Dependency installation failed: ${error.message}`, task };
        }
    }

    private async createVirtualEnvironment(task: PlanTask): Promise<ExecutionResult> {
        try {
            await this.notify('info', 'creating_virtual_env', 'Creating isolated Python environment');
            
            const result = await this.runCommand({
                id: 'create_venv',
                type: 'run_command',
                description: 'Create Python virtual environment',
                command: 'python -m venv assessment_env',
                priority: 'high',
                dependencies: []
            });
            
            return { success: result.success, error: result.error, task };
        } catch (error: any) {
            return { success: false, error: `Virtual environment creation failed: ${error.message}`, task };
        }
    }

    private async runValidation(task: PlanTask): Promise<ExecutionResult> {
        try {
            await this.notify('info', 'running_validation', 'Validating assessment setup');
            
            const validationCommands = [
                'python -m pytest src/tests/ -v --cov=src/solutions',
                'flake8 src/solutions/',
                'black --check src/solutions/'
            ];
            
            for (const command of validationCommands) {
                const result = await this.runCommand({
                    id: `validate_${command.split(' ')[2]}`,
                    type: 'run_command',
                    description: `Running ${command.split(' ')[2]} validation`,
                    command: command,
                    priority: 'medium',
                    dependencies: []
                });
                
                if (!result.success) {
                    await this.notify('warning', 'validation_failed', `Validation failed: ${command}`, undefined, { command });
                }
            }
            
            return { success: true, task };
        } catch (error: any) {
            return { success: false, error: `Validation failed: ${error.message}`, task };
        }
    }

    private calcProgress(completed: number, total: number): number {
        if (total === 0) return 100;
        return Math.round((completed / total) * 100);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    dispose(): void {
        this.disposed = true;
        this.terminalManager.dispose();
        Logger.info('Executor agent disposed');
    }
}
