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
exports.DynamicEnvironmentManager = void 0;
const vscode = __importStar(require("vscode"));
const mcp_service_1 = require("./mcp-service");
const logger_1 = require("./logger");
const powerbi_webview_1 = require("./webview-providers/powerbi-webview");
const tableau_webview_1 = require("./webview-providers/tableau-webview");
const sql_environment_1 = require("./webview-providers/sql-environment");
const python_jupyter_1 = require("./webview-providers/python-jupyter");
class DynamicEnvironmentManager {
    constructor() {
        this.activeEnvironments = new Map();
        this.webviewProviders = new Map();
        this.mcpService = mcp_service_1.MCPService.getInstance();
        this.initializeWebviewProviders();
        this.registerMCPTools();
    }
    initializeWebviewProviders() {
        this.webviewProviders.set('powerbi', powerbi_webview_1.PowerBIWebviewProvider);
        this.webviewProviders.set('tableau', tableau_webview_1.TableauWebviewProvider);
        this.webviewProviders.set('sql', sql_environment_1.SQLEnvironmentProvider);
        this.webviewProviders.set('python', python_jupyter_1.PythonJupyterProvider);
    }
    getSkillKey(skillName) {
        const skillLower = skillName.toLowerCase();
        if (skillLower.includes('power bi') || skillLower.includes('powerbi')) {
            return 'powerbi';
        }
        else if (skillLower.includes('tableau')) {
            return 'tableau';
        }
        else if (skillLower.includes('sql') || skillLower.includes('database')) {
            return 'sql';
        }
        else if (skillLower.includes('python') || skillLower.includes('jupyter') || skillLower.includes('data science')) {
            return 'python';
        }
        else {
            // Default fallback
            return skillLower.replace(/\s+/g, '');
        }
    }
    registerMCPTools() {
        // Register dynamic environment setup tool
        this.mcpService.registerTool({
            name: 'setup_dynamic_environment',
            description: 'Set up assessment environment based on job requirements',
            parameters: {
                jobAnalysis: { type: 'object' },
                projectPath: { type: 'string' }
            },
            execute: async (params) => {
                return await this.setupAssessmentEnvironment(params.jobAnalysis, params.projectPath);
            }
        });
        // Register skill-specific tool launcher
        this.mcpService.registerTool({
            name: 'launch_skill_assessment',
            description: 'Launch specific skill assessment environment',
            parameters: {
                skill: { type: 'object' },
                assessmentType: { type: 'string' },
                datasets: { type: 'array', items: { type: 'string' } }
            },
            execute: async (params) => {
                return await this.launchSkillAssessment(params.skill, params.assessmentType, params.datasets);
            }
        });
        // Register dataset preparation tool
        this.mcpService.registerTool({
            name: 'prepare_assessment_datasets',
            description: 'Prepare and load datasets for assessment',
            parameters: {
                datasets: { type: 'array', items: { type: 'string' } },
                targetPath: { type: 'string' },
                skillType: { type: 'string' }
            },
            execute: async (params) => {
                return await this.prepareDatasets(params.datasets, params.targetPath, params.skillType);
            }
        });
    }
    async setupAssessmentEnvironment(jobAnalysis, projectPath) {
        const environmentId = `env-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        logger_1.Logger.info(`Setting up dynamic assessment environment: ${environmentId}`);
        logger_1.Logger.info(`Primary skills: ${jobAnalysis.primarySkills.map(s => s.skill).join(', ')}`);
        try {
            // Prepare datasets for all required skills
            const allDatasets = [
                ...jobAnalysis.primarySkills.flatMap(s => s.environment.datasets || []),
                ...jobAnalysis.secondarySkills.flatMap(s => s.environment.datasets || [])
            ];
            if (allDatasets.length > 0) {
                await this.prepareDatasets(allDatasets, projectPath, 'multi-skill');
            }
            // Set up primary skill environment
            const primarySkill = jobAnalysis.primarySkills[0]; // Focus on primary skill
            if (primarySkill) {
                const skillResult = await this.launchSkillAssessment(primarySkill, primarySkill.assessmentType, primarySkill.environment.datasets || []);
                if (skillResult.success) {
                    const result = {
                        success: true,
                        environmentId,
                        webviewPanel: skillResult.webviewPanel,
                        dockerContainer: skillResult.dockerContainer,
                        tools: [primarySkill.skill, ...primarySkill.tools],
                        datasets: primarySkill.environment.datasets || []
                    };
                    this.activeEnvironments.set(environmentId, result);
                    // Create assessment tasks based on skill requirements
                    await this.generateAssessmentTasks(jobAnalysis, projectPath);
                    return result;
                }
            }
            return {
                success: false,
                environmentId,
                tools: [],
                datasets: [],
                error: 'Failed to set up primary skill environment'
            };
        }
        catch (error) {
            logger_1.Logger.error('Environment setup failed:', error);
            return {
                success: false,
                environmentId,
                tools: [],
                datasets: [],
                error: error.message
            };
        }
    }
    async launchSkillAssessment(skill, assessmentType, datasets) {
        logger_1.Logger.info(`Launching assessment for skill: ${skill.skill}`);
        switch (skill.environment.type) {
            case 'webview':
                return await this.setupWebviewEnvironment(skill, assessmentType, datasets);
            case 'docker':
                return await this.setupDockerEnvironment(skill, assessmentType, datasets);
            case 'cloud':
                return await this.setupCloudEnvironment(skill, assessmentType, datasets);
            default:
                return await this.setupDockerEnvironment(skill, assessmentType, datasets);
        }
    }
    async setupWebviewEnvironment(skill, assessmentType, datasets) {
        const skillKey = this.getSkillKey(skill.skill);
        const ProviderClass = this.webviewProviders.get(skillKey);
        if (!ProviderClass) {
            throw new Error(`No webview provider found for skill: ${skill.skill}`);
        }
        // Create webview panel
        const panel = vscode.window.createWebviewPanel(`lodeai-${skillKey}`, `LodeAI Assessment - ${skill.skill}`, vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: []
        });
        // Initialize provider
        const provider = new ProviderClass(panel.webview);
        await provider.initialize(skill, datasets, assessmentType);
        // Set webview content
        panel.webview.html = provider.getWebviewContent();
        // Handle messages from webview
        panel.webview.onDidReceiveMessage(async (message) => {
            await provider.handleMessage(message);
        }, undefined, []);
        return {
            success: true,
            environmentId: `webview-${skillKey}-${Date.now()}`,
            webviewPanel: panel,
            tools: skill.tools,
            datasets
        };
    }
    async setupDockerEnvironment(skill, assessmentType, datasets) {
        logger_1.Logger.info(`Setting up Docker environment for ${skill.skill}`);
        // Use MCP terminal execution to set up Docker environment
        const setupCommands = this.getDockerSetupCommands(skill, datasets);
        const containerId = `lodeai-${skill.skill.toLowerCase().replace(/\s+/g, '')}-${Date.now()}`;
        for (const command of setupCommands) {
            const result = await this.mcpService.executeTool('terminal_execution', {
                command: command,
                workingDirectory: '/tmp/lodeai-assessment'
            }, 'dynamic-environment-manager');
            if (!result.success) {
                logger_1.Logger.warn(`Docker setup command failed: ${command}`);
            }
        }
        return {
            success: true,
            environmentId: containerId,
            dockerContainer: containerId,
            tools: skill.tools,
            datasets
        };
    }
    async setupCloudEnvironment(skill, assessmentType, datasets) {
        logger_1.Logger.info(`Setting up cloud environment for ${skill.skill}`);
        // For cloud environments, we'll create a webview that embeds the cloud console
        const panel = vscode.window.createWebviewPanel(`lodeai-cloud-${skill.skill.toLowerCase().replace(/\s+/g, '')}`, `LodeAI Cloud Assessment - ${skill.skill}`, vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        // Generate cloud console HTML
        panel.webview.html = this.generateCloudConsoleHTML(skill, assessmentType);
        return {
            success: true,
            environmentId: `cloud-${skill.skill.toLowerCase().replace(/\s+/g, '')}-${Date.now()}`,
            webviewPanel: panel,
            tools: skill.tools,
            datasets
        };
    }
    getDockerSetupCommands(skill, datasets) {
        const commands = [];
        const skillName = skill.skill.toLowerCase();
        if (skillName.includes('python') || skillName.includes('data science')) {
            commands.push('docker run -d --name python-assessment -p 8888:8888 -v $(pwd):/workspace jupyter/scipy-notebook', 'docker exec python-assessment pip install pandas numpy matplotlib seaborn scikit-learn', 'docker exec python-assessment jupyter notebook --generate-config --allow-root');
        }
        else if (skillName.includes('sql') || skillName.includes('database')) {
            commands.push('docker run -d --name postgres-assessment -e POSTGRES_PASSWORD=assessment -p 5432:5432 postgres:13', 'docker exec postgres-assessment psql -U postgres -c "CREATE DATABASE assessment_db;"');
        }
        else if (skillName.includes('react') || skillName.includes('frontend')) {
            commands.push('docker run -d --name node-assessment -p 3000:3000 -v $(pwd):/app node:16', 'docker exec node-assessment npm install -g create-react-app', 'docker exec node-assessment npx create-react-app assessment-app');
        }
        return commands;
    }
    generateCloudConsoleHTML(skill, assessmentType) {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${skill.skill} Assessment</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #1e1e1e; color: #ffffff; }
        .header { background: #2d2d30; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .console { background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 20px; min-height: 400px; }
        .iframe-container { width: 100%; height: 600px; border: none; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${skill.skill} Assessment Environment</h1>
        <p>Assessment Type: ${assessmentType}</p>
        <p>Available Tools: ${skill.tools.join(', ')}</p>
    </div>
    <div class="console">
        <h3>Cloud Console Access</h3>
        <p>This environment provides access to ${skill.skill} tools for your assessment.</p>
        <iframe src="${this.getCloudConsoleURL(skill)}" class="iframe-container"></iframe>
    </div>
</body>
</html>`;
    }
    getCloudConsoleURL(skill) {
        const skillName = skill.skill.toLowerCase();
        if (skillName.includes('aws')) {
            return 'https://console.aws.amazon.com/';
        }
        else if (skillName.includes('azure')) {
            return 'https://portal.azure.com/';
        }
        else if (skillName.includes('gcp')) {
            return 'https://console.cloud.google.com/';
        }
        else {
            return 'data:text/html,<h1>Cloud Console Not Available</h1>';
        }
    }
    async prepareDatasets(datasets, targetPath, skillType) {
        logger_1.Logger.info(`Preparing ${datasets.length} datasets for ${skillType} assessment`);
        for (const dataset of datasets) {
            try {
                // Use MCP AI dataset search to find appropriate datasets
                const result = await this.mcpService.executeTool('ai_dataset_search', {
                    jobDescription: `${skillType} assessment requiring ${dataset}`,
                    jobTitle: `${skillType} Developer`,
                    targetPath: targetPath,
                    techStack: [skillType.toLowerCase()]
                }, 'dynamic-environment-manager');
                if (!result.success) {
                    // Fallback to synthetic data generation
                    await this.mcpService.executeTool('synthetic_data_generation', {
                        dataType: this.getDataTypeFromDataset(dataset),
                        targetPath: `${targetPath}/${dataset}`,
                        rows: 1000,
                        features: 5
                    }, 'dynamic-environment-manager');
                }
            }
            catch (error) {
                logger_1.Logger.warn(`Failed to prepare dataset ${dataset}:`, error);
            }
        }
    }
    getDataTypeFromDataset(dataset) {
        if (dataset.includes('sales') || dataset.includes('customer')) {
            return 'classification';
        }
        else if (dataset.includes('revenue') || dataset.includes('price')) {
            return 'regression';
        }
        else if (dataset.includes('text') || dataset.includes('review')) {
            return 'nlp';
        }
        else {
            return 'classification';
        }
    }
    async generateAssessmentTasks(jobAnalysis, projectPath) {
        logger_1.Logger.info('Generating assessment tasks based on skill requirements');
        const tasks = [];
        for (const skill of jobAnalysis.primarySkills) {
            const task = await this.createSkillAssessmentTask(skill, jobAnalysis.assessmentComplexity);
            tasks.push(task);
        }
        // Save tasks to project
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const tasksPath = path.join(projectPath, 'assessment_tasks.json');
        fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));
    }
    async createSkillAssessmentTask(skill, complexity) {
        // This would integrate with the existing planner agent to create specific tasks
        return {
            id: `task-${skill.skill.toLowerCase().replace(/\s+/g, '')}-${Date.now()}`,
            skill: skill.skill,
            type: skill.assessmentType,
            complexity,
            description: `Create a ${skill.assessmentType} using ${skill.skill}`,
            requirements: skill.tools,
            datasets: skill.environment.datasets || [],
            estimatedTime: complexity === 'basic' ? 30 : complexity === 'intermediate' ? 60 : 90
        };
    }
    getActiveEnvironments() {
        return this.activeEnvironments;
    }
    disposeEnvironment(environmentId) {
        const environment = this.activeEnvironments.get(environmentId);
        if (environment) {
            if (environment.webviewPanel) {
                environment.webviewPanel.dispose();
            }
            // Add Docker container cleanup if needed
            this.activeEnvironments.delete(environmentId);
        }
    }
    dispose() {
        // Clean up all active environments
        for (const [id, environment] of this.activeEnvironments) {
            this.disposeEnvironment(id);
        }
        this.activeEnvironments.clear();
    }
}
exports.DynamicEnvironmentManager = DynamicEnvironmentManager;
//# sourceMappingURL=dynamic-environment-manager.js.map