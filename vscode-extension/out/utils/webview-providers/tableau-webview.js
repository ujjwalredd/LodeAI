"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableauWebviewProvider = void 0;
const logger_1 = require("../logger");
class TableauWebviewProvider {
    constructor(webview) {
        this.webview = webview;
    }
    async initialize(skill, datasets, assessmentType) {
        this.skill = skill;
        this.datasets = datasets;
        this.assessmentType = assessmentType;
        logger_1.Logger.info(`Initializing Tableau webview for ${assessmentType} assessment`);
    }
    getWebviewContent() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tableau Assessment</title>
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
            background: #e97627; 
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
            background: #e97627; 
            color: white; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 4px; 
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        .btn:hover { background: #d6651a; }
        .btn.secondary { background: #6c757d; }
        .btn.secondary:hover { background: #5a6268; }
        .tableau-embed { 
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
        .dataset-item.active { background: #e97627; }
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
            border-top: 4px solid #e97627; 
            border-radius: 50%; 
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .status-bar { 
            background: #e97627; 
            color: white; 
            padding: 8px 20px; 
            font-size: 12px;
            display: flex;
            justify-content: space-between;
        }
        .viz-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
            margin-top: 16px;
        }
        .viz-type {
            background: #3c3c3c;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        .viz-type:hover {
            background: #e97627;
            transform: translateY(-2px);
        }
        .viz-type .icon {
            font-size: 24px;
            margin-bottom: 8px;
            display: block;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Tableau Assessment</h1>
        <span class="skill-badge">${this.skill.skill}</span>
    </div>
    
    <div class="main-content">
        <div class="sidebar">
            <div class="assessment-panel">
                <h3>Assessment: ${this.assessmentType}</h3>
                <p>Create compelling data visualizations using Tableau. Focus on storytelling, interactivity, and business insights.</p>
            </div>
            
            <div class="dataset-list">
                <h3 style="color: #ffffff; margin-bottom: 12px;">Available Datasets</h3>
                ${this.datasets.map(dataset => `
                    <div class="dataset-item" onclick="selectDataset('${dataset}')">
                        <strong>${dataset}</strong>
                        <div style="font-size: 12px; color: #cccccc; margin-top: 4px;">
                            Click to connect to Tableau
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="assessment-panel">
                <h3>Visualization Types</h3>
                <div class="viz-gallery">
                    <div class="viz-type" onclick="createVisualization('bar')">
                        <span class="icon">📊</span>
                        <div>Bar Chart</div>
                    </div>
                    <div class="viz-type" onclick="createVisualization('line')">
                        <span class="icon">📈</span>
                        <div>Line Chart</div>
                    </div>
                    <div class="viz-type" onclick="createVisualization('pie')">
                        <span class="icon">🥧</span>
                        <div>Pie Chart</div>
                    </div>
                    <div class="viz-type" onclick="createVisualization('scatter')">
                        <span class="icon">⚪</span>
                        <div>Scatter Plot</div>
                    </div>
                    <div class="viz-type" onclick="createVisualization('map')">
                        <span class="icon">🗺️</span>
                        <div>Map</div>
                    </div>
                    <div class="viz-type" onclick="createVisualization('heatmap')">
                        <span class="icon">🔥</span>
                        <div>Heatmap</div>
                    </div>
                </div>
            </div>
            
            <div class="assessment-panel">
                <h3>Assessment Tasks</h3>
                <ul class="task-list" id="taskList">
                    <li onclick="toggleTask(this)">Connect to data source</li>
                    <li onclick="toggleTask(this)">Create calculated fields</li>
                    <li onclick="toggleTask(this)">Build interactive dashboard</li>
                    <li onclick="toggleTask(this)">Apply filters and parameters</li>
                    <li onclick="toggleTask(this)">Design mobile-responsive layout</li>
                    <li onclick="toggleTask(this)">Add tooltips and annotations</li>
                    <li onclick="toggleTask(this)">Create story points</li>
                    <li onclick="toggleTask(this)">Publish to Tableau Server</li>
                </ul>
            </div>
        </div>
        
        <div class="workspace">
            <div class="toolbar">
                <button class="btn" onclick="launchTableau()">Launch Tableau</button>
                <button class="btn secondary" onclick="loadData()">Load Data</button>
                <button class="btn secondary" onclick="newWorksheet()">New Worksheet</button>
                <button class="btn secondary" onclick="createDashboard()">Create Dashboard</button>
                <button class="btn secondary" onclick="saveWorkbook()">Save Workbook</button>
                <div style="margin-left: auto; color: #cccccc;">
                    <span id="selectedDataset">No dataset selected</span>
                </div>
            </div>
            
            <div class="tableau-embed" id="tableauContainer">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Loading Tableau environment...</p>
                    <p style="font-size: 12px; margin-top: 8px;">Click "Launch Tableau" to begin</p>
                </div>
            </div>
        </div>
    </div>
    
    <div class="status-bar">
        <span>Tableau Assessment Environment</span>
        <span id="status">Ready</span>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentDataset = null;
        let tableauLoaded = false;
        let currentWorksheet = null;
        let dashboardCreated = false;

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

        function launchTableau() {
            updateStatus('Loading Tableau...');
            
            const container = document.getElementById('tableauContainer');
            container.innerHTML = \`
                <div style="width: 100%; height: 100%; background: white; color: #333;">
                    <div style="padding: 20px; height: 100%; display: flex; flex-direction: column;">
                        <div style="border-bottom: 1px solid #ddd; padding-bottom: 16px; margin-bottom: 20px;">
                            <h2 style="color: #333; margin-bottom: 8px;">Tableau Workspace</h2>
                            <p style="color: #666;">Create your data visualizations here</p>
                        </div>
                        
                        <div style="flex: 1; display: grid; grid-template-columns: 1fr 3fr; gap: 20px;">
                            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px;">
                                <h3 style="margin-bottom: 12px; color: #333;">Data Pane</h3>
                                <div id="dataPane" style="max-height: 400px; overflow-y: auto;">
                                    \${currentDataset ? \`
                                        <div style="padding: 8px; background: #fff3cd; border-radius: 4px; margin: 4px 0;">
                                            <strong>\${currentDataset}</strong>
                                        </div>
                                        <div style="padding: 4px 8px; color: #666; font-size: 12px; margin-bottom: 12px;">Fields:</div>
                                        <div style="padding: 4px 8px; border-left: 3px solid #e97627; margin: 4px 0;">📊 Sales Amount</div>
                                        <div style="padding: 4px 8px; border-left: 3px solid #e97627; margin: 4px 0;">📊 Profit</div>
                                        <div style="padding: 4px 8px; border-left: 3px solid #e97627; margin: 4px 0;">📊 Quantity</div>
                                        <div style="padding: 4px 8px; border-left: 3px solid #6c757d; margin: 4px 0;">📍 Region</div>
                                        <div style="padding: 4px 8px; border-left: 3px solid #6c757d; margin: 4px 0;">📍 Category</div>
                                        <div style="padding: 4px 8px; border-left: 3px solid #6c757d; margin: 4px 0;">📍 Sub-Category</div>
                                        <div style="padding: 4px 8px; border-left: 3px solid #6c757d; margin: 4px 0;">📅 Order Date</div>
                                    \` : 'Select a dataset to see fields'}
                                </div>
                                
                                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #ddd;">
                                    <h4 style="color: #333; margin-bottom: 8px;">Marks</h4>
                                    <div style="padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px; color: #666;">
                                        Drag fields here to create visualizations
                                    </div>
                                </div>
                            </div>
                            
                            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px;">
                                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 16px;">
                                    <h3 style="color: #333;">Visualization Canvas</h3>
                                    <div style="margin-left: auto;">
                                        <button class="btn" style="font-size: 12px; padding: 4px 8px;" onclick="addChart()">+ Chart</button>
                                    </div>
                                </div>
                                
                                <div id="canvas" style="height: 400px; background: #fafafa; border: 2px dashed #ccc; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #666;">
                                    <div style="text-align: center;">
                                        <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
                                        <p>Drag fields from the Data Pane to create visualizations</p>
                                        <p style="font-size: 12px; margin-top: 8px;">Start by dragging a dimension to Columns and a measure to Rows</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #ddd;">
                            <div style="display: flex; gap: 16px;">
                                <button class="btn" onclick="submitAssessment()">Submit Assessment</button>
                                <button class="btn secondary" onclick="previewWorkbook()">Preview Workbook</button>
                                <button class="btn secondary" onclick="exportWorkbook()">Export Workbook</button>
                            </div>
                        </div>
                    </div>
                </div>
            \`;
            
            tableauLoaded = true;
            updateStatus('Tableau loaded successfully');
            
            vscode.postMessage({
                type: 'tableauLoaded',
                dataset: currentDataset,
                assessmentType: '${this.assessmentType}'
            });
        }

        function loadData() {
            if (!currentDataset) {
                alert('Please select a dataset first');
                return;
            }
            
            updateStatus(\`Loading data from \${currentDataset}...\`);
            
            setTimeout(() => {
                updateStatus(\`Data loaded from \${currentDataset}\`);
                vscode.postMessage({
                    type: 'dataLoaded',
                    dataset: currentDataset
                });
            }, 2000);
        }

        function createVisualization(type) {
            if (!tableauLoaded) {
                alert('Please launch Tableau first');
                return;
            }
            
            const canvas = document.getElementById('canvas');
            let vizHTML = '';
            
            switch(type) {
                case 'bar':
                    vizHTML = \`
                        <div style="padding: 20px; height: 100%; background: white;">
                            <h4 style="margin-bottom: 16px;">Bar Chart - Sales by Region</h4>
                            <div style="display: flex; align-items: end; gap: 8px; height: 300px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                                <div style="background: #e97627; width: 40px; height: 60%; border-radius: 4px 4px 0 0; display: flex; align-items: end; justify-content: center; color: white; font-size: 12px; padding: 4px;">North</div>
                                <div style="background: #e97627; width: 40px; height: 80%; border-radius: 4px 4px 0 0; display: flex; align-items: end; justify-content: center; color: white; font-size: 12px; padding: 4px;">South</div>
                                <div style="background: #e97627; width: 40px; height: 45%; border-radius: 4px 4px 0 0; display: flex; align-items: end; justify-content: center; color: white; font-size: 12px; padding: 4px;">East</div>
                                <div style="background: #e97627; width: 40px; height: 70%; border-radius: 4px 4px 0 0; display: flex; align-items: end; justify-content: center; color: white; font-size: 12px; padding: 4px;">West</div>
                                <div style="background: #e97627; width: 40px; height: 55%; border-radius: 4px 4px 0 0; display: flex; align-items: end; justify-content: center; color: white; font-size: 12px; padding: 4px;">Central</div>
                            </div>
                            <div style="margin-top: 8px; font-size: 12px; color: #666;">Drag different fields to modify this chart</div>
                        </div>
                    \`;
                    break;
                case 'line':
                    vizHTML = \`
                        <div style="padding: 20px; height: 100%; background: white;">
                            <h4 style="margin-bottom: 16px;">Line Chart - Sales Trend</h4>
                            <div style="height: 300px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; position: relative;">
                                <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0;">
                                    <polyline points="20,250 60,200 100,180 140,160 180,140 220,120 260,100 300,90" 
                                              fill="none" stroke="#e97627" stroke-width="3"/>
                                    <circle cx="20" cy="250" r="4" fill="#e97627"/>
                                    <circle cx="60" cy="200" r="4" fill="#e97627"/>
                                    <circle cx="100" cy="180" r="4" fill="#e97627"/>
                                    <circle cx="140" cy="160" r="4" fill="#e97627"/>
                                    <circle cx="180" cy="140" r="4" fill="#e97627"/>
                                    <circle cx="220" cy="120" r="4" fill="#e97627"/>
                                    <circle cx="260" cy="100" r="4" fill="#e97627"/>
                                    <circle cx="300" cy="90" r="4" fill="#e97627"/>
                                </svg>
                                <div style="position: absolute; bottom: 0; left: 20px; right: 20px; display: flex; justify-content: space-between; font-size: 12px; color: #666;">
                                    <span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span><span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span>
                                </div>
                            </div>
                        </div>
                    \`;
                    break;
                default:
                    vizHTML = \`
                        <div style="padding: 20px; height: 100%; background: white; display: flex; align-items: center; justify-content: center;">
                            <div style="text-align: center; color: #666;">
                                <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
                                <p>\${type.charAt(0).toUpperCase() + type.slice(1)} Chart Created</p>
                                <p style="font-size: 12px; margin-top: 8px;">Customize using the Data Pane</p>
                            </div>
                        </div>
                    \`;
            }
            
            canvas.innerHTML = vizHTML;
            updateStatus(\`\${type.charAt(0).toUpperCase() + type.slice(1)} chart created\`);
            
            vscode.postMessage({
                type: 'visualizationCreated',
                type: type,
                dataset: currentDataset
            });
        }

        function newWorksheet() {
            if (!tableauLoaded) {
                alert('Please launch Tableau first');
                return;
            }
            
            updateStatus('Creating new worksheet...');
            
            setTimeout(() => {
                updateStatus('New worksheet created');
                vscode.postMessage({
                    type: 'worksheetCreated'
                });
            }, 1000);
        }

        function createDashboard() {
            if (!tableauLoaded) {
                alert('Please launch Tableau first');
                return;
            }
            
            updateStatus('Creating dashboard...');
            
            setTimeout(() => {
                dashboardCreated = true;
                updateStatus('Dashboard created successfully');
                vscode.postMessage({
                    type: 'dashboardCreated'
                });
            }, 2000);
        }

        function saveWorkbook() {
            updateStatus('Saving workbook...');
            
            setTimeout(() => {
                updateStatus('Workbook saved successfully');
                vscode.postMessage({
                    type: 'workbookSaved',
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

        function previewWorkbook() {
            updateStatus('Generating workbook preview...');
            
            vscode.postMessage({
                type: 'workbookPreview',
                dataset: currentDataset
            });
        }

        function exportWorkbook() {
            updateStatus('Exporting workbook...');
            
            vscode.postMessage({
                type: 'workbookExport',
                format: 'TWBX',
                dataset: currentDataset
            });
        }

        function addChart() {
            updateStatus('Adding new chart...');
            
            vscode.postMessage({
                type: 'chartAdded'
            });
        }

        function updateStatus(message) {
            document.getElementById('status').textContent = message;
        }

        // Initialize
        updateStatus('Tableau Assessment Environment Ready');
    </script>
</body>
</html>`;
    }
    async handleMessage(message) {
        logger_1.Logger.info(`Tableau webview received message: ${message.type}`);
        switch (message.type) {
            case 'tableauLoaded':
                // Handle Tableau loaded event
                break;
            case 'dataLoaded':
                // Handle data loaded
                break;
            case 'visualizationCreated':
                // Handle visualization creation
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
exports.TableauWebviewProvider = TableauWebviewProvider;
//# sourceMappingURL=tableau-webview.js.map