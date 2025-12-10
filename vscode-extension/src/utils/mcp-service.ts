import { EventEmitter } from 'events';
import { Logger } from './logger';

export interface MCPMessage {
    id: string;
    agentId: string;
    type: 'request' | 'response' | 'notification' | 'error';
    action: string;
    payload: any;
    timestamp: Date;
    correlationId?: string;
}

export interface MCPTool {
    name: string;
    description: string;
    parameters: Record<string, any>;
    execute: (params: any) => Promise<any>;
}

export interface MCPContext {
    sessionId: string;
    sharedData: Map<string, any>;
    agentStates: Map<string, any>;
    tools: Map<string, MCPTool>;
    history: MCPMessage[];
}

export class MCPService extends EventEmitter {
    private static instance: MCPService;
    private context: MCPContext;
    private messageQueue: MCPMessage[] = [];
    private processing = false;

    private constructor() {
        super();
        this.context = {
            sessionId: this.generateSessionId(),
            sharedData: new Map(),
            agentStates: new Map(),
            tools: new Map(),
            history: []
        };
        
        this.registerDefaultTools();
        Logger.info('MCP Service initialized');
    }

    static getInstance(): MCPService {
        if (!MCPService.instance) {
            MCPService.instance = new MCPService();
        }
        return MCPService.instance;
    }

    private generateSessionId(): string {
        return `mcp-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private registerDefaultTools(): void {
        // File operations tool
        this.registerTool({
            name: 'file_operations',
            description: 'Perform file system operations',
            parameters: {
                operation: { type: 'string', enum: ['read', 'write', 'exists', 'delete'] },
                path: { type: 'string' },
                content: { type: 'string', optional: true }
            },
            execute: async (params) => {
                const fs = await import('fs');
                const path = await import('path');
                
                switch (params.operation) {
                    case 'read':
                        return fs.promises.readFile(params.path, 'utf8');
                    case 'write':
                        await fs.promises.mkdir(path.dirname(params.path), { recursive: true });
                        return fs.promises.writeFile(params.path, params.content || '');
                    case 'exists':
                        return fs.existsSync(params.path);
                    case 'delete':
                        return fs.promises.unlink(params.path);
                    default:
                        throw new Error(`Unknown file operation: ${params.operation}`);
                }
            }
        });

        // Data sharing tool
        this.registerTool({
            name: 'data_share',
            description: 'Share data between agents',
            parameters: {
                key: { type: 'string' },
                value: { type: 'any' },
                operation: { type: 'string', enum: ['set', 'get', 'delete'] }
            },
            execute: async (params) => {
                switch (params.operation) {
                    case 'set':
                        this.context.sharedData.set(params.key, params.value);
                        this.emit('dataChanged', { key: params.key, value: params.value });
                        return { success: true, message: `Data set for key: ${params.key}` };
                    case 'get':
                        return { value: this.context.sharedData.get(params.key) };
                    case 'delete':
                        this.context.sharedData.delete(params.key);
                        return { success: true, message: `Data deleted for key: ${params.key}` };
                    default:
                        throw new Error(`Unknown data operation: ${params.operation}`);
                }
            }
        });

        // Agent coordination tool
        this.registerTool({
            name: 'agent_coordination',
            description: 'Coordinate between different agents',
            parameters: {
                targetAgent: { type: 'string' },
                action: { type: 'string' },
                payload: { type: 'any' }
            },
            execute: async (params) => {
                const message: MCPMessage = {
                    id: this.generateMessageId(),
                    agentId: 'mcp-service',
                    type: 'request',
                    action: params.action,
                    payload: params.payload,
                    timestamp: new Date()
                };

                this.sendMessage(message);
                return { success: true, messageId: message.id };
            }
        });

        // AI-powered dataset search and download tool
        this.registerTool({
            name: 'ai_dataset_search',
            description: 'AI-powered search for job-specific datasets with automatic download',
            parameters: {
                jobDescription: { type: 'string' },
                jobTitle: { type: 'string' },
                targetPath: { type: 'string' },
                techStack: { type: 'array', items: { type: 'string' } }
            },
            execute: async (params) => {
                try {
                    const { ClaudeClient } = await import('./claude-client');
                    const fs = await import('fs');
                    const https = await import('https');
                    const path = await import('path');
                    
                    const claudeClient = ClaudeClient.getInstance();
                    
                    // Use AI to analyze job requirements and suggest appropriate datasets
                    const analysisPrompt = `Analyze this job description and suggest the most appropriate dataset for assessment:

Job Title: ${params.jobTitle}
Job Description: ${params.jobDescription}
Tech Stack: ${params.techStack.join(', ')}

Based on the job requirements, suggest:
1. Dataset type (classification, regression, nlp, computer_vision, time_series, etc.)
2. Specific dataset name and source URL (preferably from kaggle.com, uci.edu, or similar)
3. Why this dataset is appropriate for this role
4. Expected file format (CSV, JSON, etc.)

Respond in JSON format:
{
    "dataset_type": "classification",
    "dataset_name": "Iris Dataset",
    "dataset_url": "https://raw.githubusercontent.com/...",
    "file_format": "csv",
    "reasoning": "This dataset is perfect for testing classification skills...",
    "expected_features": 4,
    "expected_samples": 150
}`;

                    const aiResponse = await claudeClient.chatCompletion([
                        { role: 'user', content: analysisPrompt }
                    ], 'You are an expert data scientist who recommends appropriate datasets for technical assessments.');

                    // Parse AI response
                    let datasetInfo;
                    try {
                        // Extract JSON from AI response
                        const responseText = typeof aiResponse === 'string' ? aiResponse : aiResponse.content || String(aiResponse);
                        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            datasetInfo = JSON.parse(jsonMatch[0]);
                        } else {
                            throw new Error('No JSON found in AI response');
                        }
                    } catch (parseError) {
                        Logger.error('Failed to parse AI dataset recommendation:', parseError);
                        return { 
                            success: false, 
                            error: 'AI could not provide valid dataset recommendation',
                            suggestion: 'Consider using synthetic data generation instead'
                        };
                    }

                    // Download the recommended dataset
                    const fileName = `${datasetInfo.dataset_name.replace(/\s+/g, '_').toLowerCase()}.${datasetInfo.file_format}`;
                    const downloadPath = path.join(params.targetPath, fileName);

                    const downloadSuccess = await this.downloadDatasetFromUrl(datasetInfo.dataset_url, downloadPath);
                    
                    if (downloadSuccess) {
                        // Validate the downloaded file
                        const stats = fs.statSync(downloadPath);
                        if (stats.size > 0) {
                            const content = fs.readFileSync(downloadPath, 'utf8');
                            const lines = content.split('\n').filter(line => line.trim().length > 0);
                            
                            if (lines.length >= 2) {
                                return {
                                    success: true,
                                    dataset: {
                                        name: datasetInfo.dataset_name,
                                        type: datasetInfo.dataset_type,
                                        url: datasetInfo.dataset_url,
                                        reasoning: datasetInfo.reasoning,
                                        features: datasetInfo.expected_features,
                                        samples: datasetInfo.expected_samples
                                    },
                                    downloadPath: downloadPath,
                                    fileSize: stats.size,
                                    lines: lines.length,
                                    message: `AI-recommended dataset downloaded successfully: ${datasetInfo.dataset_name} (${stats.size} bytes, ${lines.length} lines)`
                                };
                            } else {
                                fs.unlinkSync(downloadPath);
                                return { 
                                    success: false, 
                                    error: `Downloaded file has insufficient data (only ${lines.length} lines)`,
                                    suggestion: 'Consider using synthetic data generation instead'
                                };
                            }
                        } else {
                            fs.unlinkSync(downloadPath);
                            return { 
                                success: false, 
                                error: 'Downloaded file is empty',
                                suggestion: 'Consider using synthetic data generation instead'
                            };
                        }
                    } else {
                        return { 
                            success: false, 
                            error: `Failed to download dataset from ${datasetInfo.dataset_url}`,
                            suggestion: 'Consider using synthetic data generation instead'
                        };
                    }
                } catch (error: any) {
                    Logger.error('AI dataset search failed:', error);
                    return { success: false, error: error.message };
                }
            }
        });

        // Helper method for downloading datasets from URLs
        this.registerTool({
            name: 'download_dataset_from_url',
            description: 'Download dataset from a specific URL',
            parameters: {
                url: { type: 'string' },
                targetPath: { type: 'string' }
            },
            execute: async (params) => {
                return await this.downloadDatasetFromUrl(params.url, params.targetPath);
            }
        });

        // Synthetic data generation tool as fallback
        this.registerTool({
            name: 'synthetic_data_generation',
            description: 'Generate synthetic datasets when real datasets are not available',
            parameters: {
                dataType: { type: 'string', enum: ['classification', 'regression', 'nlp', 'timeseries'] },
                targetPath: { type: 'string' },
                rows: { type: 'number', default: 1000 },
                features: { type: 'number', default: 5 }
            },
            execute: async (params) => {
                try {
                    const fs = await import('fs');
                    const path = await import('path');
                    
                    const targetPath = params.targetPath;
                    const rows = params.rows || 1000;
                    const features = params.features || 5;
                    
                    let csvContent = '';
                    let headers = [];
                    
                    switch (params.dataType) {
                        case 'classification':
                            // Generate classification dataset
                            headers = ['feature_1', 'feature_2', 'feature_3', 'feature_4', 'feature_5', 'target'];
                            csvContent = headers.join(',') + '\n';
                            
                            for (let i = 0; i < rows; i++) {
                                const row = [
                                    (Math.random() * 10).toFixed(2),
                                    (Math.random() * 10).toFixed(2),
                                    (Math.random() * 10).toFixed(2),
                                    (Math.random() * 10).toFixed(2),
                                    (Math.random() * 10).toFixed(2),
                                    Math.floor(Math.random() * 3) // 0, 1, or 2
                                ];
                                csvContent += row.join(',') + '\n';
                            }
                            break;
                            
                        case 'regression':
                            // Generate regression dataset
                            headers = ['feature_1', 'feature_2', 'feature_3', 'feature_4', 'feature_5', 'target'];
                            csvContent = headers.join(',') + '\n';
                            
                            for (let i = 0; i < rows; i++) {
                                const f1 = Math.random() * 10;
                                const f2 = Math.random() * 10;
                                const f3 = Math.random() * 10;
                                const f4 = Math.random() * 10;
                                const f5 = Math.random() * 10;
                                const target = (f1 * 2 + f2 * 1.5 + f3 * 0.8 + f4 * 1.2 + f5 * 0.9 + Math.random()).toFixed(2);
                                
                                const row = [
                                    f1.toFixed(2),
                                    f2.toFixed(2),
                                    f3.toFixed(2),
                                    f4.toFixed(2),
                                    f5.toFixed(2),
                                    target
                                ];
                                csvContent += row.join(',') + '\n';
                            }
                            break;
                            
                        case 'nlp':
                            // Generate text classification dataset
                            headers = ['text', 'label'];
                            csvContent = headers.join(',') + '\n';
                            
                            const categories = ['positive', 'negative', 'neutral'];
                            const sampleTexts = [
                                'This is a great product and I love it!',
                                'The service was terrible and I hate it.',
                                'The product is okay, nothing special.',
                                'Amazing quality and fast delivery!',
                                'Poor customer service and slow shipping.',
                                'Average product, meets expectations.',
                                'Excellent value for money!',
                                'Waste of money, completely useless.',
                                'Good product, would recommend.',
                                'Disappointing experience overall.'
                            ];
                            
                            for (let i = 0; i < rows; i++) {
                                const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
                                const label = categories[Math.floor(Math.random() * categories.length)];
                                csvContent += `"${text}",${label}\n`;
                            }
                            break;
                            
                        default:
                            return { success: false, error: `Unsupported data type: ${params.dataType}` };
                    }
                    
                    // Write the synthetic dataset
                    fs.writeFileSync(targetPath, csvContent);
                    
                    return {
                        success: true,
                        dataset: {
                            name: `synthetic_${params.dataType}_dataset`,
                            type: params.dataType,
                            rows: rows,
                            features: features,
                            size: `${Math.round(csvContent.length / 1024)}KB`
                        },
                        downloadPath: targetPath,
                        message: `Synthetic ${params.dataType} dataset generated successfully`
                    };
                } catch (error: any) {
                    Logger.error('Synthetic data generation failed:', error);
                    return { success: false, error: error.message };
                }
            }
        });

        // Environment setup tool
        this.registerTool({
            name: 'environment_setup',
            description: 'Set up development environment with proper dependencies',
            parameters: {
                projectPath: { type: 'string' },
                techStack: { type: 'array', items: { type: 'string' } },
                requiresDatasets: { type: 'boolean', default: false }
            },
            execute: async (params) => {
                try {
                    const fs = await import('fs');
                    const path = await import('path');
                    
                    const projectPath = params.projectPath;
                    const techStack = params.techStack || [];
                    const requiresDatasets = params.requiresDatasets || false;

                    // Create project structure
                    const dirs = ['src', 'tests', 'datasets', 'docs'];
                    for (const dir of dirs) {
                        const dirPath = path.join(projectPath, dir);
                        if (!fs.existsSync(dirPath)) {
                            fs.mkdirSync(dirPath, { recursive: true });
                        }
                    }

                    // Create requirements.txt based on tech stack
                    let requirements = ['pytest>=7.0.0', 'black>=22.0.0', 'flake8>=4.0.0'];
                    
                    if (techStack.includes('pandas')) requirements.push('pandas>=1.5.0');
                    if (techStack.includes('numpy')) requirements.push('numpy>=1.21.0');
                    if (techStack.includes('sklearn') || techStack.includes('scikit-learn')) requirements.push('scikit-learn>=1.1.0');
                    if (techStack.includes('matplotlib')) requirements.push('matplotlib>=3.5.0');
                    if (techStack.includes('seaborn')) requirements.push('seaborn>=0.11.0');
                    if (techStack.includes('requests')) requirements.push('requests>=2.28.0');
                    if (techStack.includes('flask')) requirements.push('flask>=2.2.0');
                    if (techStack.includes('sqlalchemy')) requirements.push('sqlalchemy>=1.4.0');

                    const requirementsPath = path.join(projectPath, 'requirements.txt');
                    fs.writeFileSync(requirementsPath, requirements.join('\n'));

                    // Create setup.py
                    const setupContent = `from setuptools import setup, find_packages

setup(
    name="assessment-project",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        line.strip() for line in open('requirements.txt').readlines()
        if line.strip() and not line.startswith('#')
    ],
    python_requires=">=3.8",
)
`;
                    fs.writeFileSync(path.join(projectPath, 'setup.py'), setupContent);

                    // Create .env.example
                    const envContent = `# Environment Variables
PYTHONPATH=.
DATASET_PATH=./datasets/
LOG_LEVEL=INFO
`;
                    fs.writeFileSync(path.join(projectPath, '.env.example'), envContent);

                    return {
                        success: true,
                        projectPath: projectPath,
                        requirements: requirements,
                        requiresDatasets: requiresDatasets,
                        message: 'Environment setup completed successfully'
                    };
                } catch (error: any) {
                    Logger.error('Environment setup failed:', error);
                    return { success: false, error: error.message };
                }
            }
        });

        // Terminal execution tool for full AI access
        this.registerTool({
            name: 'terminal_execution',
            description: 'Execute terminal commands with full AI access for environment setup and testing',
            parameters: {
                command: { type: 'string' },
                workingDirectory: { type: 'string', optional: true },
                timeout: { type: 'number', optional: true, default: 30000 }
            },
            execute: async (params) => {
                try {
                    const { TerminalManager } = await import('./terminal-manager');
                    const path = await import('path');
                    
                    // Use project path or provided working directory
                    const workingDir = params.workingDirectory || '/tmp/lodeai-assessment';
                    
                    // Create terminal manager for this execution
                    const terminalManager = new TerminalManager(workingDir);
                    
                    // Execute the command
                    const result = await terminalManager.executeCommand(params.command, workingDir);
                    
                    // Clean up terminal
                    setTimeout(() => terminalManager.dispose(), 1000);
                    
                    return {
                        success: result.success,
                        output: result.output,
                        error: result.error,
                        command: params.command,
                        workingDirectory: workingDir
                    };
                } catch (error: any) {
                    Logger.error('Terminal execution failed:', error);
                    return { success: false, error: error.message };
                }
            }
        });

        // Enhanced environment setup with terminal access
        this.registerTool({
            name: 'full_environment_setup',
            description: 'Set up complete development environment with full terminal access',
            parameters: {
                projectPath: { type: 'string' },
                techStack: { type: 'array', items: { type: 'string' } },
                requiresDatasets: { type: 'boolean', default: false },
                jobType: { type: 'string', optional: true }
            },
            execute: async (params) => {
                try {
                    const fs = await import('fs');
                    const path = await import('path');
                    const { TerminalManager } = await import('./terminal-manager');
                    
                    const projectPath = params.projectPath;
                    const techStack = params.techStack || [];
                    const requiresDatasets = params.requiresDatasets || false;
                    const jobType = params.jobType || 'general';

                    // Create project structure
                    const dirs = ['src', 'tests', 'datasets', 'docs', 'scripts'];
                    for (const dir of dirs) {
                        const dirPath = path.join(projectPath, dir);
                        if (!fs.existsSync(dirPath)) {
                            fs.mkdirSync(dirPath, { recursive: true });
                        }
                    }

                    // Create terminal manager for environment setup
                    const terminalManager = new TerminalManager(projectPath);

                    // Create requirements.txt based on tech stack
                    let requirements = ['pytest>=7.0.0', 'black>=22.0.0', 'flake8>=4.0.0'];
                    
                    if (techStack.includes('pandas')) requirements.push('pandas>=1.5.0');
                    if (techStack.includes('numpy')) requirements.push('numpy>=1.21.0');
                    if (techStack.includes('sklearn') || techStack.includes('scikit-learn')) requirements.push('scikit-learn>=1.1.0');
                    if (techStack.includes('matplotlib')) requirements.push('matplotlib>=3.5.0');
                    if (techStack.includes('seaborn')) requirements.push('seaborn>=0.11.0');
                    if (techStack.includes('requests')) requirements.push('requests>=2.28.0');
                    if (techStack.includes('flask')) requirements.push('flask>=2.2.0');
                    if (techStack.includes('sqlalchemy')) requirements.push('sqlalchemy>=1.4.0');
                    if (techStack.includes('jupyter')) requirements.push('jupyter>=1.0.0');

                    const requirementsPath = path.join(projectPath, 'requirements.txt');
                    fs.writeFileSync(requirementsPath, requirements.join('\n'));

                    // Create setup.py
                    const setupContent = `from setuptools import setup, find_packages

setup(
    name="assessment-project",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        line.strip() for line in open('requirements.txt').readlines()
        if line.strip() and not line.startswith('#')
    ],
    python_requires=">=3.8",
)
`;
                    fs.writeFileSync(path.join(projectPath, 'setup.py'), setupContent);

                    // Create .env.example
                    const envContent = `# Environment Variables
PYTHONPATH=.
DATASET_PATH=./datasets/
LOG_LEVEL=INFO
API_KEY=your_api_key_here
DATABASE_URL=your_database_url_here
`;
                    fs.writeFileSync(path.join(projectPath, '.env.example'), envContent);

                    // Create virtual environment using terminal
                    const venvResult = await terminalManager.executeCommand('python -m venv assessment_env');
                    
                    // Install dependencies using terminal
                    const pipResult = await terminalManager.executeCommand('assessment_env/bin/pip install --upgrade pip && assessment_env/bin/pip install -r requirements.txt');

                    // Create setup script
                    const setupScript = `#!/bin/bash
# LodeAI Assessment Environment Setup Script
set -e

echo "Setting up assessment environment..."

# Activate virtual environment
source assessment_env/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Run initial tests
python -m pytest tests/ -v || echo "No tests found yet"

echo "Environment setup complete!"
echo "To activate: source assessment_env/bin/activate"
`;
                    fs.writeFileSync(path.join(projectPath, 'setup_env.sh'), setupScript);
                    fs.chmodSync(path.join(projectPath, 'setup_env.sh'), '755');

                    // Clean up terminal
                    setTimeout(() => terminalManager.dispose(), 2000);

                    return {
                        success: true,
                        projectPath: projectPath,
                        requirements: requirements,
                        requiresDatasets: requiresDatasets,
                        venvCreated: venvResult.success,
                        dependenciesInstalled: pipResult.success,
                        message: 'Full environment setup completed with terminal access'
                    };
                } catch (error: any) {
                    Logger.error('Full environment setup failed:', error);
                    return { success: false, error: error.message };
                }
            }
        });
    }

    registerTool(tool: MCPTool): void {
        this.context.tools.set(tool.name, tool);
        Logger.info(`MCP Tool registered: ${tool.name}`);
    }

    async executeTool(toolName: string, params: any, agentId: string): Promise<any> {
        const tool = this.context.tools.get(toolName);
        if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
        }

        Logger.info(`Agent ${agentId} executing tool: ${toolName}`);
        
        try {
            const result = await tool.execute(params);
            
            // Log the tool execution
            const message: MCPMessage = {
                id: this.generateMessageId(),
                agentId,
                type: 'notification',
                action: 'tool_execution',
                payload: { toolName, params, result },
                timestamp: new Date()
            };
            
            this.addToHistory(message);
            return result;
        } catch (error: any) {
            Logger.error(`Tool execution failed: ${toolName}`, error);
            throw error;
        }
    }

    sendMessage(message: MCPMessage): void {
        this.messageQueue.push(message);
        this.addToHistory(message);
        this.emit('message', message);
        
        if (!this.processing) {
            this.processMessages();
        }
    }

    private async processMessages(): Promise<void> {
        if (this.processing || this.messageQueue.length === 0) {
            return;
        }

        this.processing = true;
        
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift()!;
            await this.handleMessage(message);
        }
        
        this.processing = false;
    }

    private async handleMessage(message: MCPMessage): Promise<void> {
        Logger.info(`Processing MCP message: ${message.type} from ${message.agentId}`);
        
        // Emit specific event based on message type
        this.emit(`message:${message.type}`, message);
        this.emit(`message:${message.action}`, message);
    }

    private addToHistory(message: MCPMessage): void {
        this.context.history.push(message);
        
        // Keep only last 1000 messages to prevent memory issues
        if (this.context.history.length > 1000) {
            this.context.history = this.context.history.slice(-1000);
        }
    }

    private generateMessageId(): string {
        return `mcp-msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    getContext(): MCPContext {
        return this.context;
    }

    getSharedData(key: string): any {
        return this.context.sharedData.get(key);
    }

    setSharedData(key: string, value: any): void {
        this.context.sharedData.set(key, value);
        this.emit('dataChanged', { key, value });
    }

    getAgentState(agentId: string): any {
        return this.context.agentStates.get(agentId);
    }

    setAgentState(agentId: string, state: any): void {
        this.context.agentStates.set(agentId, state);
        this.emit('agentStateChanged', { agentId, state });
    }

    getAvailableTools(): string[] {
        return Array.from(this.context.tools.keys());
    }

    getMessageHistory(limit: number = 50): MCPMessage[] {
        return this.context.history.slice(-limit);
    }

    clearHistory(): void {
        this.context.history = [];
        Logger.info('MCP message history cleared');
    }

    /**
     * Helper method to download datasets from URLs
     */
    private async downloadDatasetFromUrl(url: string, targetPath: string): Promise<boolean> {
        return new Promise((resolve) => {
            const fs = require('fs');
            const https = require('https');
            const http = require('http');
            
            const file = fs.createWriteStream(targetPath);
            let totalBytes = 0;
            
            const request = (url.startsWith('https:') ? https : http).get(url, (response: any) => {
                if (response.statusCode !== 200) {
                    Logger.error(`Failed to download dataset: HTTP ${response.statusCode} for ${url}`);
                    fs.unlink(targetPath, () => resolve(false));
                    return;
                }

                response.on('data', (chunk: any) => {
                    totalBytes += chunk.length;
                });

                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    
                    // Validate file size and content
                    if (totalBytes === 0) {
                        Logger.error(`Downloaded file is empty: ${targetPath}`);
                        fs.unlink(targetPath, () => resolve(false));
                        return;
                    }
                    
                    // Check if file actually exists and has content
                    if (fs.existsSync(targetPath)) {
                        const stats = fs.statSync(targetPath);
                        if (stats.size === 0) {
                            Logger.error(`Downloaded file has 0 bytes: ${targetPath}`);
                            fs.unlink(targetPath, () => resolve(false));
                            return;
                        }
                        
                        // Read first few lines to ensure it's not just headers
                        const content = fs.readFileSync(targetPath, 'utf8');
                        const lines = content.split('\n').filter((line: string) => line.trim().length > 0);
                        
                        if (lines.length < 2) {
                            Logger.error(`Downloaded file has insufficient data (only ${lines.length} lines): ${targetPath}`);
                            fs.unlink(targetPath, () => resolve(false));
                            return;
                        }
                        
                        Logger.info(`Dataset downloaded successfully: ${targetPath} (${stats.size} bytes, ${lines.length} lines)`);
                        resolve(true);
                    } else {
                        Logger.error(`Downloaded file does not exist: ${targetPath}`);
                        resolve(false);
                    }
                });
            });

            request.on('error', (err: any) => {
                Logger.error(`Download error for ${url}: ${err.message}`);
                fs.unlink(targetPath, () => resolve(false));
            });

            request.setTimeout(30000, () => {
                request.destroy();
                Logger.error(`Download timeout for ${url}`);
                fs.unlink(targetPath, () => resolve(false));
            });
        });
    }
}
