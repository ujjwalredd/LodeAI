"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PythonJupyterProvider = void 0;
const logger_1 = require("../logger");
class PythonJupyterProvider {
    constructor(webview) {
        this.webview = webview;
    }
    async initialize(skill, datasets, assessmentType) {
        this.skill = skill;
        this.datasets = datasets;
        this.assessmentType = assessmentType;
        logger_1.Logger.info(`Initializing Python Jupyter environment for ${assessmentType} assessment`);
    }
    getWebviewContent() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Python Jupyter Assessment</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Consolas', monospace; 
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
            background: #3776ab; 
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
            background: #3776ab; 
            color: white; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 4px; 
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        .btn:hover { background: #2e5f8a; }
        .btn.secondary { background: #6c757d; }
        .btn.secondary:hover { background: #5a6268; }
        .btn.success { background: #28a745; }
        .btn.success:hover { background: #218838; }
        .btn.warning { background: #ffc107; color: #000; }
        .btn.warning:hover { background: #e0a800; }
        .notebook-container { 
            flex: 1; 
            background: #1e1e1e;
            overflow-y: auto;
            padding: 20px;
        }
        .cell { 
            background: #252526; 
            border: 1px solid #3e3e42; 
            border-radius: 8px; 
            margin-bottom: 16px;
            overflow: hidden;
        }
        .cell-header {
            background: #2d2d30;
            padding: 8px 12px;
            border-bottom: 1px solid #3e3e42;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .cell-type {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .cell-actions {
            display: flex;
            gap: 8px;
        }
        .cell-btn {
            background: transparent;
            border: 1px solid #3e3e42;
            color: #cccccc;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .cell-btn:hover {
            background: #3e3e42;
        }
        .cell-content {
            padding: 16px;
        }
        .code-input {
            width: 100%;
            background: #1e1e1e;
            color: #d4d4d4;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
            border: none;
            outline: none;
            resize: vertical;
            min-height: 100px;
        }
        .output {
            background: #1e1e1e;
            color: #d4d4d4;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
            padding: 12px;
            border-top: 1px solid #3e3e42;
            white-space: pre-wrap;
            max-height: 300px;
            overflow-y: auto;
        }
        .output.error {
            background: #2d1b1b;
            color: #f85149;
            border-color: #f85149;
        }
        .output.success {
            background: #1b2d1b;
            color: #7ee081;
            border-color: #7ee081;
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
        .dataset-item.active { background: #3776ab; }
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
        .library-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 12px;
        }
        .library-item {
            background: #3c3c3c;
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
            text-align: center;
            cursor: pointer;
            transition: background 0.2s;
        }
        .library-item:hover {
            background: #4c4c4c;
        }
        .library-item.active {
            background: #3776ab;
        }
        .status-bar { 
            background: #3776ab; 
            color: white; 
            padding: 8px 20px; 
            font-size: 12px;
            display: flex;
            justify-content: space-between;
        }
        .add-cell-btn {
            background: #28a745;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin: 16px 0;
            width: 100%;
            transition: background 0.2s;
        }
        .add-cell-btn:hover {
            background: #218838;
        }
        .execution-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .execution-indicator.idle { background: #6c757d; }
        .execution-indicator.running { 
            background: #ffc107; 
            animation: pulse 1s infinite;
        }
        .execution-indicator.success { background: #28a745; }
        .execution-indicator.error { background: #dc3545; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Python Jupyter Assessment</h1>
        <span class="skill-badge">${this.skill.skill}</span>
    </div>
    
    <div class="main-content">
        <div class="sidebar">
            <div class="assessment-panel">
                <h3>Assessment: ${this.assessmentType}</h3>
                <p>Demonstrate your Python data science skills using Jupyter notebooks. Analyze data, create visualizations, and build machine learning models.</p>
            </div>
            
            <div class="dataset-list">
                <h3 style="color: #ffffff; margin-bottom: 12px;">Available Datasets</h3>
                ${this.datasets.map(dataset => `
                    <div class="dataset-item" onclick="selectDataset('${dataset}')">
                        <strong>${dataset}</strong>
                        <div style="font-size: 12px; color: #cccccc; margin-top: 4px;">
                            Click to load
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="assessment-panel">
                <h3>Python Libraries</h3>
                <div class="library-list">
                    <div class="library-item active" onclick="toggleLibrary(this, 'pandas')">pandas</div>
                    <div class="library-item active" onclick="toggleLibrary(this, 'numpy')">numpy</div>
                    <div class="library-item active" onclick="toggleLibrary(this, 'matplotlib')">matplotlib</div>
                    <div class="library-item active" onclick="toggleLibrary(this, 'seaborn')">seaborn</div>
                    <div class="library-item active" onclick="toggleLibrary(this, 'sklearn')">scikit-learn</div>
                    <div class="library-item active" onclick="toggleLibrary(this, 'plotly')">plotly</div>
                    <div class="library-item" onclick="toggleLibrary(this, 'tensorflow')">tensorflow</div>
                    <div class="library-item" onclick="toggleLibrary(this, 'pytorch')">pytorch</div>
                </div>
            </div>
            
            <div class="assessment-panel">
                <h3>Assessment Tasks</h3>
                <ul class="task-list" id="taskList">
                    <li onclick="toggleTask(this)">Load and explore datasets</li>
                    <li onclick="toggleTask(this)">Perform data cleaning</li>
                    <li onclick="toggleTask(this)">Create data visualizations</li>
                    <li onclick="toggleTask(this)">Statistical analysis</li>
                    <li onclick="toggleTask(this)">Feature engineering</li>
                    <li onclick="toggleTask(this)">Build ML models</li>
                    <li onclick="toggleTask(this)">Model evaluation</li>
                    <li onclick="toggleTask(this)">Results interpretation</li>
                </ul>
            </div>
        </div>
        
        <div class="workspace">
            <div class="toolbar">
                <button class="btn" onclick="runAllCells()">Run All</button>
                <button class="btn success" onclick="addCodeCell()">+ Code Cell</button>
                <button class="btn secondary" onclick="addMarkdownCell()">+ Markdown</button>
                <button class="btn warning" onclick="restartKernel()">Restart</button>
                <button class="btn secondary" onclick="saveNotebook()">Save</button>
                <div style="margin-left: auto; color: #cccccc;">
                    <span class="execution-indicator idle" id="kernelStatus"></span>
                    <span id="selectedDataset">No dataset selected</span>
                </div>
            </div>
            
            <div class="notebook-container" id="notebookContainer">
                <button class="add-cell-btn" onclick="addCodeCell()">
                    + Add Code Cell
                </button>
                
                <div class="cell" data-cell-id="cell-1">
                    <div class="cell-header">
                        <span class="cell-type">Code</span>
                        <div class="cell-actions">
                            <button class="cell-btn" onclick="runCell('cell-1')">Run</button>
                            <button class="cell-btn" onclick="deleteCell('cell-1')">Delete</button>
                        </div>
                    </div>
                    <div class="cell-content">
                        <textarea class="code-input" placeholder="# Welcome to Python Jupyter Assessment
# Start by importing the necessary libraries

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

print('Python environment ready!')"># Welcome to Python Jupyter Assessment
# Start by importing the necessary libraries

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

print('Python environment ready!')</textarea>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="status-bar">
        <span>Python Jupyter Assessment Environment</span>
        <span id="status">Ready</span>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentDataset = null;
        let cellCounter = 1;
        let kernelRunning = false;
        let selectedLibraries = ['pandas', 'numpy', 'matplotlib', 'seaborn', 'sklearn', 'plotly'];

        // Sample datasets
        const sampleDatasets = {
            'titanic.csv': {
                columns: ['PassengerId', 'Survived', 'Pclass', 'Name', 'Sex', 'Age', 'SibSp', 'Parch', 'Ticket', 'Fare', 'Cabin', 'Embarked'],
                description: 'Titanic passenger data for survival analysis'
            },
            'iris.csv': {
                columns: ['sepal_length', 'sepal_width', 'petal_length', 'petal_width', 'species'],
                description: 'Iris flower measurements for classification'
            },
            'sales_data.csv': {
                columns: ['date', 'product', 'category', 'sales', 'profit', 'region'],
                description: 'Sales data for business analytics'
            }
        };

        function selectDataset(dataset) {
            currentDataset = dataset;
            document.getElementById('selectedDataset').textContent = dataset;
            
            // Update UI
            document.querySelectorAll('.dataset-item').forEach(item => {
                item.classList.remove('active');
            });
            event.target.closest('.dataset-item').classList.add('active');
            
            // Add dataset loading code to a new cell
            addDatasetCell(dataset);
            updateStatus(\`Selected dataset: \${dataset}\`);
        }

        function addDatasetCell(dataset) {
            const datasetInfo = sampleDatasets[dataset];
            const loadCode = \`# Load \${dataset}
import pandas as pd

# Load the dataset
df = pd.read_csv('\${dataset}')
print(f"Dataset shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
print("\\nFirst few rows:")
df.head()\`;

            addCodeCell(loadCode);
        }

        function toggleLibrary(element, library) {
            element.classList.toggle('active');
            
            if (element.classList.contains('active')) {
                if (!selectedLibraries.includes(library)) {
                    selectedLibraries.push(library);
                }
            } else {
                selectedLibraries = selectedLibraries.filter(lib => lib !== library);
            }
            
            updateStatus(\`Libraries: \${selectedLibraries.join(', ')}\`);
        }

        function addCodeCell(code = '') {
            cellCounter++;
            const cellId = \`cell-\${cellCounter}\`;
            
            const cellHTML = \`
                <div class="cell" data-cell-id="\${cellId}">
                    <div class="cell-header">
                        <span class="cell-type">Code</span>
                        <div class="cell-actions">
                            <button class="cell-btn" onclick="runCell('\${cellId}')">Run</button>
                            <button class="cell-btn" onclick="deleteCell('\${cellId}')">Delete</button>
                        </div>
                    </div>
                    <div class="cell-content">
                        <textarea class="code-input" placeholder="# Write your Python code here...">\${code}</textarea>
                    </div>
                </div>
            \`;
            
            const container = document.getElementById('notebookContainer');
            const addButton = container.querySelector('.add-cell-btn');
            addButton.insertAdjacentHTML('afterend', cellHTML);
        }

        function addMarkdownCell() {
            cellCounter++;
            const cellId = \`cell-\${cellCounter}\`;
            
            const cellHTML = \`
                <div class="cell" data-cell-id="\${cellId}">
                    <div class="cell-header">
                        <span class="cell-type">Markdown</span>
                        <div class="cell-actions">
                            <button class="cell-btn" onclick="runCell('\${cellId}')">Run</button>
                            <button class="cell-btn" onclick="deleteCell('\${cellId}')">Delete</button>
                        </div>
                    </div>
                    <div class="cell-content">
                        <textarea class="code-input" placeholder="# Markdown cell\\nWrite your markdown here..."># Markdown Cell\\n\\nWrite your documentation here...</textarea>
                    </div>
                </div>
            \`;
            
            const container = document.getElementById('notebookContainer');
            const addButton = container.querySelector('.add-cell-btn');
            addButton.insertAdjacentHTML('afterend', cellHTML);
        }

        function runCell(cellId) {
            const cell = document.querySelector(\`[data-cell-id="\${cellId}"]\`);
            const codeInput = cell.querySelector('.code-input');
            const code = codeInput.value;
            
            // Remove existing output
            const existingOutput = cell.querySelector('.output');
            if (existingOutput) {
                existingOutput.remove();
            }
            
            // Show execution indicator
            const kernelStatus = document.getElementById('kernelStatus');
            kernelStatus.className = 'execution-indicator running';
            kernelStatus.textContent = 'Running...';
            
            updateStatus('Executing cell...');
            
            // Simulate code execution
            setTimeout(() => {
                const output = simulateCodeExecution(code);
                displayCellOutput(cell, output);
                
                // Update kernel status
                kernelStatus.className = output.success ? 'execution-indicator success' : 'execution-indicator error';
                kernelStatus.textContent = output.success ? 'Success' : 'Error';
                
                updateStatus(output.success ? 'Cell executed successfully' : 'Cell execution failed');
                
                // Reset kernel status after a delay
                setTimeout(() => {
                    kernelStatus.className = 'execution-indicator idle';
                    kernelStatus.textContent = '';
                }, 2000);
                
                vscode.postMessage({
                    type: 'cellExecuted',
                    cellId: cellId,
                    code: code,
                    success: output.success,
                    output: output.result
                });
            }, Math.random() * 2000 + 500);
        }

        function simulateCodeExecution(code) {
            const codeLower = code.toLowerCase();
            
            // Simulate different types of code execution
            if (codeLower.includes('import') || codeLower.includes('print')) {
                return {
                    success: true,
                    result: generateImportOutput(code)
                };
            } else if (codeLower.includes('df.head') || codeLower.includes('head()')) {
                return {
                    success: true,
                    result: generateDataFrameOutput()
                };
            } else if (codeLower.includes('plt.show') || codeLower.includes('plot')) {
                return {
                    success: true,
                    result: '📊 Visualization created successfully'
                };
            } else if (codeLower.includes('error') || codeLower.includes('undefined')) {
                return {
                    success: false,
                    result: 'NameError: name "undefined_variable" is not defined'
                };
            } else if (code.trim() === '') {
                return {
                    success: false,
                    result: 'Empty cell - no code to execute'
                };
            } else {
                return {
                    success: true,
                    result: 'Code executed successfully\\nOutput: ' + (Math.random() > 0.5 ? '42' : 'Hello World!')
                };
            }
        }

        function generateImportOutput(code) {
            if (code.includes('pandas')) {
                return 'pandas imported successfully\\nVersion: 1.5.0';
            } else if (code.includes('numpy')) {
                return 'numpy imported successfully\\nVersion: 1.21.0';
            } else if (code.includes('matplotlib')) {
                return 'matplotlib imported successfully\\nVersion: 3.5.0';
            } else if (code.includes('seaborn')) {
                return 'seaborn imported successfully\\nVersion: 0.11.0';
            } else if (code.includes('print')) {
                const match = code.match(/print\\(['"](.*?)['"]\\)/);
                if (match) {
                    return match[1];
                }
                return 'Python environment ready!';
            }
            return 'Import successful';
        }

        function generateDataFrameOutput() {
            return \`Dataset shape: (1000, 5)
Columns: ['feature_1', 'feature_2', 'feature_3', 'feature_4', 'target']

First few rows:
   feature_1  feature_2  feature_3  feature_4  target
0       1.23       4.56       7.89       2.34       0
1       2.34       5.67       8.90       3.45       1
2       3.45       6.78       9.01       4.56       0
3       4.56       7.89       0.12       5.67       1
4       5.67       8.90       1.23       6.78       0\`;
        }

        function displayCellOutput(cell, output) {
            const outputDiv = document.createElement('div');
            outputDiv.className = \`output \${output.success ? 'success' : 'error'}\`;
            outputDiv.textContent = output.result;
            
            cell.appendChild(outputDiv);
        }

        function deleteCell(cellId) {
            const cell = document.querySelector(\`[data-cell-id="\${cellId}"]\`);
            if (cell) {
                cell.remove();
                updateStatus('Cell deleted');
            }
        }

        function runAllCells() {
            const cells = document.querySelectorAll('.cell');
            cells.forEach((cell, index) => {
                const cellId = cell.getAttribute('data-cell-id');
                setTimeout(() => {
                    runCell(cellId);
                }, index * 1000);
            });
            
            updateStatus('Running all cells...');
        }

        function restartKernel() {
            updateStatus('Restarting kernel...');
            
            // Clear all outputs
            document.querySelectorAll('.output').forEach(output => {
                output.remove();
            });
            
            setTimeout(() => {
                updateStatus('Kernel restarted');
                vscode.postMessage({
                    type: 'kernelRestarted'
                });
            }, 1000);
        }

        function saveNotebook() {
            const cells = [];
            document.querySelectorAll('.cell').forEach(cell => {
                const cellId = cell.getAttribute('data-cell-id');
                const codeInput = cell.querySelector('.code-input');
                const cellType = cell.querySelector('.cell-type').textContent.toLowerCase();
                
                cells.push({
                    id: cellId,
                    type: cellType,
                    content: codeInput.value
                });
            });
            
            vscode.postMessage({
                type: 'notebookSaved',
                cells: cells,
                timestamp: new Date().toISOString()
            });
            
            updateStatus('Notebook saved');
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

        function updateStatus(message) {
            document.getElementById('status').textContent = message;
        }

        // Initialize
        updateStatus('Python Jupyter Assessment Environment Ready');
        
        // Auto-select first dataset if available
        if (this.datasets && this.datasets.length > 0) {
            setTimeout(() => {
                selectDataset(this.datasets[0]);
            }, 500);
        }
    </script>
</body>
</html>`;
    }
    async handleMessage(message) {
        logger_1.Logger.info(`Python Jupyter environment received message: ${message.type}`);
        switch (message.type) {
            case 'cellExecuted':
                // Handle cell execution
                break;
            case 'kernelRestarted':
                // Handle kernel restart
                break;
            case 'notebookSaved':
                // Handle notebook save
                break;
            case 'taskCompleted':
                // Handle task completion
                break;
            default:
                logger_1.Logger.warn(`Unknown message type: ${message.type}`);
        }
    }
}
exports.PythonJupyterProvider = PythonJupyterProvider;
//# sourceMappingURL=python-jupyter.js.map