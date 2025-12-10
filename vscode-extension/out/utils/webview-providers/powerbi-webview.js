"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PowerBIWebviewProvider = void 0;
const logger_1 = require("../logger");
class PowerBIWebviewProvider {
    constructor(webview) {
        this.webview = webview;
    }
    async initialize(skill, datasets, assessmentType) {
        this.skill = skill;
        this.datasets = datasets;
        this.assessmentType = assessmentType;
        logger_1.Logger.info(`Initializing Power BI webview for ${assessmentType} assessment`);
    }
    getWebviewContent() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Power BI Assessment</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            background: #1e1e1e; 
            color: #ffffff; 
            height: 100vh; 
            display: flex; 
            flex-direction: column;
        }
        .header { 
            background: #2d2d30; 
            padding: 16px 20px; 
            border-bottom: 1px solid #3e3e42;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 { font-size: 18px; font-weight: 600; }
        .header .skill-badge { 
            background: #0078d4; 
            color: white; 
            padding: 4px 12px; 
            border-radius: 12px; 
            font-size: 12px;
        }
        .main-content { 
            flex: 1; 
            display: flex; 
            overflow: hidden;
        }
        .sidebar { 
            width: 300px; 
            background: #252526; 
            border-right: 1px solid #3e3e42;
            padding: 20px;
            overflow-y: auto;
        }
        .workspace { 
            flex: 1; 
            display: flex; 
            flex-direction: column;
            background: #1e1e1e;
        }
        .toolbar { 
            background: #2d2d30; 
            padding: 12px 20px; 
            border-bottom: 1px solid #3e3e42;
            display: flex;
            gap: 12px;
            align-items: center;
        }
        .btn { 
            background: #0078d4; 
            color: white; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 4px; 
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        .btn:hover { background: #106ebe; }
        .btn.secondary { background: #6c757d; }
        .btn.secondary:hover { background: #5a6268; }
        .powerbi-embed { 
            flex: 1; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            background: #f8f9fa;
            color: #333;
            position: relative;
        }
        .dataset-list { margin-bottom: 20px; }
        .dataset-item { 
            background: #3c3c3c; 
            padding: 12px; 
            margin: 8px 0; 
            border-radius: 6px; 
            cursor: pointer;
            transition: background 0.2s;
        }
        .dataset-item:hover { background: #4c4c4c; }
        .dataset-item.active { background: #0078d4; }
        .assessment-panel { 
            background: #2d2d30; 
            padding: 16px; 
            border-radius: 8px; 
            margin-bottom: 20px;
        }
        .assessment-panel h3 { margin-bottom: 12px; color: #ffffff; }
        .assessment-panel p { color: #cccccc; line-height: 1.5; }
        .task-list { list-style: none; }
        .task-list li { 
            padding: 8px 0; 
            border-bottom: 1px solid #3e3e42; 
            color: #cccccc;
        }
        .task-list li:last-child { border-bottom: none; }
        .task-list li.completed { color: #4caf50; text-decoration: line-through; }
        .iframe-container { 
            width: 100%; 
            height: 100%; 
            border: none; 
            background: white;
        }
        .loading { 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            color: #666;
        }
        .spinner { 
            width: 40px; 
            height: 40px; 
            border: 4px solid #f3f3f3; 
            border-top: 4px solid #0078d4; 
            border-radius: 50%; 
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .status-bar { 
            background: #0078d4; 
            color: white; 
            padding: 8px 20px; 
            font-size: 12px;
            display: flex;
            justify-content: space-between;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Power BI Assessment</h1>
        <span class="skill-badge">${this.skill.skill}</span>
    </div>
    
    <div class="main-content">
        <div class="sidebar">
            <div class="assessment-panel">
                <h3>Assessment: ${this.assessmentType}</h3>
                <p>Create a comprehensive Power BI dashboard using the provided datasets. Focus on data visualization, business insights, and user experience.</p>
            </div>
            
            <div class="dataset-list">
                <h3 style="color: #ffffff; margin-bottom: 12px;">Available Datasets</h3>
                ${this.datasets.map(dataset => `
                    <div class="dataset-item" onclick="selectDataset('${dataset}')">
                        <strong>${dataset}</strong>
                        <div style="font-size: 12px; color: #cccccc; margin-top: 4px;">
                            Click to load into Power BI
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="assessment-panel">
                <h3>Assessment Tasks</h3>
                <ul class="task-list" id="taskList">
                    <li onclick="toggleTask(this)">Connect to data sources</li>
                    <li onclick="toggleTask(this)">Create data model relationships</li>
                    <li onclick="toggleTask(this)">Build key performance indicators</li>
                    <li onclick="toggleTask(this)">Design interactive visualizations</li>
                    <li onclick="toggleTask(this)">Apply consistent formatting</li>
                    <li onclick="toggleTask(this)">Create drill-through functionality</li>
                    <li onclick="toggleTask(this)">Add filters and slicers</li>
                    <li onclick="toggleTask(this)">Test dashboard performance</li>
                </ul>
            </div>
        </div>
        
        <div class="workspace">
            <div class="toolbar">
                <button class="btn" onclick="loadPowerBI()">Launch Power BI</button>
                <button class="btn secondary" onclick="loadSampleData()">Load Sample Data</button>
                <button class="btn secondary" onclick="createNewReport()">New Report</button>
                <button class="btn secondary" onclick="saveWork()">Save Work</button>
                <div style="margin-left: auto; color: #cccccc;">
                    <span id="selectedDataset">No dataset selected</span>
                </div>
            </div>
            
            <div class="powerbi-embed" id="powerbiContainer">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Loading Power BI environment...</p>
                    <p style="font-size: 12px; margin-top: 8px;">Click "Launch Power BI" to begin</p>
                </div>
            </div>
        </div>
    </div>
    
    <div class="status-bar">
        <span>Power BI Assessment Environment</span>
        <span id="status">Ready</span>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentDataset = null;
        let powerBILoaded = false;

        function selectDataset(dataset) {
            currentDataset = dataset;
            document.getElementById('selectedDataset').textContent = dataset;
            
            // Update UI
            document.querySelectorAll('.dataset-item').forEach(item => {
                item.classList.remove('active');
            });
            event.target.closest('.dataset-item').classList.add('active');
            
            updateStatus(\`Selected dataset: \${dataset}\`);
        }

        function loadPowerBI() {
            updateStatus('Loading Power BI...');
            
            // In a real implementation, this would embed Power BI Desktop or Service
            // For now, we'll create a mock Power BI interface
            const container = document.getElementById('powerbiContainer');
            container.innerHTML = \`
                <div style="width: 100%; height: 100%; background: white; color: #333;">
                    <div style="padding: 20px; height: 100%; display: flex; flex-direction: column;">
                        <div style="border-bottom: 1px solid #ddd; padding-bottom: 16px; margin-bottom: 20px;">
                            <h2 style="color: #333; margin-bottom: 8px;">Power BI Workspace</h2>
                            <p style="color: #666;">Create your assessment dashboard here</p>
                        </div>
                        
                        <div style="flex: 1; display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px;">
                                <h3 style="margin-bottom: 12px;">Data Fields</h3>
                                <div id="dataFields" style="max-height: 300px; overflow-y: auto;">
                                    \${currentDataset ? \`
                                        <div style="padding: 8px; background: #f0f8ff; border-radius: 4px; margin: 4px 0;">
                                            <strong>\${currentDataset}</strong>
                                        </div>
                                        <div style="padding: 4px 8px; color: #666;">Sample fields from \${currentDataset}:</div>
                                        <div style="padding: 4px 8px;">• Date</div>
                                        <div style="padding: 4px 8px;">• Revenue</div>
                                        <div style="padding: 4px 8px;">• Category</div>
                                        <div style="padding: 4px 8px;">• Region</div>
                                        <div style="padding: 4px 8px;">• Customer Count</div>
                                    \` : 'Select a dataset to see fields'}
                                </div>
                            </div>
                            
                            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px;">
                                <h3 style="margin-bottom: 12px;">Visualization Canvas</h3>
                                <div style="height: 400px; background: #fafafa; border: 2px dashed #ccc; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #666;">
                                    <div style="text-align: center;">
                                        <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
                                        <p>Drag fields here to create visualizations</p>
                                        <p style="font-size: 12px; margin-top: 8px;">Charts, tables, and KPIs will appear here</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #ddd;">
                            <h3>Assessment Progress</h3>
                            <div style="display: flex; gap: 16px; margin-top: 12px;">
                                <button class="btn" onclick="submitAssessment()">Submit Assessment</button>
                                <button class="btn secondary" onclick="previewDashboard()">Preview Dashboard</button>
                                <button class="btn secondary" onclick="exportReport()">Export Report</button>
                            </div>
                        </div>
                    </div>
                </div>
            \`;
            
            powerBILoaded = true;
            updateStatus('Power BI loaded successfully');
            
            // Notify VS Code extension
            vscode.postMessage({
                type: 'powerbiLoaded',
                dataset: currentDataset,
                assessmentType: '${this.assessmentType}'
            });
        }

        function loadSampleData() {
            if (!currentDataset) {
                alert('Please select a dataset first');
                return;
            }
            
            updateStatus(\`Loading sample data from \${currentDataset}...\`);
            
            // Simulate data loading
            setTimeout(() => {
                updateStatus(\`Sample data loaded from \${currentDataset}\`);
                vscode.postMessage({
                    type: 'sampleDataLoaded',
                    dataset: currentDataset
                });
            }, 2000);
        }

        function createNewReport() {
            updateStatus('Creating new report...');
            
            // Reset the workspace for a new report
            loadPowerBI();
        }

        function saveWork() {
            updateStatus('Saving work...');
            
            // Simulate save operation
            setTimeout(() => {
                updateStatus('Work saved successfully');
                vscode.postMessage({
                    type: 'workSaved',
                    timestamp: new Date().toISOString()
                });
            }, 1000);
        }

        function toggleTask(element) {
            element.classList.toggle('completed');
            
            const completedTasks = document.querySelectorAll('.task-list li.completed').length;
            const totalTasks = document.querySelectorAll('.task-list li').length;
            
            updateStatus(\`Progress: \${completedTasks}/\${totalTasks} tasks completed\`);
            
            vscode.postMessage({
                type: 'taskCompleted',
                task: element.textContent,
                progress: Math.round((completedTasks / totalTasks) * 100)
            });
        }

        function submitAssessment() {
            const completedTasks = document.querySelectorAll('.task-list li.completed').length;
            const totalTasks = document.querySelectorAll('.task-list li').length;
            
            if (completedTasks < totalTasks) {
                if (!confirm(\`You have completed \${completedTasks} out of \${totalTasks} tasks. Are you sure you want to submit?\`)) {
                    return;
                }
            }
            
            updateStatus('Submitting assessment...');
            
            vscode.postMessage({
                type: 'assessmentSubmitted',
                progress: Math.round((completedTasks / totalTasks) * 100),
                dataset: currentDataset,
                assessmentType: '${this.assessmentType}'
            });
        }

        function previewDashboard() {
            updateStatus('Generating dashboard preview...');
            
            vscode.postMessage({
                type: 'dashboardPreview',
                dataset: currentDataset
            });
        }

        function exportReport() {
            updateStatus('Exporting report...');
            
            vscode.postMessage({
                type: 'reportExport',
                format: 'PDF',
                dataset: currentDataset
            });
        }

        function updateStatus(message) {
            document.getElementById('status').textContent = message;
        }

        // Initialize
        updateStatus('Power BI Assessment Environment Ready');
    </script>
</body>
</html>`;
    }
    async handleMessage(message) {
        logger_1.Logger.info(`Power BI webview received message: ${message.type}`);
        switch (message.type) {
            case 'powerbiLoaded':
                // Handle Power BI loaded event
                break;
            case 'sampleDataLoaded':
                // Handle sample data loaded
                break;
            case 'taskCompleted':
                // Handle task completion
                break;
            case 'assessmentSubmitted':
                // Handle assessment submission
                break;
            default:
                logger_1.Logger.warn(`Unknown message type: ${message.type}`);
        }
    }
}
exports.PowerBIWebviewProvider = PowerBIWebviewProvider;
//# sourceMappingURL=powerbi-webview.js.map