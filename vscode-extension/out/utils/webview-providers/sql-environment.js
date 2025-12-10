"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLEnvironmentProvider = void 0;
const logger_1 = require("../logger");
class SQLEnvironmentProvider {
    constructor(webview) {
        this.webview = webview;
    }
    async initialize(skill, datasets, assessmentType) {
        this.skill = skill;
        this.datasets = datasets;
        this.assessmentType = assessmentType;
        logger_1.Logger.info(`Initializing SQL environment for ${assessmentType} assessment`);
    }
    getWebviewContent() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SQL Assessment</title>
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
            background: #336791; 
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
            background: #336791; 
            color: white; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 4px; 
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        .btn:hover { background: #2a5a7a; }
        .btn.secondary { background: #6c757d; }
        .btn.secondary:hover { background: #5a6268; }
        .btn.success { background: #28a745; }
        .btn.success:hover { background: #218838; }
        .sql-workspace { 
            flex: 1; 
            display: flex; 
            flex-direction: column;
            background: #1e1e1e;
        }
        .query-editor { 
            flex: 1; 
            background: #1e1e1e; 
            border: 1px solid #3e3e42;
            margin: 20px;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .editor-header {
            background: #2d2d30;
            padding: 12px 16px;
            border-bottom: 1px solid #3e3e42;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .editor-content {
            flex: 1;
            display: flex;
        }
        .sql-editor {
            flex: 1;
            background: #1e1e1e;
            color: #d4d4d4;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
            padding: 16px;
            border: none;
            outline: none;
            resize: none;
        }
        .results-panel {
            width: 50%;
            background: #252526;
            border-left: 1px solid #3e3e42;
            display: flex;
            flex-direction: column;
        }
        .results-header {
            background: #2d2d30;
            padding: 12px 16px;
            border-bottom: 1px solid #3e3e42;
            font-weight: 600;
        }
        .results-content {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
        }
        .table-container {
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: #1e1e1e;
            color: #d4d4d4;
        }
        th, td {
            border: 1px solid #3e3e42;
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background: #2d2d30;
            font-weight: 600;
        }
        tr:nth-child(even) {
            background: #252526;
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
        .dataset-item.active { background: #336791; }
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
        .schema-panel {
            background: #2d2d30;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .schema-table {
            background: #3c3c3c;
            padding: 8px 12px;
            margin: 4px 0;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .schema-table:hover {
            background: #4c4c4c;
        }
        .status-bar { 
            background: #336791; 
            color: white; 
            padding: 8px 20px; 
            font-size: 12px;
            display: flex;
            justify-content: space-between;
        }
        .query-template {
            background: #3c3c3c;
            padding: 8px 12px;
            margin: 4px 0;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        }
        .query-template:hover {
            background: #4c4c4c;
        }
        .error-message {
            background: #dc3545;
            color: white;
            padding: 12px;
            border-radius: 4px;
            margin: 8px 0;
            font-size: 14px;
        }
        .success-message {
            background: #28a745;
            color: white;
            padding: 12px;
            border-radius: 4px;
            margin: 8px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>SQL Assessment</h1>
        <span class="skill-badge">${this.skill.skill}</span>
    </div>
    
    <div class="main-content">
        <div class="sidebar">
            <div class="assessment-panel">
                <h3>Assessment: ${this.assessmentType}</h3>
                <p>Demonstrate your SQL skills by writing queries to analyze data, optimize performance, and solve complex business problems.</p>
            </div>
            
            <div class="dataset-list">
                <h3 style="color: #ffffff; margin-bottom: 12px;">Available Databases</h3>
                ${this.datasets.map(dataset => `
                    <div class="dataset-item" onclick="selectDatabase('${dataset}')">
                        <strong>${dataset}</strong>
                        <div style="font-size: 12px; color: #cccccc; margin-top: 4px;">
                            Click to connect
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="schema-panel">
                <h3 style="color: #ffffff; margin-bottom: 12px;">Database Schema</h3>
                <div id="schemaContent">
                    <div style="color: #cccccc; font-size: 12px; text-align: center; padding: 20px;">
                        Select a database to view schema
                    </div>
                </div>
            </div>
            
            <div class="assessment-panel">
                <h3>Query Templates</h3>
                <div class="query-template" onclick="loadTemplate('select')">SELECT - Basic Queries</div>
                <div class="query-template" onclick="loadTemplate('join')">JOIN - Table Relationships</div>
                <div class="query-template" onclick="loadTemplate('aggregate')">GROUP BY - Aggregations</div>
                <div class="query-template" onclick="loadTemplate('window')">Window Functions</div>
                <div class="query-template" onclick="loadTemplate('cte')">CTE - Common Table Expressions</div>
                <div class="query-template" onclick="loadTemplate('optimize')">Performance Optimization</div>
            </div>
            
            <div class="assessment-panel">
                <h3>Assessment Tasks</h3>
                <ul class="task-list" id="taskList">
                    <li onclick="toggleTask(this)">Connect to database</li>
                    <li onclick="toggleTask(this)">Write basic SELECT queries</li>
                    <li onclick="toggleTask(this)">Implement JOIN operations</li>
                    <li onclick="toggleTask(this)">Create aggregate functions</li>
                    <li onclick="toggleTask(this)">Optimize query performance</li>
                    <li onclick="toggleTask(this)">Design database indexes</li>
                    <li onclick="toggleTask(this)">Handle complex business logic</li>
                    <li onclick="toggleTask(this)">Write stored procedures</li>
                </ul>
            </div>
        </div>
        
        <div class="workspace">
            <div class="toolbar">
                <button class="btn" onclick="connectDatabase()">Connect Database</button>
                <button class="btn success" onclick="executeQuery()">Execute Query</button>
                <button class="btn secondary" onclick="clearEditor()">Clear</button>
                <button class="btn secondary" onclick="formatQuery()">Format</button>
                <button class="btn secondary" onclick="saveQuery()">Save Query</button>
                <div style="margin-left: auto; color: #cccccc;">
                    <span id="connectionStatus">Not connected</span>
                </div>
            </div>
            
            <div class="sql-workspace">
                <div class="query-editor">
                    <div class="editor-header">
                        <span>SQL Query Editor</span>
                        <div>
                            <span style="color: #cccccc; font-size: 12px;">Lines: <span id="lineCount">1</span></span>
                        </div>
                    </div>
                    <div class="editor-content">
                        <textarea class="sql-editor" id="sqlEditor" placeholder="-- Write your SQL queries here
-- Example:
SELECT * FROM customers WHERE city = 'New York';">-- Welcome to SQL Assessment Environment
-- Select a database and start writing your queries

-- Example queries:
SELECT COUNT(*) FROM customers;
SELECT customer_id, SUM(order_amount) 
FROM orders 
GROUP BY customer_id 
HAVING SUM(order_amount) > 1000;

-- Your queries here:</textarea>
                        <div class="results-panel">
                            <div class="results-header">Query Results</div>
                            <div class="results-content" id="resultsContent">
                                <div style="color: #cccccc; text-align: center; padding: 40px;">
                                    <div style="font-size: 48px; margin-bottom: 16px;">🗃️</div>
                                    <p>Execute a query to see results</p>
                                    <p style="font-size: 12px; margin-top: 8px;">Use Ctrl+Enter to execute</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="status-bar">
        <span>SQL Assessment Environment</span>
        <span id="status">Ready</span>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentDatabase = null;
        let connected = false;
        let queryHistory = [];

        // Sample data for demonstration
        const sampleData = {
            'northwind': {
                tables: {
                    'customers': ['customer_id', 'company_name', 'contact_name', 'city', 'country'],
                    'orders': ['order_id', 'customer_id', 'order_date', 'ship_city', 'freight'],
                    'products': ['product_id', 'product_name', 'category_id', 'unit_price', 'units_in_stock'],
                    'categories': ['category_id', 'category_name', 'description'],
                    'order_details': ['order_id', 'product_id', 'quantity', 'unit_price', 'discount']
                },
                sampleQueries: {
                    'select': 'SELECT * FROM customers LIMIT 10;',
                    'join': 'SELECT c.company_name, COUNT(o.order_id) as order_count FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.company_name;',
                    'aggregate': 'SELECT category_name, COUNT(*) as product_count, AVG(unit_price) as avg_price FROM products p JOIN categories c ON p.category_id = c.category_id GROUP BY c.category_id, category_name;',
                    'window': 'SELECT customer_id, order_date, freight, SUM(freight) OVER (PARTITION BY customer_id ORDER BY order_date) as running_total FROM orders ORDER BY customer_id, order_date;',
                    'cte': 'WITH monthly_sales AS (SELECT DATE_TRUNC(\'month\', order_date) as month, SUM(freight) as total_sales FROM orders GROUP BY DATE_TRUNC(\'month\', order_date)) SELECT month, total_sales, LAG(total_sales) OVER (ORDER BY month) as prev_month FROM monthly_sales;',
                    'optimize': '-- Add indexes for better performance\nCREATE INDEX idx_orders_customer_id ON orders(customer_id);\nCREATE INDEX idx_orders_date ON orders(order_date);\n\n-- Optimized query\nSELECT customer_id, COUNT(*) FROM orders WHERE order_date >= \'2023-01-01\' GROUP BY customer_id;'
                }
            },
            'sales_db': {
                tables: {
                    'sales': ['sale_id', 'product_id', 'customer_id', 'sale_date', 'amount', 'region'],
                    'customers': ['customer_id', 'name', 'email', 'region', 'segment'],
                    'products': ['product_id', 'name', 'category', 'price', 'cost']
                }
            }
        };

        function selectDatabase(database) {
            currentDatabase = database;
            
            // Update UI
            document.querySelectorAll('.dataset-item').forEach(item => {
                item.classList.remove('active');
            });
            event.target.closest('.dataset-item').classList.add('active');
            
            // Update schema
            updateSchema(database);
            updateStatus(\`Selected database: \${database}\`);
        }

        function updateSchema(database) {
            const schemaContent = document.getElementById('schemaContent');
            const dbInfo = sampleData[database.toLowerCase().replace(/\s+/g, '_')];
            
            if (dbInfo) {
                let html = '';
                Object.entries(dbInfo.tables).forEach(([tableName, columns]) => {
                    html += \`
                        <div class="schema-table" onclick="insertTableName('\${tableName}')">
                            <strong>\${tableName}</strong>
                            <div style="font-size: 11px; color: #999; margin-top: 2px;">
                                \${columns.join(', ')}
                            </div>
                        </div>
                    \`;
                });
                schemaContent.innerHTML = html;
            } else {
                schemaContent.innerHTML = '<div style="color: #cccccc; font-size: 12px; text-align: center; padding: 20px;">Schema not available</div>';
            }
        }

        function insertTableName(tableName) {
            const editor = document.getElementById('sqlEditor');
            const cursorPos = editor.selectionStart;
            const textBefore = editor.value.substring(0, cursorPos);
            const textAfter = editor.value.substring(editor.selectionEnd);
            
            editor.value = textBefore + tableName + textAfter;
            editor.focus();
            editor.setSelectionRange(cursorPos + tableName.length, cursorPos + tableName.length);
        }

        function connectDatabase() {
            if (!currentDatabase) {
                alert('Please select a database first');
                return;
            }
            
            updateStatus(\`Connecting to \${currentDatabase}...\`);
            
            setTimeout(() => {
                connected = true;
                document.getElementById('connectionStatus').textContent = \`Connected to \${currentDatabase}\`;
                updateStatus(\`Connected to \${currentDatabase}\`);
                
                vscode.postMessage({
                    type: 'databaseConnected',
                    database: currentDatabase
                });
            }, 1500);
        }

        function executeQuery() {
            if (!connected) {
                alert('Please connect to a database first');
                return;
            }
            
            const editor = document.getElementById('sqlEditor');
            const query = editor.value.trim();
            
            if (!query) {
                alert('Please enter a SQL query');
                return;
            }
            
            updateStatus('Executing query...');
            
            // Simulate query execution
            setTimeout(() => {
                const results = simulateQueryExecution(query);
                displayResults(results);
                
                queryHistory.push({
                    query: query,
                    timestamp: new Date().toISOString(),
                    resultCount: results.rows ? results.rows.length : 0
                });
                
                updateStatus(\`Query executed successfully (\${results.rows ? results.rows.length : 0} rows)\`);
            }, 1000);
        }

        function simulateQueryExecution(query) {
            const queryLower = query.toLowerCase();
            
            // Simple query simulation
            if (queryLower.includes('select count(*)')) {
                return {
                    success: true,
                    rows: [{ count: Math.floor(Math.random() * 1000) + 100 }],
                    columns: ['count'],
                    executionTime: Math.random() * 100 + 50
                };
            } else if (queryLower.includes('select *')) {
                return {
                    success: true,
                    rows: generateSampleRows(),
                    columns: ['id', 'name', 'value', 'date'],
                    executionTime: Math.random() * 200 + 100
                };
            } else if (queryLower.includes('error') || queryLower.includes('invalid')) {
                return {
                    success: false,
                    error: 'Syntax error: Invalid SQL statement',
                    executionTime: 10
                };
            } else {
                return {
                    success: true,
                    rows: generateSampleRows().slice(0, 5),
                    columns: ['id', 'name', 'value'],
                    executionTime: Math.random() * 150 + 75
                };
            }
        }

        function generateSampleRows() {
            const rows = [];
            const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
            
            for (let i = 1; i <= 10; i++) {
                rows.push({
                    id: i,
                    name: names[Math.floor(Math.random() * names.length)],
                    value: Math.floor(Math.random() * 1000),
                    date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                });
            }
            
            return rows;
        }

        function displayResults(results) {
            const resultsContent = document.getElementById('resultsContent');
            
            if (results.success) {
                let html = \`
                    <div class="success-message">
                        Query executed successfully in \${results.executionTime.toFixed(2)}ms
                        \${results.rows ? \` - \${results.rows.length} rows returned\` : ''}
                    </div>
                \`;
                
                if (results.rows && results.rows.length > 0) {
                    html += '<div class="table-container"><table>';
                    html += '<thead><tr>';
                    results.columns.forEach(col => {
                        html += \`<th>\${col}</th>\`;
                    });
                    html += '</tr></thead><tbody>';
                    
                    results.rows.forEach(row => {
                        html += '<tr>';
                        results.columns.forEach(col => {
                            html += \`<td>\${row[col] || ''}</td>\`;
                        });
                        html += '</tr>';
                    });
                    
                    html += '</tbody></table></div>';
                } else {
                    html += '<div style="color: #cccccc; text-align: center; padding: 20px;">No rows returned</div>';
                }
                
                resultsContent.innerHTML = html;
                
                vscode.postMessage({
                    type: 'queryExecuted',
                    query: document.getElementById('sqlEditor').value,
                    success: true,
                    rowCount: results.rows ? results.rows.length : 0
                });
            } else {
                resultsContent.innerHTML = \`
                    <div class="error-message">
                        Query failed: \${results.error}
                    </div>
                \`;
                
                vscode.postMessage({
                    type: 'queryExecuted',
                    query: document.getElementById('sqlEditor').value,
                    success: false,
                    error: results.error
                });
            }
        }

        function loadTemplate(templateType) {
            const editor = document.getElementById('sqlEditor');
            const dbInfo = sampleData[currentDatabase?.toLowerCase().replace(/\s+/g, '_')] || sampleData.northwind;
            
            if (dbInfo.sampleQueries[templateType]) {
                editor.value = dbInfo.sampleQueries[templateType];
                updateStatus(\`Loaded \${templateType} template\`);
            } else {
                editor.value = \`-- \${templateType} template\n-- Add your query here\`;
            }
        }

        function clearEditor() {
            document.getElementById('sqlEditor').value = '';
            document.getElementById('resultsContent').innerHTML = '<div style="color: #cccccc; text-align: center; padding: 40px;">Execute a query to see results</div>';
            updateStatus('Editor cleared');
        }

        function formatQuery() {
            // Simple query formatting (in a real implementation, you'd use a proper SQL formatter)
            const editor = document.getElementById('sqlEditor');
            let query = editor.value;
            
            // Basic formatting
            query = query.replace(/\bSELECT\b/gi, 'SELECT');
            query = query.replace(/\bFROM\b/gi, '\\nFROM');
            query = query.replace(/\bWHERE\b/gi, '\\nWHERE');
            query = query.replace(/\bGROUP BY\b/gi, '\\nGROUP BY');
            query = query.replace(/\bORDER BY\b/gi, '\\nORDER BY');
            query = query.replace(/\bJOIN\b/gi, '\\nJOIN');
            
            editor.value = query;
            updateStatus('Query formatted');
        }

        function saveQuery() {
            const query = document.getElementById('sqlEditor').value;
            
            vscode.postMessage({
                type: 'querySaved',
                query: query,
                timestamp: new Date().toISOString()
            });
            
            updateStatus('Query saved');
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

        // Keyboard shortcuts
        document.getElementById('sqlEditor').addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'Enter') {
                executeQuery();
            }
            
            // Update line count
            const lineCount = this.value.split('\\n').length;
            document.getElementById('lineCount').textContent = lineCount;
        });

        // Initialize
        updateStatus('SQL Assessment Environment Ready');
        
        // Auto-select first database if available
        if (this.datasets && this.datasets.length > 0) {
            setTimeout(() => {
                selectDatabase(this.datasets[0]);
            }, 500);
        }
    </script>
</body>
</html>`;
    }
    async handleMessage(message) {
        logger_1.Logger.info(`SQL environment received message: ${message.type}`);
        switch (message.type) {
            case 'databaseConnected':
                // Handle database connection
                break;
            case 'queryExecuted':
                // Handle query execution
                break;
            case 'taskCompleted':
                // Handle task completion
                break;
            default:
                logger_1.Logger.warn(`Unknown message type: ${message.type}`);
        }
    }
}
exports.SQLEnvironmentProvider = SQLEnvironmentProvider;
//# sourceMappingURL=sql-environment.js.map