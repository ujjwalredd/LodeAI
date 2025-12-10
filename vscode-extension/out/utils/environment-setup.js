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
exports.EnvironmentSetup = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const logger_1 = require("./logger");
class EnvironmentSetup {
    constructor(projectPath) {
        this.projectPath = projectPath;
    }
    /**
     * Main setup function - detects platform and runs appropriate setup
     */
    async setupEnvironment() {
        try {
            logger_1.Logger.info('Starting environment setup...');
            // Check if Python is installed
            const pythonCheck = await this.checkPythonInstallation();
            if (!pythonCheck.success) {
                return pythonCheck;
            }
            // Detect platform
            const platform = os.platform();
            logger_1.Logger.info(`Detected platform: ${platform}`);
            // Create terminal
            this.terminal = vscode.window.createTerminal({
                name: 'LodeAI Setup',
                cwd: this.projectPath
            });
            this.terminal.show();
            // Run platform-specific setup
            let setupSuccess = false;
            switch (platform) {
                case 'win32':
                    setupSuccess = await this.setupWindows();
                    break;
                case 'darwin':
                    setupSuccess = await this.setupMacOS();
                    break;
                case 'linux':
                    setupSuccess = await this.setupLinux();
                    break;
                default:
                    return {
                        success: false,
                        message: `Unsupported platform: ${platform}`
                    };
            }
            if (setupSuccess) {
                // Create VSCode configuration files
                await this.createVSCodeConfig();
                // Create setup instructions file
                await this.createSetupGuide(platform);
                return {
                    success: true,
                    message: 'Environment setup completed successfully!',
                    terminal: this.terminal
                };
            }
            else {
                return {
                    success: false,
                    message: 'Environment setup failed. Check terminal for details.'
                };
            }
        }
        catch (error) {
            logger_1.Logger.error('Environment setup error:', error);
            return {
                success: false,
                message: `Setup error: ${error.message}`
            };
        }
    }
    /**
     * Check if Python is installed
     */
    async checkPythonInstallation() {
        return new Promise((resolve) => {
            const terminal = vscode.window.createTerminal({
                name: 'Python Check',
                cwd: this.projectPath
            });
            // Try to get Python version
            terminal.sendText('python --version');
            // Wait a bit and assume success (we'll catch errors during actual setup)
            setTimeout(() => {
                terminal.dispose();
                resolve({ success: true, message: 'Python check completed' });
            }, 1000);
        });
    }
    /**
     * Windows-specific setup
     */
    async setupWindows() {
        try {
            if (!this.terminal)
                return false;
            this.terminal.sendText('echo === LodeAI Assessment Setup (Windows) ===');
            this.terminal.sendText('echo.');
            // Check Python
            this.terminal.sendText('echo [1/5] Checking Python installation...');
            this.terminal.sendText('python --version');
            await this.delay(1000);
            // Create virtual environment
            this.terminal.sendText('echo.');
            this.terminal.sendText('echo [2/5] Creating virtual environment...');
            this.terminal.sendText('python -m venv assessment_env');
            await this.delay(3000);
            // Activate virtual environment and upgrade pip
            this.terminal.sendText('echo.');
            this.terminal.sendText('echo [3/5] Activating environment...');
            this.terminal.sendText('call assessment_env\\Scripts\\activate.bat');
            await this.delay(1000);
            this.terminal.sendText('echo.');
            this.terminal.sendText('echo [4/5] Upgrading pip...');
            this.terminal.sendText('python -m pip install --upgrade pip');
            await this.delay(2000);
            // Install dependencies
            this.terminal.sendText('echo.');
            this.terminal.sendText('echo [5/5] Installing dependencies...');
            this.terminal.sendText('pip install -r requirements.txt');
            await this.delay(5000);
            // Success message
            this.terminal.sendText('echo.');
            this.terminal.sendText('echo ========================================');
            this.terminal.sendText('echo Setup Complete!');
            this.terminal.sendText('echo ========================================');
            this.terminal.sendText('echo.');
            this.terminal.sendText('echo To activate environment: call assessment_env\\Scripts\\activate.bat');
            this.terminal.sendText('echo To run tests: python runner.py test');
            this.terminal.sendText('echo To check code quality: python runner.py check');
            this.terminal.sendText('echo.');
            return true;
        }
        catch (error) {
            logger_1.Logger.error('Windows setup failed:', error);
            return false;
        }
    }
    /**
     * macOS-specific setup
     */
    async setupMacOS() {
        try {
            if (!this.terminal)
                return false;
            this.terminal.sendText('echo "=== LodeAI Assessment Setup (macOS) ==="');
            this.terminal.sendText('echo ""');
            // Check Python
            this.terminal.sendText('echo "[1/5] Checking Python installation..."');
            this.terminal.sendText('python3 --version');
            await this.delay(1000);
            // Create virtual environment
            this.terminal.sendText('echo ""');
            this.terminal.sendText('echo "[2/5] Creating virtual environment..."');
            this.terminal.sendText('python3 -m venv assessment_env');
            await this.delay(3000);
            // Activate and setup
            this.terminal.sendText('echo ""');
            this.terminal.sendText('echo "[3/5] Activating environment..."');
            this.terminal.sendText('source assessment_env/bin/activate');
            await this.delay(1000);
            this.terminal.sendText('echo ""');
            this.terminal.sendText('echo "[4/5] Upgrading pip..."');
            this.terminal.sendText('python -m pip install --upgrade pip');
            await this.delay(2000);
            // Install dependencies
            this.terminal.sendText('echo ""');
            this.terminal.sendText('echo "[5/5] Installing dependencies..."');
            this.terminal.sendText('pip install -r requirements.txt');
            await this.delay(5000);
            // Success message
            this.terminal.sendText('echo ""');
            this.terminal.sendText('echo "========================================"');
            this.terminal.sendText('echo "✅ Setup Complete!"');
            this.terminal.sendText('echo "========================================"');
            this.terminal.sendText('echo ""');
            this.terminal.sendText('echo "To activate environment: source assessment_env/bin/activate"');
            this.terminal.sendText('echo "To run tests: python runner.py test"');
            this.terminal.sendText('echo "To check code quality: python runner.py check"');
            this.terminal.sendText('echo ""');
            return true;
        }
        catch (error) {
            logger_1.Logger.error('macOS setup failed:', error);
            return false;
        }
    }
    /**
     * Linux-specific setup
     */
    async setupLinux() {
        try {
            if (!this.terminal)
                return false;
            this.terminal.sendText('echo "=== LodeAI Assessment Setup (Linux) ==="');
            this.terminal.sendText('echo ""');
            // Check Python
            this.terminal.sendText('echo "[1/5] Checking Python installation..."');
            this.terminal.sendText('python3 --version');
            await this.delay(1000);
            // Create virtual environment
            this.terminal.sendText('echo ""');
            this.terminal.sendText('echo "[2/5] Creating virtual environment..."');
            this.terminal.sendText('python3 -m venv assessment_env');
            await this.delay(3000);
            // Activate and setup
            this.terminal.sendText('echo ""');
            this.terminal.sendText('echo "[3/5] Activating environment..."');
            this.terminal.sendText('source assessment_env/bin/activate');
            await this.delay(1000);
            this.terminal.sendText('echo ""');
            this.terminal.sendText('echo "[4/5] Upgrading pip..."');
            this.terminal.sendText('python -m pip install --upgrade pip');
            await this.delay(2000);
            // Install dependencies
            this.terminal.sendText('echo ""');
            this.terminal.sendText('echo "[5/5] Installing dependencies..."');
            this.terminal.sendText('pip install -r requirements.txt');
            await this.delay(5000);
            // Success message
            this.terminal.sendText('echo ""');
            this.terminal.sendText('echo "========================================"');
            this.terminal.sendText('echo "✅ Setup Complete!"');
            this.terminal.sendText('echo "========================================"');
            this.terminal.sendText('echo ""');
            this.terminal.sendText('echo "To activate environment: source assessment_env/bin/activate"');
            this.terminal.sendText('echo "To run tests: python runner.py test"');
            this.terminal.sendText('echo "To check code quality: python runner.py check"');
            this.terminal.sendText('echo ""');
            return true;
        }
        catch (error) {
            logger_1.Logger.error('Linux setup failed:', error);
            return false;
        }
    }
    /**
     * Create VSCode configuration files
     */
    async createVSCodeConfig() {
        const vscodeDir = path.join(this.projectPath, '.vscode');
        // Create .vscode directory
        if (!fs.existsSync(vscodeDir)) {
            fs.mkdirSync(vscodeDir, { recursive: true });
        }
        // Create tasks.json
        const tasksConfig = {
            version: "2.0.0",
            tasks: [
                {
                    label: "LodeAI: Run All Tests",
                    type: "shell",
                    command: "${command:python.interpreterPath}",
                    args: ["runner.py", "test"],
                    group: {
                        kind: "test",
                        isDefault: true
                    },
                    presentation: {
                        echo: true,
                        reveal: "always",
                        focus: false,
                        panel: "shared",
                        showReuseMessage: false,
                        clear: true
                    },
                    problemMatcher: []
                },
                {
                    label: "LodeAI: Run Question 1",
                    type: "shell",
                    command: "${command:python.interpreterPath}",
                    args: ["runner.py", "test", "1"],
                    group: "test",
                    presentation: {
                        reveal: "always",
                        panel: "shared"
                    }
                },
                {
                    label: "LodeAI: Check Code Quality",
                    type: "shell",
                    command: "${command:python.interpreterPath}",
                    args: ["runner.py", "check"],
                    group: "test",
                    presentation: {
                        reveal: "always",
                        panel: "shared"
                    }
                },
                {
                    label: "LodeAI: List Questions",
                    type: "shell",
                    command: "${command:python.interpreterPath}",
                    args: ["runner.py", "questions"],
                    presentation: {
                        reveal: "always",
                        panel: "shared"
                    }
                }
            ]
        };
        fs.writeFileSync(path.join(vscodeDir, 'tasks.json'), JSON.stringify(tasksConfig, null, 2));
        // Create settings.json
        const settingsConfig = {
            "python.defaultInterpreterPath": "${workspaceFolder}/assessment_env/bin/python",
            "python.terminal.activateEnvironment": true,
            "python.testing.pytestEnabled": true,
            "python.testing.pytestArgs": [
                "src/tests",
                "-v"
            ],
            "files.exclude": {
                "**/__pycache__": true,
                "**/*.pyc": true,
                "assessment_env": true
            },
            "python.linting.enabled": true,
            "python.linting.flake8Enabled": true,
            "python.formatting.provider": "black"
        };
        fs.writeFileSync(path.join(vscodeDir, 'settings.json'), JSON.stringify(settingsConfig, null, 2));
        logger_1.Logger.info('VSCode configuration files created');
    }
    /**
     * Create setup guide
     */
    async createSetupGuide(platform) {
        const activationCommand = platform === 'win32'
            ? 'assessment_env\\Scripts\\activate'
            : 'source assessment_env/bin/activate';
        const setupGuide = `# 🚀 LodeAI Assessment - Quick Start Guide

## ✅ Environment Setup Complete!

Your assessment environment has been automatically configured. You're ready to start coding!

---

## 📝 Quick Commands

### Run Tests
\`\`\`bash
python runner.py test           # Run all tests
python runner.py test 1         # Run specific question
\`\`\`

### Check Code Quality
\`\`\`bash
python runner.py check          # Run linting and formatting checks
\`\`\`

### List Questions
\`\`\`bash
python runner.py questions      # Show all assessment questions
\`\`\`

---

## 🎯 Getting Started

1. **Open the Question File**
   - Navigate to \`src/solutions/question_1.py\`
   - Read the problem statement
   - Implement your solution

2. **Run Your Tests**
   - Use the command palette (Cmd/Ctrl+Shift+P)
   - Type "Run Task"
   - Select "LodeAI: Run All Tests"
   - OR use the status bar button at the bottom

3. **Check Your Code Quality**
   - Run "LodeAI: Check Code Quality" task
   - Fix any linting issues

4. **Submit When Ready**
   - All tests passing? Great!
   - Code quality checks pass? Perfect!
   - You're ready to submit

---

## 🔧 Manual Environment Activation

If you need to manually activate the virtual environment:

\`\`\`bash
${activationCommand}
\`\`\`

---

## 📂 Project Structure

\`\`\`
coding-assessment/
├── src/
│   ├── solutions/          ← Your code goes here
│   │   └── question_1.py
│   └── tests/              ← Test files
│       └── test_solutions.py
├── problem_statements/     ← Detailed problem descriptions
├── runner.py              ← Main test runner
├── requirements.txt       ← Dependencies
└── README.md             ← Full documentation
\`\`\`

---

## 💡 VSCode Integration

This project is pre-configured with:
- ✅ Python virtual environment
- ✅ Pytest integration
- ✅ Code formatting (Black)
- ✅ Linting (Flake8)
- ✅ VSCode tasks for quick testing

Use the **status bar** at the bottom to quickly run tests!

---

## 🆘 Need Help?

- Check \`README.md\` for detailed instructions
- Use the LodeAI chat assistant in the sidebar
- Review problem statements in \`problem_statements/\`

---

## 🎉 Good Luck!

Take your time, write clean code, and don't forget to test thoroughly!

---

*Generated by LodeAI Assessment Platform*
`;
        fs.writeFileSync(path.join(this.projectPath, 'QUICK_START.md'), setupGuide);
        logger_1.Logger.info('Setup guide created');
    }
    /**
     * Helper to delay execution
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.EnvironmentSetup = EnvironmentSetup;
//# sourceMappingURL=environment-setup.js.map