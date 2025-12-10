import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Buffer } from 'buffer';
import { AssessmentOrchestrator } from './orchestrator/assessment-orchestrator';
import { CandidateAssignment, TestPlan } from './types/assessment-types';
import { Logger } from './utils/logger';
import { Config } from './utils/config';
import { HelperAgent } from './agents/helper-agent';
import { SandboxManager } from './utils/sandbox-manager';

// Helper function to make HTTP requests with timeout
function makeHttpRequest(url: string, data: any, timeoutMs: number = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'LodeAI-VSCode-Extension/1.0.0',
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': 'true' // Skip ngrok browser warning
            }
        };

        const requestModule = urlObj.protocol === 'https:' ? https : http;
        const req = requestModule.request(options, (res: any) => {
            let responseData = '';
            res.on('data', (chunk: any) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    // Check if response is JSON
                    if (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
                        const result = JSON.parse(responseData);
                        resolve(result);
                    } else {
                        // Handle non-JSON responses
                        if (res.statusCode && res.statusCode >= 400) {
                            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                        } else {
                            // Try to parse as JSON anyway, but with better error handling
                            try {
                                const result = JSON.parse(responseData);
                                resolve(result);
                            } catch (parseError) {
                                reject(new Error(`Invalid JSON response: ${responseData.substring(0, 100)}...`));
                            }
                        }
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        // Add timeout
        const timeout = setTimeout(() => {
            req.destroy();
            reject(new Error(`Request timeout after ${timeoutMs}ms`));
        }, timeoutMs);

        req.on('error', (error: any) => {
            clearTimeout(timeout);
            reject(error);
        });

        req.on('close', () => {
            clearTimeout(timeout);
        });

        req.write(postData);
        req.end();
    });
}

export function activate(context: vscode.ExtensionContext) {
    console.log('LodeAI 3-Agent Assessment Pipeline is now active!');

    // Initialize logger
    Logger.initialize();
    Logger.info('=== LodeAI Extension Activation Started ===');

    // Initialize config
    Config.initialize(context);
    Logger.info('✅ Step 1.1: Logger initialized');
    Logger.info('✅ Step 1.2: Config initialized');

    let currentAssignment: CandidateAssignment | null = null;
    let mainPanel: vscode.WebviewPanel | undefined;

    // Create WebviewViewProvider for sidebar authentication
    class LodeAIWebviewProvider implements vscode.WebviewViewProvider {
        public static readonly viewType = 'lodeaiAssistant';
        public _webviewView: vscode.WebviewView | undefined;

        constructor(
            private readonly _extensionUri: vscode.Uri,
            private readonly _context: vscode.ExtensionContext
        ) {}

        public resolveWebviewView(
            webviewView: vscode.WebviewView,
            context: vscode.WebviewViewResolveContext,
            _token: vscode.CancellationToken,
        ) {
            Logger.info(`resolveWebviewView called for viewType: ${LodeAIWebviewProvider.viewType}`);
            this._webviewView = webviewView;
            
            webviewView.webview.options = {
                enableScripts: true,
                localResourceRoots: [this._extensionUri]
            };

            const html = this._getHtmlForWebview(webviewView.webview);
            webviewView.webview.html = html;

            Logger.info(`Webview HTML set successfully, length: ${html.length}`);

            // Check for existing authentication and restore state
            setTimeout(async () => {
                // First check if this is an assessment folder (new window scenario)
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders && workspaceFolders.length > 0) {
                    const folderPath = workspaceFolders[0].uri.fsPath;

                    // Check for .lodeai-assessment marker (created when opening new window)
                    const markerPath = path.join(folderPath, '.lodeai-assessment');
                    if (fs.existsSync(markerPath)) {
                        try {
                            const markerContent = fs.readFileSync(markerPath, 'utf8');
                            const markerData = JSON.parse(markerContent);

                            if (markerData.skipAuth) {
                                Logger.info('Assessment folder opened in new window - skipping authentication');

                                // Send message to webview to show test interface directly
                                webviewView.webview.postMessage({
                                    type: 'assessmentFolderDetected',
                                    assessmentPath: folderPath,
                                    metadata: markerData,
                                    skipAuth: true
                                });
                                return; // Skip normal auth flow
                            }
                        } catch (error) {
                            Logger.warn('Failed to parse assessment marker:', error);
                        }
                    }

                    // Check for .lodeai.json metadata file (new dynamic detection)
                    const metadataPath = path.join(folderPath, '.lodeai.json');
                    let assessmentMetadata = null;

                    if (fs.existsSync(metadataPath)) {
                        try {
                            const metadataContent = fs.readFileSync(metadataPath, 'utf8');
                            assessmentMetadata = JSON.parse(metadataContent);
                            Logger.info(`Assessment metadata loaded: ${JSON.stringify(assessmentMetadata)}`);
                        } catch (error) {
                            Logger.warn('Failed to parse assessment metadata:', error);
                        }
                    }

                    // Fallback: Check for various assessment indicators
                    const runnerPy = path.join(folderPath, 'runner.py');
                    const readmeMd = path.join(folderPath, 'README.md');
                    const packageJson = path.join(folderPath, 'package.json');
                    const requirementsTxt = path.join(folderPath, 'requirements.txt');

                    const isAssessment = assessmentMetadata ||
                                       fs.existsSync(runnerPy) ||
                                       (fs.existsSync(readmeMd) && (fs.existsSync(packageJson) || fs.existsSync(requirementsTxt)));

                    if (isAssessment) {
                        // This is an assessment folder - show test mode
                        Logger.info('Assessment folder detected, showing test controls');
                        webviewView.webview.postMessage({
                            type: 'assessmentFolderDetected',
                            assessmentPath: folderPath,
                            metadata: assessmentMetadata
                        });
                    }
                }

                // Session restore removed - always start fresh
            }, 1000);

            // Handle messages from the webview
            webviewView.webview.onDidReceiveMessage(
                async (message: any) => {
            switch (message.type) {
                case 'authenticate':
                    await handleAuthentication(message.email, webviewView.webview);
                    break;
                case 'startAssessment':
                    await setupAssessment(message.language);
                    break;
                case 'getHelperResponse':
                    try {
                        const response = await HelperAgent.getResponse(message.message);
                        webviewView.webview.postMessage({
                            type: 'helperResponse',
                            response: response
                        });
                    } catch (error) {
                        webviewView.webview.postMessage({
                            type: 'helperError',
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                    break;
                case 'checkAssessmentFolder':
                    // Check if current workspace is an assessment folder
                    const workspaceFolders2 = vscode.workspace.workspaceFolders;
                    if (workspaceFolders2 && workspaceFolders2.length > 0) {
                        const folderPath2 = workspaceFolders2[0].uri.fsPath;

                        // Check for various assessment indicators
                        const runnerPy2 = path.join(folderPath2, 'runner.py');
                        const readmeMd2 = path.join(folderPath2, 'README.md');
                        const packageJson2 = path.join(folderPath2, 'package.json');
                        const requirementsTxt2 = path.join(folderPath2, 'requirements.txt');

                        const isAssessment2 = fs.existsSync(runnerPy2) ||
                                            (fs.existsSync(readmeMd2) && (fs.existsSync(packageJson2) || fs.existsSync(requirementsTxt2)));

                        if (isAssessment2) {
                            webviewView.webview.postMessage({ type: 'showTestControls' });
                        }
                    }
                    break;
                case 'logout':
                    // Clear current assignment
                    currentAssignment = null;

                    webviewView.webview.postMessage({
                        type: 'loggedOut'
                    });
                    break;
                case 'requestEndAssessmentConfirmation':
                    Logger.info('Requesting end assessment confirmation');
                    const confirmEndAssessment = await vscode.window.showWarningMessage(
                        message.message,
                        { modal: true },
                        'Yes, End Assessment',
                        'Cancel'
                    );
                    
                    if (confirmEndAssessment === 'Yes, End Assessment') {
                        // Send confirmation back to webview
                        webviewView.webview.postMessage({
                            type: 'endAssessmentConfirmed'
                        });
                    } else {
                        webviewView.webview.postMessage({
                            type: 'endAssessmentCancelled'
                        });
                    }
                    break;
                case 'requestSubmitAssessmentConfirmation':
                    Logger.info('Requesting submit assessment confirmation');
                    const confirmSubmitAssessment = await vscode.window.showWarningMessage(
                        message.message,
                        { modal: true },
                        'Yes, Submit',
                        'Cancel'
                    );
                    
                    if (confirmSubmitAssessment === 'Yes, Submit') {
                        // Send confirmation back to webview
                        webviewView.webview.postMessage({
                            type: 'submitAssessmentConfirmed'
                        });
                    } else {
                        webviewView.webview.postMessage({
                            type: 'submitAssessmentCancelled'
                        });
                    }
                    break;
                case 'submitAssessment':
                    Logger.info('✅ Step 6.5: Submit Assessment requested');

                    // Get assessment folder path
                    const workspaceFolders3 = vscode.workspace.workspaceFolders;
                    if (!workspaceFolders3 || workspaceFolders3.length === 0) {
                        webviewView.webview.postMessage({
                            type: 'submitError',
                            error: 'No assessment folder open'
                        });
                        return;
                    }

                    const assessmentPath2 = workspaceFolders3[0].uri.fsPath;

                    // Show confirmation dialog
                    const confirmSubmitFinal = await vscode.window.showWarningMessage(
                        '⚠️ Are you ready to submit your assessment?\n\nThis will:\n• Run final tests\n• Submit your code\n• Close this window\n• Delete the assessment folder\n\nMake sure you have saved all your work!',
                        { modal: true },
                        'Yes, Submit',
                        'Cancel'
                    );

                    if (confirmSubmitFinal !== 'Yes, Submit') {
                        Logger.info('Assessment submission cancelled by user');
                        webviewView.webview.postMessage({
                            type: 'submitCancelled'
                        });
                        return;
                    }

                    // Run final tests
                    vscode.window.showInformationMessage('Running final tests before submission...');
                    const finalTestResult = await sandboxManager.runTests(path.basename(assessmentPath2), {
                        assessmentPath: assessmentPath2,
                        timeout: 120, // Reduced from 300 to 120 seconds (2 minutes)
                        memoryLimit: '512m',
                        cpuLimit: '0.5',
                        networkDisabled: true
                    });

                    // Send results to dashboard/API
                    const submissionSuccessful = finalTestResult.success;

                    // TODO: Send to backend API
                    // await submitToBackend(currentAssignment, finalTestResult);

                    if (submissionSuccessful) {
                        Logger.info('✅ Assessment submitted successfully with passing tests');
                    } else {
                        Logger.info('⚠️ Assessment submitted with failing tests');
                    }

                    // Show result message with test details
                    let resultMessage = '';
                    if (submissionSuccessful) {
                        resultMessage = '✅ Assessment submitted successfully! All tests passed.\n\nClosing window and cleaning up...';
                    } else {
                        // Include full error details
                        let errorDetails = '';
                        if (finalTestResult.output) {
                            errorDetails += finalTestResult.output;
                        }
                        if (finalTestResult.error) {
                            errorDetails += '\n\n=== Errors ===\n' + finalTestResult.error;
                        }

                        resultMessage = '⚠️ Assessment submitted with test failures.\n\n' + errorDetails + '\n\nClosing window and cleaning up...';
                    }

                    vscode.window.showInformationMessage(resultMessage);

                    // Cleanup sandboxes
                    await sandboxManager.cleanupAllSandboxes();

                    // Close all editors
                    await vscode.commands.executeCommand('workbench.action.closeAllEditors');

                    // Delete assessment folder
                    try {
                        Logger.info(`Deleting assessment folder: ${assessmentPath2}`);

                        // Use rimraf-style recursive delete
                        const deleteRecursive = (dirPath: string) => {
                            if (fs.existsSync(dirPath)) {
                                fs.readdirSync(dirPath).forEach((file) => {
                                    const curPath = path.join(dirPath, file);
                                    if (fs.lstatSync(curPath).isDirectory()) {
                                        deleteRecursive(curPath);
                                    } else {
                                        fs.unlinkSync(curPath);
                                    }
                                });
                                fs.rmdirSync(dirPath);
                            }
                        };

                        deleteRecursive(assessmentPath2);
                        Logger.info('✅ Assessment folder deleted successfully');
                    } catch (error) {
                        Logger.error('Failed to delete assessment folder:', error);
                    }

                    // Clear authentication state
                    await this._context.globalState.update('lodeai_authenticated', false);
                    await this._context.globalState.update('lodeai_user_email', undefined);
                    await this._context.globalState.update('lodeai_assignment', undefined);
                    currentAssignment = null;

                    // Close the current window (this will close VSCode window)
                    await vscode.commands.executeCommand('workbench.action.closeWindow');

                    webviewView.webview.postMessage({
                        type: 'submitSuccess',
                        result: finalTestResult
                    });
                    break;
                case 'endAssessment':
                    Logger.info('✅ Step 7: End Assessment requested');

                    // Get current workspace folder
                    const workspaceFolders4 = vscode.workspace.workspaceFolders;
                    if (!workspaceFolders4 || workspaceFolders4.length === 0) {
                        vscode.window.showErrorMessage('No assessment folder found');
                        return;
                    }

                    const assessmentPath3 = workspaceFolders4[0].uri.fsPath;

                    // Show confirmation dialog
                    const confirmEndFinal = await vscode.window.showWarningMessage(
                        '⚠️ Are you sure you want to end this assessment?\n\nThis will:\n• Close this window\n• Delete the assessment folder\n• Clear all data\n\nThis action cannot be undone!',
                        { modal: true },
                        'Yes, End Assessment',
                        'Cancel'
                    );

                    if (confirmEndFinal !== 'Yes, End Assessment') {
                        return;
                    }

                    // Cleanup sandboxes
                    await sandboxManager.cleanupAllSandboxes();

                    // Clear current assignment
                    currentAssignment = null;

                    // Close all editors first
                    await vscode.commands.executeCommand('workbench.action.closeAllEditors');

                    // Delete assessment folder
                    try {
                        Logger.info(`Deleting assessment folder: ${assessmentPath3}`);

                        // Use rimraf-style recursive delete
                        const deleteRecursive = (dirPath: string) => {
                            if (fs.existsSync(dirPath)) {
                                fs.readdirSync(dirPath).forEach((file) => {
                                    const curPath = path.join(dirPath, file);
                                    if (fs.lstatSync(curPath).isDirectory()) {
                                        deleteRecursive(curPath);
                                    } else {
                                        fs.unlinkSync(curPath);
                                    }
                                });
                                fs.rmdirSync(dirPath);
                            }
                        };

                        deleteRecursive(assessmentPath3);
                        Logger.info('✅ Assessment folder deleted successfully');
                    } catch (error) {
                        Logger.error('Failed to delete assessment folder:', error);
                    }

                    // Show final confirmation
                    vscode.window.showInformationMessage('Assessment ended successfully. Closing window...');

                    // Close the current VSCode window
                    await vscode.commands.executeCommand('workbench.action.closeWindow');

                    // Notify webview (in case window doesn't close immediately)
                    webviewView.webview.postMessage({
                        type: 'assessmentEnded'
                    });
                    break;
                case 'runTestsInSandbox':
                    // Run tests in sandbox
                    const folders = vscode.workspace.workspaceFolders;
                    if (!folders || folders.length === 0) {
                        webviewView.webview.postMessage({
                            type: 'testResults',
                            result: { success: false, error: 'No workspace folder open', exitCode: -1, executionTime: 0 }
                        });
                        return;
                    }

                    const assessmentPath = folders[0].uri.fsPath;

                    // Read metadata to get main file
                    const metadataPath3 = path.join(assessmentPath, '.lodeai.json');
                    let mainFile = 'runner.py'; // Default
                    let testCommand = 'python runner.py';

                    if (fs.existsSync(metadataPath3)) {
                        try {
                            const metadataContent3 = fs.readFileSync(metadataPath3, 'utf8');
                            const metadata3 = JSON.parse(metadataContent3);
                            mainFile = metadata3.main_file || 'runner.py';
                            testCommand = metadata3.test_command || `python ${mainFile}`;
                            Logger.info(`Using main file: ${mainFile}, test command: ${testCommand}`);
                        } catch (error) {
                            Logger.warn('Failed to read metadata, using defaults');
                        }
                    }

                    // Check if main file exists
                    const mainFilePath = path.join(assessmentPath, mainFile);
                    if (!fs.existsSync(mainFilePath)) {
                        webviewView.webview.postMessage({
                            type: 'testResults',
                            result: { success: false, error: `Main file not found: ${mainFile}`, exitCode: -1, executionTime: 0 }
                        });
                        return;
                    }

                    const assessmentId = path.basename(assessmentPath);
                    const result = await sandboxManager.runTests(assessmentId, {
                        assessmentPath,
                        timeout: 300,
                        memoryLimit: '512m',
                        cpuLimit: '0.5',
                        networkDisabled: true
                    });

                    // Send results back to webview
                    webviewView.webview.postMessage({
                        type: 'testResults',
                        result
                    });
                    break;
                    }
                }
            );
        }

        public _getHtmlForWebview(webview: vscode.Webview) {
            return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>LodeAI - AI-Powered Coding Assessment</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, Roboto, Helvetica, Arial, sans-serif;
                        background: #000000;
                        color: #ffffff;
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: flex-start;
                        padding: 0;
                        margin: 0;
                        overflow: hidden;
                    }
                    .main-container {
                        max-width: 100%;
                        width: 100%;
                        text-align: left;
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-start;
                        padding: 20px;
                        box-sizing: border-box;
                        overflow: hidden;
                    }
                    .logo {
                        display: flex;
                        align-items: center;
                        justify-content: flex-start;
                        margin-bottom: 16px;
                        position: relative;
                    }
                    .logo-text {
                        font-family: 'Cubao', 'Inter', system-ui, sans-serif;
                        font-size: 16px;
                        font-weight: 600;
                        letter-spacing: 0.2px;
                        color: #ffffff;
                    }
                    .hero-text {
                        font-size: 24px;
                        font-weight: 800;
                        color: #ffffff;
                        margin-bottom: 8px;
                        line-height: 1.2;
                        text-align: left;
                    }
                    .subtitle {
                        font-size: 14px;
                        color: #ffffff;
                        margin-bottom: 20px;
                        line-height: 1.6;
                        text-align: left;
                    }
                    .auth-form {
                        background: rgba(255, 255, 255, 0.04);
                        border: 1px solid rgba(255, 255, 255, 0.10);
                        border-radius: 8px;
                        padding: 16px;
                        margin-bottom: 16px;
                    }
                    .form-title {
                        font-size: 18px;
                        font-weight: 700;
                        color: #e5e7eb;
                        margin-bottom: 6px;
                    }
                    .form-subtitle {
                        font-size: 13px;
                        color: #9ca3af;
                        margin-bottom: 18px;
                    }
                    .input-group {
                        margin-bottom: 20px;
                    }
                    .input-label {
                        display: block;
                        font-size: 14px;
                        font-weight: 500;
                        color: #ffffff;
                        margin-bottom: 8px;
                        text-align: left;
                    }
                    .input-field {
                        width: 100%;
                        padding: 12px 14px;
                        background: #0f1115;
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        border-radius: 10px;
                        color: #ffffff;
                        font-size: 15px;
                        box-sizing: border-box;
                        transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
                    }
                    .input-field:focus {
                        outline: none;
                        border-color: rgba(255, 255, 255, 0.25);
                        box-shadow: none;
                        background: #13161c;
                    }
                    .submit-button {
                        width: 100%;
                        background: #ffffff;
                        border: none;
                        border-radius: 12px;
                        color: #000000;
                        font-size: 15px;
                        font-weight: 800;
                        padding: 14px 22px;
                        cursor: pointer;
                        transition: none;
                        box-shadow: none;
                    }
                    .submit-button:hover {
                        box-shadow: none;
                    }
                    .submit-button:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none;
                    }
                    .error-message {
                        background: rgba(248, 81, 73, 0.08);
                        border: 1px solid rgba(248, 81, 73, 0.3);
                        border-radius: 12px;
                        padding: 12px 16px;
                        margin-top: 16px;
                        font-size: 13px;
                        color: #ffd1cc;
                        display: none;
                        box-shadow: none;
                    }
                    .error-message.show {
                        display: block;
                    }
                    .status-message {
                        background: rgba(102, 126, 234, 0.08);
                        border: 1px solid rgba(102, 126, 234, 0.3);
                        border-radius: 12px;
                        padding: 12px 16px;
                        margin-top: 16px;
                        font-size: 13px;
                        color: #a7f3d0;
                        display: none;
                        box-shadow: none;
                    }
                    .status-message.show {
                        display: block;
                    }
                    
                    /* Chat Interface Styles */
                    .chat-container {
                        display: none;
                        flex-direction: column;
                        background: rgba(255, 255, 255, 0.02);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 16px;
                        overflow: hidden;
                        height: calc(100vh - 40px);
                        margin-top: 20px;
                        max-width: 900px;
                        width: 100%;
                    }
                    
                    .chat-header {
                        padding: 16px 20px;
                        background: rgba(255, 255, 255, 0.03);
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                    
                    .chat-title {
                        font-size: 16px;
                        font-weight: 600;
                        color: #ffffff;
                    }
                    
                    .chat-status {
                        font-size: 12px;
                        color: #9ca3af;
                    }
                    
                    .chat-messages {
                        flex: 1;
                        padding: 20px;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                        min-height: 0;
                    }
                    
                    .message {
                        display: flex;
                        gap: 12px;
                        animation: slideIn 0.3s ease-out;
                    }
                    
                    @keyframes slideIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    
                    .message-avatar {
                        width: 32px;
                        height: 32px;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 14px;
                        font-weight: bold;
                        flex-shrink: 0;
                    }
                    
                    .message-avatar.ai {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    
                    .message-avatar.system {
                        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                        color: white;
                    }
                    
                    .message-content {
                        flex: 1;
                        padding: 12px 16px;
                        border-radius: 12px;
                        font-size: 14px;
                        line-height: 1.6;
                        word-wrap: break-word;
                    }
                    
                    .message-content.ai {
                        background: transparent;
                        border: none;
                        color: #e5e7eb;
                        padding: 8px 0;
                    }
                    
                    .message-content.system {
                        background: transparent;
                        border: none;
                        color: #e5e7eb;
                        padding: 8px 0;
                    }
                    
                    .message-content.error {
                        background: transparent;
                        border: none;
                        color: #fecaca;
                        padding: 8px 0;
                    }
                    
                    .message-content.warning {
                        background: transparent;
                        border: none;
                        color: #e5e7eb;
                        padding: 8px 0;
                    }
                    
                    .message-content.success {
                        background: transparent;
                        border: none;
                        color: #e5e7eb;
                        padding: 8px 0;
                    }
                    
                    .message-meta {
                        font-size: 11px;
                        color: #9ca3af;
                        margin-top: 4px;
                    }
                    
                    .typing-indicator {
                        display: none;
                        align-items: center;
                        gap: 12px;
                        padding: 12px 16px;
                        background: transparent;
                        border: none;
                        border-radius: 12px;
                        margin: 16px 0;
                    }
                    
                    .typing-dots {
                        display: flex;
                        gap: 4px;
                    }
                    
                    .typing-dot {
                        width: 6px;
                        height: 6px;
                        background: #667eea;
                        border-radius: 50%;
                        animation: typing 1.4s infinite;
                    }
                    
                    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
                    .typing-dot:nth-child(3) { animation-delay: 0.4s; }
                    
                    @keyframes typing {
                        0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
                        30% { opacity: 1; transform: scale(1); }
                    }
                    .form-subtitle {
                        font-size: 13px;
                        color: #9ca3af;
                        margin-bottom: 18px;
                    }
                    .input-group {
                        margin-bottom: 20px;
                    }
                    .input-label {
                        display: block;
                        font-size: 14px;
                        font-weight: 500;
                        color: #ffffff;
                        margin-bottom: 8px;
                        text-align: left;
                    }
                    .input-field {
                        width: 100%;
                        padding: 12px 14px;
                        background: #0f1115;
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        border-radius: 10px;
                        color: #ffffff;
                        font-size: 15px;
                        box-sizing: border-box;
                        transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
                    }
                    .input-field:focus {
                        outline: none;
                        border-color: rgba(255, 255, 255, 0.25);
                        box-shadow: none;
                        background: #13161c;
                    }
                    .submit-button {
                        width: 100%;
                        background: #ffffff;
                        border: none;
                        border-radius: 12px;
                        color: #000000;
                        font-size: 15px;
                        font-weight: 800;
                        padding: 14px 22px;
                        cursor: pointer;
                        transition: none;
                        box-shadow: none;
                    }
                    .submit-button:hover {
                        box-shadow: none;
                    }
                    .submit-button:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none;
                    }
                    .error-message {
                        background: rgba(248, 81, 73, 0.08);
                        border: 1px solid rgba(248, 81, 73, 0.3);
                        border-radius: 12px;
                        padding: 12px 16px;
                        margin-top: 16px;
                        font-size: 13px;
                        color: #ffd1cc;
                        display: none;
                        box-shadow: none;
                    }
                    .error-message.show {
                        display: block;
                    }
                    .status-message {
                        background: rgba(102, 126, 234, 0.08);
                        border: 1px solid rgba(102, 126, 234, 0.3);
                        border-radius: 12px;
                        padding: 12px 16px;
                        margin-top: 16px;
                        font-size: 13px;
                        color: #a7f3d0;
                        display: none;
                        box-shadow: none;
                    }
                    .status-message.show {
                        display: block;
                    }
                    .progress-container {
                        display: none;
                        background: rgba(255, 255, 255, 0.04);
                        border: 1px solid rgba(255, 255, 255, 0.10);
                        border-radius: 12px;
                        padding: 22px;
                        margin-top: 16px;
                    }
                    .progress-container.show {
                        display: block;
                    }
                    .progress-messages {
                        max-height: 200px;
                        overflow-y: auto;
                        font-size: 13px;
                        line-height: 1.4;
                    }
                    .progress-message {
                        background: rgba(255, 255, 255, 0.04);
                        border: 1px solid rgba(255, 255, 255, 0.10);
                        border-radius: 8px;
                        padding: 8px 12px;
                        margin: 4px 0;
                        font-size: 12px;
                        color: #ffffff;
                    }
                    .ai-streaming {
                        padding: 20px;
                        margin-bottom: 8px;
                        background: #000000;
                        border: 1px solid #333333;
                        border-radius: 8px;
                        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
                        min-height: 300px;
                        position: relative;
                    }
                    .streaming-content {
                        max-height: calc(100vh - 200px);
                        overflow-y: auto;
                        padding-right: 8px;
                        background: #000000;
                        color: #ffffff;
                    }
                    .streaming-line {
                        font-size: 14px;
                        color: #ffffff;
                        font-weight: 400;
                        line-height: 1.4;
                        margin-bottom: 2px;
                        padding: 0;
                        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
                        white-space: pre-wrap;
                    }
                    .streaming-line.thinking {
                        color: #ffffff;
                        filter: blur(0.5px);
                        font-style: italic;
                    }
                    .streaming-line.action {
                        color: #ffffff;
                    }
                    .streaming-line.success {
                        color: #ffffff;
                    }
                    .streaming-line.error {
                        color: #ffffff;
                    }
                    .streaming-line.info {
                        color: #ffffff;
                    }
                    .streaming-line.plan {
                        color: #ffffff;
                    }
                    .streaming-line.execute {
                        color: #ffffff;
                    }
                    .terminal-cursor {
                        display: inline-block;
                        width: 8px;
                        height: 16px;
                        background: #ffffff;
                        animation: blink 1s infinite;
                        margin-left: 2px;
                    }
                    @keyframes fadeInLine {
                        from {
                            opacity: 0;
                            transform: translateY(4px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    .typing-cursor {
                        display: inline-block;
                        width: 2px;
                        height: 14px;
                        background: #ffffff;
                        animation: blink 1s infinite;
                        margin-left: 2px;
                    }
                    @keyframes blink {
                        0%, 50% { opacity: 1; }
                        51%, 100% { opacity: 0; }
                    }
                    @keyframes streamingPulse {
                        0%, 60%, 100% {
                            transform: scale(1);
                            opacity: 0.5;
                        }
                        30% {
                            transform: scale(1.2);
                            opacity: 1;
                        }
                    }
                    @keyframes fadeSlideIn {
                        0% { opacity: 0; transform: translateY(3px); }
                        100% { opacity: 1; transform: translateY(0); }
                    }
                    .enter { animation: fadeSlideIn 150ms ease forwards; }
                    @media (max-width: 480px) {
                        .container { max-width: 100%; }
                        .hero-text { font-size: 26px; }
                        .subtitle { font-size: 14px; }
                        .auth-form { padding: 20px; border-radius: 14px; }
                    }
                    @media (prefers-reduced-motion: reduce) {
                        * { animation: none !important; transition: none !important; }
                    }
                    
                    /* Test Controls Styles */
                    .test-controls {
                        padding: 16px 20px;
                        background: rgba(255, 255, 255, 0.02);
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    .test-button {
                        width: 100%;
                        padding: 12px 20px;
                        background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    }
                    .test-button:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
                    }
                    .test-button:active {
                        transform: translateY(0);
                    }
                    .test-button:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none !important;
                    }
                    .test-icon {
                        font-size: 12px;
                    }
                    .test-status {
                        padding: 12px;
                        border-radius: 6px;
                        font-size: 13px;
                        line-height: 1.5;
                        display: none;
                    }
                    .test-status.show {
                        display: block;
                    }
                    .test-status.running {
                        background: rgba(59, 130, 246, 0.1);
                        border: 1px solid rgba(59, 130, 246, 0.3);
                        color: #60a5fa;
                    }
                    .test-status.success {
                        background: rgba(74, 222, 128, 0.1);
                        border: 1px solid rgba(74, 222, 128, 0.3);
                        color: #4ade80;
                    }
                    .test-status.error {
                        background: rgba(239, 68, 68, 0.1);
                        border: 1px solid rgba(239, 68, 68, 0.3);
                        color: #ef4444;
                    }

                    /* Chat Input Styles */
                    .chat-input-container {
                        padding: 16px 20px;
                        background: rgba(255, 255, 255, 0.03);
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    
                    .chat-input-wrapper {
                        display: flex;
                        gap: 12px;
                        align-items: center;
                    }
                    
                    .chat-input {
                        flex: 1;
                        padding: 12px 16px;
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        border-radius: 8px;
                        color: #ffffff;
                        font-size: 14px;
                        outline: none;
                        transition: border-color 0.2s ease;
                    }
                    
                    .chat-input:focus {
                        border-color: rgba(255, 255, 255, 0.3);
                        background: rgba(255, 255, 255, 0.08);
                    }
                    
                    .chat-input::placeholder {
                        color: rgba(255, 255, 255, 0.5);
                    }
                    
                    .send-button {
                        padding: 12px 20px;
                        background: #ffffff;
                        color: #000000;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: opacity 0.2s ease;
                        white-space: nowrap;
                    }
                    
                    .send-button:hover {
                        opacity: 0.9;
                    }
                    
                    .send-button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    
                    .chat-help-text {
                        font-size: 12px;
                        color: rgba(255, 255, 255, 0.6);
                        text-align: center;
                        line-height: 1.4;
                    }
                </style>
            </head>
            <body>
                <div class="main-container">
                    <!-- Header -->
                    <div class="header">
                        <div class="logo-section">
                            <div class="logo-text">LodeAI</div>
                        </div>
                        <div class="status-indicator" id="statusIndicator">
                            <div class="status-dot"></div>
                        </div>
                    </div>

                    <!-- Authentication Form -->
                    <div class="auth-form" id="authFormContainer">
                        <h2 class="form-title">Welcome to LodeAI</h2>
                        <p class="form-subtitle">AI-Powered Technical Assessment Platform</p>
                        <p style="color: #9ca3af; font-size: 14px; margin-bottom: 20px;">Enter your email to access your personalized assessment</p>

                        <form id="authForm">
                            <div class="input-group">
                                <label class="input-label" for="email">Email Address</label>
                                <input
                                    type="email"
                                    id="email"
                                    class="input-field"
                                    placeholder="your.email@example.com"
                                    required
                                >
                            </div>

                            <button type="submit" class="submit-button" id="submitButton">
                                Continue
                            </button>
                        </form>

                        <div class="error-message" id="errorMessage"></div>
                        <div class="status-message" id="statusMessage"></div>
                    </div>

                    <!-- Assessment Setup Form (shown after authentication) -->
                    <div class="auth-form" id="assessmentSetupContainer" style="display: none;">
                        <h2 class="form-title">Assessment Details</h2>
                        <p class="form-subtitle" id="jobTitleDisplay"></p>

                        <form id="assessmentSetupForm">
                            <div class="input-group">
                                <label class="input-label" for="languageSelect">Select Programming Language</label>
                                <select
                                    id="languageSelect"
                                    class="input-field"
                                    required
                                    style="cursor: pointer;"
                                >
                                    <option value="">-- Choose Language --</option>
                                    <option value="python">Python</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="typescript">TypeScript</option>
                                    <option value="java">Java</option>
                                    <option value="go">Go</option>
                                    <option value="cpp">C++</option>
                                </select>
                            </div>

                            <button type="submit" class="submit-button" id="startAssessmentButton">
                                Start Assessment
                            </button>
                        </form>
                    </div>

                    <!-- Chat Interface -->
                    <div class="chat-container" id="chatContainer" style="display: none;">
                        <div class="chat-header">
                            <div class="chat-title">AI Assessment Assistant</div>
                            <div class="chat-status" id="chatStatus">
                                <span id="chatStatusText">Initializing...</span>
                            </div>
                        </div>
                        
                        <div class="chat-messages" id="chatMessages">
                            <!-- Messages will be dynamically added here -->
                        </div>
                        
                        <!-- Typing indicator -->
                        <div class="typing-indicator" id="typingIndicator" style="display: none;">
                            <div class="typing-dots">
                                <div class="typing-dot"></div>
                                <div class="typing-dot"></div>
                                <div class="typing-dot"></div>
                            </div>
                        </div>
                        
                        <!-- Test Runner Controls -->
                        <div class="test-controls" id="testControls" style="display: none;">
                            <button id="runTestsButton" class="test-button">
                                <span class="test-icon">▶</span>
                                <span>Run Tests in Sandbox</span>
                            </button>
                            <button id="submitAssessmentButton" class="test-button" style="background: #16a34a; margin-top: 12px;">
                                <span class="test-icon">✓</span>
                                <span>Submit Assessment</span>
                            </button>
                            <button id="endAssessmentButton" class="test-button" style="background: #dc2626; margin-top: 12px;">
                                <span class="test-icon">⏹</span>
                                <span>End Assessment</span>
                            </button>
                            <div id="testStatus" class="test-status"></div>
                        </div>

                        <!-- Chat Input -->
                        <div class="chat-input-container">
                            <div class="chat-input-wrapper">
                                <input type="text" id="chatInput" placeholder="Ask about project structure, files, or questions..." class="chat-input" />
                                <button id="sendButton" class="send-button">
                                    <span>Send</span>
                                </button>
                            </div>
                            <div class="chat-help-text">
                                💡 I can help you understand the project structure, find files, or clarify questions about the assignment.
                            </div>
                        </div>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    let isAuthenticated = false;
                    let currentAssignment = null;
                    const form = document.getElementById('authForm');
                    const emailInput = document.getElementById('email');
                    const submitButton = document.getElementById('submitButton');
                    const errorMessage = document.getElementById('errorMessage');
                    const statusMessage = document.getElementById('statusMessage');
                    const authFormContainer = document.getElementById('authFormContainer');
                    const chatContainer = document.getElementById('chatContainer');
                    const chatMessages = document.getElementById('chatMessages');
                    const typingIndicator = document.getElementById('typingIndicator');
                    const statusIndicator = document.getElementById('statusIndicator');
                    const statusText = document.getElementById('statusText');
                    const chatStatusText = document.getElementById('chatStatusText');
                    const chatInput = document.getElementById('chatInput');
                    const sendButton = document.getElementById('sendButton');
                    const testControls = document.getElementById('testControls');
                    const runTestsButton = document.getElementById('runTestsButton');
                    const endAssessmentButton = document.getElementById('endAssessmentButton');
                    const testStatus = document.getElementById('testStatus');

                    function showError(message) {
                        errorMessage.textContent = message;
                        errorMessage.classList.add('show');
                        statusMessage.classList.remove('show');
                        submitButton.disabled = false;
                        submitButton.textContent = 'Start Assessment';
                        updateStatus('error', 'Authentication Failed');
                    }

                    function showStatus(message) {
                        statusMessage.textContent = message;
                        statusMessage.classList.add('show');
                        errorMessage.classList.remove('show');
                    }

                    


                    function addMessage(sender, content, type = 'info') {
                        const messageDiv = document.createElement('div');
                        messageDiv.className = 'message';
                        
                        // Avatar removed
                        
                        const messageContent = document.createElement('div');
                        messageContent.className = 'message-content ' + type;
                        messageContent.innerHTML = formatMessage(content);
                        
                        const messageMeta = document.createElement('div');
                        messageMeta.className = 'message-meta';
                        messageMeta.innerHTML = '<span>' + new Date().toLocaleTimeString() + '</span><span>' + sender.toUpperCase() + '</span>';
                        
                        // Avatar removed
                        messageContent.appendChild(messageMeta);
                        messageDiv.appendChild(messageContent);
                        
                        if (chatMessages) {
                            chatMessages.appendChild(messageDiv);
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                        
                        return messageDiv;
                    }

                    function formatMessage(content) {
                        return content
                            .replace(/\\*\\*(.*?)\\*\\*/g, "<strong>$1</strong>")
                            .replace(/\\*(.*?)\\*/g, "<em>$1</em>")
                            .replace(/\\n/g, "<br>");
                    }

                    function showTypingIndicator() {
                        if (typingIndicator && chatMessages) {
                            typingIndicator.style.display = 'flex';
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    }

                    function hideTypingIndicator() {
                        if (typingIndicator) {
                            typingIndicator.style.display = 'none';
                        }
                    }

                    function streamMessage(sender, content, type = 'info', speed = 20) {
                        return new Promise((resolve) => {
                            showTypingIndicator();
                            
                            setTimeout(() => {
                                hideTypingIndicator();
                                
                                const messageDiv = addMessage(sender, '', type);
                                const messageContent = messageDiv.querySelector('.message-content');
                                
                                let index = 0;
                                const interval = setInterval(() => {
                                    if (index < content.length) {
                                        messageContent.innerHTML = formatMessage(content.substring(0, index + 1));
                                        chatMessages.scrollTop = chatMessages.scrollHeight;
                                        index++;
                                    } else {
                                        clearInterval(interval);
                                        resolve();
                                    }
                                }, speed);
                            }, 500);
                        });
                    }

                    function updateChatStatus(status) {
                        if (chatStatusText) {
                            chatStatusText.textContent = status;
                        }
                    }

                    function updateStatus(type, text) {
                        // Simple status update - could be enhanced later
                        console.log('Status update:', type, text);
                        if (statusText) {
                            statusText.textContent = text;
                        }
                    }

                    function showChatInterface() {
                        console.log('Showing chat interface');
                        if (authFormContainer) {
                            authFormContainer.style.display = 'none';
                        }
                        if (chatContainer) {
                            chatContainer.style.display = 'flex';
                        }
                        updateStatus('active', 'Assessment in Progress');

                        // Check if we're in an assessment folder and show test controls
                        vscode.postMessage({ type: 'checkAssessmentFolder' });

                        // Welcome message removed
                    }

                    // Test button handler
                    function handleRunTests() {
                        if (runTestsButton.disabled) return;

                        // Disable button
                        runTestsButton.disabled = true;
                        runTestsButton.innerHTML = '<span class="test-icon">⏳</span><span>Running Tests...</span>';

                        // Show running status
                        testStatus.className = 'test-status running show';
                        testStatus.textContent = 'Running tests in secure sandbox environment...';

                        // Send message to extension to run tests
                        vscode.postMessage({ type: 'runTestsInSandbox' });
                    }

                    // Listen for test button click
                    if (runTestsButton) {
                        runTestsButton.addEventListener('click', handleRunTests);
                    }

                    // End Assessment button handler
                    function handleEndAssessment() {
                        // Request confirmation from extension instead of using confirm()
                        vscode.postMessage({ 
                            type: 'requestEndAssessmentConfirmation',
                            message: 'Are you sure you want to end this assessment? This will close all windows and cleanup the assessment environment.'
                        });
                    }

                    // Listen for end assessment button click
                    if (endAssessmentButton) {
                        endAssessmentButton.addEventListener('click', handleEndAssessment);
                    }

                    // Submit Assessment button handler
                    const submitAssessmentButton = document.getElementById('submitAssessmentButton');
                    function handleSubmitAssessment() {
                        // Request confirmation from extension instead of using confirm()
                        vscode.postMessage({ 
                            type: 'requestSubmitAssessmentConfirmation',
                            message: 'Are you ready to submit your assessment? Make sure all your code is saved and tests are passing.'
                        });
                    }

                    // Listen for submit assessment button click
                    if (submitAssessmentButton) {
                        submitAssessmentButton.addEventListener('click', handleSubmitAssessment);
                    }

                    // Helper agent function - sends message to extension for AI response
                    function getHelperResponse(userMessage) {
                        return new Promise((resolve, reject) => {
                            // Send message to extension to get AI response
                            vscode.postMessage({
                                type: 'getHelperResponse',
                                message: userMessage
                            });
                            
                            // Listen for response
                            const handleResponse = (event) => {
                                const message = event.data;
                                if (message.type === 'helperResponse') {
                                    window.removeEventListener('message', handleResponse);
                                    resolve(message.response);
                                } else if (message.type === 'helperError') {
                                    window.removeEventListener('message', handleResponse);
                                    reject(new Error(message.error));
                                }
                            };
                            
                            window.addEventListener('message', handleResponse);
                            
                            // Timeout after 30 seconds
                            setTimeout(() => {
                                window.removeEventListener('message', handleResponse);
                                reject(new Error('Helper response timeout'));
                            }, 30000);
                        });
                    }
                    
                    // Handle chat input
                    function handleChatInput() {
                        const message = chatInput.value.trim();
                        if (!message) return;
                        
                        // Add user message
                        addMessage('user', message);
                        
                        // Clear input
                        chatInput.value = '';
                        
                        // Show typing indicator
                        showTypingIndicator();
                        
                        // Get helper response from Claude AI
                        getHelperResponse(message)
                            .then(response => {
                                hideTypingIndicator();
                                addMessage('ai', response);
                            })
                            .catch(error => {
                                hideTypingIndicator();
                                addMessage('ai', 'I apologize, but I am having trouble connecting to my AI assistant right now. Please try asking about project structure, file locations, or assignment requirements.');
                                console.error('Helper agent error:', error);
                            });
                    }
                    
                    // Event listeners for chat input
                    if (sendButton && chatInput) {
                        sendButton.addEventListener('click', handleChatInput);
                        chatInput.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                handleChatInput();
                            }
                        });
                    }


                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const email = emailInput.value.trim();
                        
                        console.log('Form submitted with email:', email);
                        
                        if (!email) {
                            showError('Please enter your email address');
                            return;
                        }

                        console.log('Email validation result:', isValidEmail(email));
                        if (!isValidEmail(email)) {
                            showError('Please enter a valid email address');
                            return;
                        }

                        submitButton.disabled = true;
                        submitButton.textContent = 'Authenticating...';
                        showStatus('Authenticating with recruiter dashboard...');
                        updateStatus('active', 'Authenticating...');
                        
                        console.log('Sending authenticate message to extension');
                        vscode.postMessage({
                            type: 'authenticate',
                            email: email
                        });
                    });

                    function isValidEmail(email) {
                        console.log('Validating email:', email);
                        console.log('Email length:', email.length);
                        console.log('Email characters:', email.split('').map(c => c.charCodeAt(0)));

                        // Simple email validation - just check for @ and .
                        const hasAt = email.includes('@');
                        const hasDot = email.includes('.');
                        const hasSpace = email.includes(' ');

                        console.log('Has @:', hasAt);
                        console.log('Has .:', hasDot);
                        console.log('Has space:', hasSpace);

                        const result = hasAt && hasDot && !hasSpace && email.length > 5;
                        console.log('Simple validation result:', result);

                        // Also try regex validation
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        const regexResult = emailRegex.test(email);
                        console.log('Regex test result:', regexResult);

                        return result || regexResult;
                    }

                    // Assessment Setup Form Handler
                    const assessmentSetupForm = document.getElementById('assessmentSetupForm');
                    const languageSelect = document.getElementById('languageSelect');
                    const startAssessmentButton = document.getElementById('startAssessmentButton');

                    assessmentSetupForm.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const selectedLanguage = languageSelect.value;

                        console.log('Assessment setup form submitted with language:', selectedLanguage);

                        if (!selectedLanguage) {
                            alert('Please select a programming language');
                            return;
                        }

                        startAssessmentButton.disabled = true;
                        startAssessmentButton.textContent = 'Starting Assessment...';

                        console.log('Sending startAssessment message with language:', selectedLanguage);
                        vscode.postMessage({
                            type: 'startAssessment',
                            language: selectedLanguage
                        });

                        // Show chat interface
                        setTimeout(() => {
                            showChatInterface();
                        }, 500);
                    });

                    window.addEventListener('message', (event) => {
                        const message = event.data;
                        console.log('Received message from extension:', message);

                        if (message.type === 'authError') {
                            console.log('Authentication error:', message.message);
                            showError(message.message);
                        } else if (message.type === 'autoAuth') {
                            // Restore authentication from previous session
                            console.log('Auto-authenticating with stored credentials');
                            isAuthenticated = true;
                            currentAssignment = message.assignment;

                            // Show chat interface directly
                            if (authFormContainer) {
                                authFormContainer.style.display = 'none';
                            }
                            if (chatContainer) {
                                chatContainer.style.display = 'flex';
                            }
                            updateStatus('active', 'Session Restored');

                            // Check if we should show test controls
                            vscode.postMessage({ type: 'checkAssessmentFolder' });
                        } else if (message.type === 'assessmentFolderDetected') {
                            // Assessment folder detected - skip auth, show test mode directly
                            console.log('Assessment folder detected, showing test mode');
                            if (authFormContainer) {
                                authFormContainer.style.display = 'none';
                            }
                            if (chatContainer) {
                                chatContainer.style.display = 'flex';
                            }
                            if (testControls) {
                                testControls.style.display = 'flex';
                            }
                            updateStatus('active', 'Assessment Testing Mode');
                            addMessage('system', 'Assessment folder detected! Click the button below to run your tests in a secure sandbox.', 'info');
                        } else if (message.type === 'showTestControls') {
                            // Show test controls when assessment folder is detected
                            if (testControls) {
                                testControls.style.display = 'flex';
                            }
                        } else if (message.type === 'endAssessmentConfirmed') {
                            // User confirmed end assessment - proceed with ending
                            const endAssessmentButton = document.getElementById('endAssessmentButton');
                            if (endAssessmentButton) {
                                endAssessmentButton.disabled = true;
                                endAssessmentButton.innerHTML = '<span class="test-icon">⏳</span><span>Ending Assessment...</span>';
                                vscode.postMessage({ type: 'endAssessment' });
                            }
                        } else if (message.type === 'endAssessmentCancelled') {
                            // User cancelled end assessment - reset button
                            const endAssessmentButton = document.getElementById('endAssessmentButton');
                            if (endAssessmentButton) {
                                endAssessmentButton.disabled = false;
                                endAssessmentButton.innerHTML = '<span class="test-icon">⏹</span><span>End Assessment</span>';
                            }
                        } else if (message.type === 'submitAssessmentConfirmed') {
                            // User confirmed submit assessment - proceed with submission
                            const submitAssessmentButton = document.getElementById('submitAssessmentButton');
                            if (submitAssessmentButton) {
                                submitAssessmentButton.disabled = true;
                                submitAssessmentButton.innerHTML = '<span class="test-icon">⏳</span><span>Submitting...</span>';
                                vscode.postMessage({ type: 'submitAssessment' });
                            }
                        } else if (message.type === 'submitAssessmentCancelled') {
                            // User cancelled submit assessment - reset button
                            const submitAssessmentButton = document.getElementById('submitAssessmentButton');
                            if (submitAssessmentButton) {
                                submitAssessmentButton.disabled = false;
                                submitAssessmentButton.innerHTML = '<span class="test-icon">📤</span><span>Submit Assessment</span>';
                            }
                        } else if (message.type === 'assessmentEnded') {
                            // Assessment ended - reset UI
                            console.log('Assessment ended, resetting UI');

                            // Hide chat and test controls
                            if (chatContainer) {
                                chatContainer.style.display = 'none';
                            }
                            if (testControls) {
                                testControls.style.display = 'none';
                            }

                            // Show auth form again
                            if (authFormContainer) {
                                authFormContainer.style.display = 'block';
                            }

                            // Reset assessment setup container
                            const assessmentSetupContainer2 = document.getElementById('assessmentSetupContainer');
                            if (assessmentSetupContainer2) {
                                assessmentSetupContainer2.style.display = 'none';
                            }

                            // Clear messages
                            if (chatMessages) {
                                chatMessages.innerHTML = '';
                            }

                            // Reset status
                            updateStatus('idle', 'Ready');

                            // Show success message
                            addMessage('system', 'Assessment ended. You can start a new assessment by entering your email.', 'success');
                        } else if (message.type === 'testResults') {
                            // Handle test results
                            const result = message.result;

                            runTestsButton.disabled = false;
                            runTestsButton.innerHTML = '<span class="test-icon">▶</span><span>Run Tests in Sandbox</span>';

                            // Parse test counts from pytest output
                            let passed = 0, failed = 0, total = 0;
                            if (result.output) {
                                // Look for pytest summary like "5 passed, 3 failed in 2.5s"
                                const passMatch = result.output.match(/(\\d+)\\s+passed/);
                                const failMatch = result.output.match(/(\\d+)\\s+failed/);
                                if (passMatch) passed = parseInt(passMatch[1]);
                                if (failMatch) failed = parseInt(failMatch[1]);
                                total = passed + failed;
                            }

                            if (result.success) {
                                testStatus.className = 'test-status success show';
                                const countMsg = total > 0 ? total + ' tests passed' : 'All tests passed';
                                testStatus.innerHTML = '✅ ' + countMsg + '!<br>Execution time: ' + result.executionTime + 'ms';
                                addMessage('system', 'Tests passed successfully! ✅\\n\\n✓ ' + countMsg + '\\nExecution time: ' + result.executionTime + 'ms', 'success');
                            } else {
                                testStatus.className = 'test-status error show';

                                // Combine output and error for complete message
                                let fullError = '';
                                if (result.output) {
                                    fullError += result.output;
                                }
                                if (result.error) {
                                    fullError += '\\n\\n=== Errors ===\\n' + result.error;
                                }

                                const countMsg = total > 0 ? passed + ' passed, ' + failed + ' failed (out of ' + total + ' total)' : 'Tests failed';
                                testStatus.innerHTML = '❌ ' + countMsg + '<br>Check message below';
                                addMessage('system', 'Tests failed ❌\\n\\n📊 Test Results: ' + countMsg + '\\n\\n' + (fullError || 'Unknown error occurred'), 'error');
                            }
                        } else if (message.type === 'authSuccess') {
                            console.log('Authentication successful');

                            // Store authentication state
                            isAuthenticated = true;
                            currentAssignment = message.assignment || null;

                            // Hide auth form, show assessment setup form
                            authFormContainer.style.display = 'none';
                            const assessmentSetupContainer = document.getElementById('assessmentSetupContainer');
                            assessmentSetupContainer.style.display = 'block';

                            // Display job title
                            const jobTitleDisplay = document.getElementById('jobTitleDisplay');
                            const jobTitle = message.assignment?.test_plans?.job_descriptions?.title || 'Technical Assessment';
                            jobTitleDisplay.textContent = 'Position: ' + jobTitle;

                            console.log('Showing assessment setup with job:', jobTitle);
                        } else if (message.type === 'agentMessage') {
                            // Show real AI content in chat interface
                            const content = message.payload.content;
                            const level = message.payload.level;
                            
                            // Determine message type based on level
                            let messageType = 'info';
                            if (level === 'success') {
                                messageType = 'success';
                            } else if (level === 'error') {
                                messageType = 'error';
                            } else if (level === 'warning') {
                                messageType = 'warning';
                            } else if (level === 'execute' || level === 'plan') {
                                messageType = 'info';
                            }
                            
                            // Stream the AI message
                            streamMessage('ai', content, messageType);
                            
                            // Update chat status
                            if (level === 'plan') {
                                updateChatStatus('Planning assessment...');
                            } else if (level === 'execute') {
                                updateChatStatus('Executing tasks...');
                            } else if (level === 'success') {
                                updateChatStatus('Assessment complete!');
                                updateStatus('ready', 'Assessment Ready');
                            } else if (level === 'error') {
                                updateChatStatus('Error occurred');
                                updateStatus('error', 'Error');
                            }
                        }
                    });
                    
                    // Initialize on load
                    setTimeout(() => {
                        console.log('Webview loaded and ready');
                    }, 100);
                </script>
            </body>
            </html>`;
        }
    }

    const webviewProvider = new LodeAIWebviewProvider(context.extensionUri, context);
    const webviewView = vscode.window.registerWebviewViewProvider(LodeAIWebviewProvider.viewType, webviewProvider);
    
    Logger.info(`WebviewViewProvider registered for viewType: ${LodeAIWebviewProvider.viewType}`);

    // Auto-open the sidebar when extension activates
    setTimeout(() => {
        vscode.commands.executeCommand('lodeai.showSidebar');
    }, 1000);

    async function handleAuthentication(email: string, webview: vscode.Webview) {
        Logger.info(`Starting authentication for email: ${email}`);

        try {
            // Try new recruiter dashboard system first
            try {
                Logger.info('Attempting to connect to recruiter dashboard...');
                Logger.info(`Making request to: https://lodeai.vercel.app/api/validate-candidate`);
                Logger.info(`Request body: ${JSON.stringify({ email, job_description: '' })}`);
                
                const validationResult = await makeHttpRequest('https://lodeai.vercel.app/api/validate-candidate', {
                    email: email,
                    job_description: '' // We'll get this from the response
                });

                Logger.info(`API response: ${JSON.stringify(validationResult)}`);
                Logger.info(`Valid check: ${validationResult?.valid}, Assignment check: ${!!validationResult?.assignment}`);
                Logger.info(`Response type: ${typeof validationResult}`);
                Logger.info(`Response keys: ${validationResult ? Object.keys(validationResult) : 'null'}`);
                
                if (validationResult && validationResult.valid === true && validationResult.assignment) {
                    Logger.info('Assignment found, proceeding with authentication...');
                    // Create assignment object compatible with existing system
                    const assignmentData = {
                        id: validationResult.assignment.id,
                        test_plan_id: validationResult.assignment.id,
                        candidate_email: validationResult.assignment.candidate_email,
                        status: 'pending' as const,
                        created_at: validationResult.assignment.assigned_at || new Date().toISOString(),
                        test_plans: {
                            id: validationResult.assignment.id,
                            assignment: validationResult.assignment.job_description,
                            required_files: [],
                            dependencies: [],
                            instructions: '',
                            job_descriptions: {
                                title: validationResult.assignment.job_title || '',
                                description: validationResult.assignment.job_description,
                                requirements: []
                            }
                        }
                    };
                    
                    currentAssignment = assignmentData;

                    // Send success message to webview
                    webview.postMessage({
                        type: 'authSuccess',
                        message: 'Authentication successful!',
                        assignment: assignmentData
                    });
                    return;
                } else {
                    Logger.warn('No valid assignment found for email:', email);
                    Logger.warn('API response was:', JSON.stringify(validationResult));
                    Logger.warn('Response valid field:', validationResult?.valid);
                    Logger.warn('Response assignment field:', validationResult?.assignment);
                    
                    // Send error message to webview
                    webview.postMessage({
                        type: 'authError',
                        message: 'No assignment found for this email address. Please contact your recruiter.'
                    });
                    return;
                }
            } catch (fetchError) {
                Logger.error('New validation endpoint failed:', fetchError);
                const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
                
                // Provide more specific error information
                if (errorMessage.includes('Invalid JSON response')) {
                    Logger.error('Server returned non-JSON response. This might indicate:');
                    Logger.error('1. The endpoint is not available');
                    Logger.error('2. The server is returning an HTML error page');
                    Logger.error('3. The ngrok tunnel might be down');
                } else if (errorMessage.includes('HTTP 4') || errorMessage.includes('HTTP 5')) {
                    Logger.error('Server returned HTTP error. Check if the endpoint is working.');
                } else if (errorMessage.includes('timeout')) {
                    Logger.error('Request timed out. Database connection may be slow or unavailable.');
                } else {
                    Logger.error('Network or connection error occurred.');
                }

                // No fallback - show clear error message
                Logger.error('Authentication failed - no assignment found and no fallback available');
                webview.postMessage({
                    type: 'authError',
                    message: 'No assignment found for this email address. Please contact your recruiter to ensure you have been assigned an assessment.'
                });
                return;
            }

        } catch (error) {
            Logger.error('Authentication error:', error);
            
            // Send error message to webview
            webview.postMessage({
                type: 'authError',
                message: 'Error validating email address. Please try again.'
            });
        }
    }

    async function setupAssessment(preferredLanguage?: string) {
        if (!currentAssignment) {
            vscode.window.showErrorMessage('Please authenticate first by entering your email address.');
            return;
        }

        Logger.info(`✅ Step 2: User selected language: ${preferredLanguage || 'not specified'}`);

        // Determine project directory
        let baseDirectory: string;
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (workspaceFolders && workspaceFolders.length > 0) {
            baseDirectory = workspaceFolders[0].uri.fsPath;
        } else {
            baseDirectory = os.homedir();
        }

        const projectPath = path.join(baseDirectory, `lodeai-assessment-${Date.now()}`);
        if (!fs.existsSync(projectPath)) {
            fs.mkdirSync(projectPath, { recursive: true });
        }

        try {
            const orchestrator = new AssessmentOrchestrator(undefined, projectPath, webviewProvider);

            const jobDescription = currentAssignment.test_plans.assignment;
            const resumeText = currentAssignment.resume_text || 'Resume content not available';

            // Pass the preferred language to orchestrator
            const success = await orchestrator.createAssessment(jobDescription, resumeText, preferredLanguage);

            if (success) {
                // Show success message with delay option
                const action = await vscode.window.showInformationMessage(
                    '✅ Assessment created successfully! Opening in new window...',
                    'Open Now',
                    'Stay Here'
                );

                if (action === 'Open Now' || !action) {
                    // Wait a bit to ensure all files are written
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // The actual assessment files are in coding-assessment subfolder
                    const codingAssessmentPath = path.join(projectPath, 'coding-assessment');

                    // Store a marker file in the coding-assessment folder to indicate this is an assessment folder
                    const markerPath = path.join(codingAssessmentPath, '.lodeai-assessment');
                    fs.writeFileSync(markerPath, JSON.stringify({
                        candidateEmail: currentAssignment?.candidate_email || '',
                        createdAt: new Date().toISOString(),
                        jobTitle: currentAssignment?.test_plans?.job_descriptions?.title || 'Assessment',
                        skipAuth: true  // Flag to skip authentication in new window
                    }));

                    Logger.info('✅ Step 4: Opening assessment folder in new window...');

                    // Open the coding-assessment folder (where the actual files are)
                    const uri = vscode.Uri.file(codingAssessmentPath);
                    await vscode.commands.executeCommand('vscode.openFolder', uri, true);
                }
            } else {
                vscode.window.showErrorMessage('Assessment creation failed. Please check the logs.');
            }

        } catch (error) {
            const errorMessage = `Assessment setup error: ${error}`;
            vscode.window.showErrorMessage(`${errorMessage}`);
            Logger.error('Assessment setup error:', error);
        }
    }

    const setupAssessmentCommand = vscode.commands.registerCommand('lodeai.setupAssessment', setupAssessment);

    // Register commands for sidebar
    const showSidebarCommand = vscode.commands.registerCommand('lodeai.showSidebar', () => {
        vscode.commands.executeCommand('lodeaiAssistant.focus');
    });
    
    const authenticateCommand = vscode.commands.registerCommand('lodeai.authenticate', async () => {
        const email = await vscode.window.showInputBox({
            prompt: 'Enter your email address',
            placeHolder: 'your.email@example.com',
            validateInput: (text: string) => {
                if (!text || !text.includes('@')) {
                    return 'Please enter a valid email address';
                }
                return null;
            }
        });

        if (email && webviewProvider._webviewView) {
            await handleAuthentication(email, webviewProvider._webviewView.webview);
        }
    });

    const refreshWebviewCommand = vscode.commands.registerCommand('lodeai.refreshWebview', () => {
        if (webviewProvider._webviewView) {
            const html = webviewProvider._getHtmlForWebview(webviewProvider._webviewView.webview);
            webviewProvider._webviewView.webview.html = html;
            Logger.info('Webview refreshed manually');
        }
    });

    // Sandbox commands for running assessments securely
    const sandboxManager = SandboxManager.getInstance();

    const buildSandboxCommand = vscode.commands.registerCommand('lodeai.buildSandbox', async () => {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Building assessment sandbox...',
            cancellable: false
        }, async () => {
            const success = await sandboxManager.buildSandboxImage();
            if (success) {
                vscode.window.showInformationMessage('Sandbox environment built successfully!');
            }
        });
    });

    const runInSandboxCommand = vscode.commands.registerCommand('lodeai.runInSandbox', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('Please open an assessment workspace first.');
            return;
        }

        const assessmentPath = workspaceFolders[0].uri.fsPath;

        // Check if this is an assessment directory using .lodeai.json metadata
        const metadataPath = path.join(assessmentPath, '.lodeai.json');
        let assessmentMetadata: any = null;
        let mainFile = 'runner.py'; // default fallback

        if (fs.existsSync(metadataPath)) {
            try {
                const metadataContent = fs.readFileSync(metadataPath, 'utf8');
                assessmentMetadata = JSON.parse(metadataContent);
                mainFile = assessmentMetadata.main_file || 'runner.py';
                Logger.info(`✅ Step 6: Found assessment metadata - Main file: ${mainFile}`);
            } catch (error) {
                Logger.warn('Failed to parse assessment metadata:', error);
            }
        }

        // Check if the main file exists
        const mainFilePath = path.join(assessmentPath, mainFile);
        if (!fs.existsSync(mainFilePath)) {
            vscode.window.showErrorMessage(`This does not appear to be a valid assessment directory. Missing ${mainFile} file.`);
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Running tests in sandbox...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Creating sandbox environment...' });

            const assessmentId = path.basename(assessmentPath);
            const result = await sandboxManager.runTests(assessmentId, {
                assessmentPath,
                timeout: 120, // Reduced from 300 to 120 seconds (2 minutes)
                memoryLimit: '512m',
                cpuLimit: '0.5',
                networkDisabled: true
            });

            progress.report({ increment: 100 });

            // Show results in output channel
            const outputChannel = vscode.window.createOutputChannel('LodeAI Sandbox');
            outputChannel.clear();
            outputChannel.appendLine('=== Assessment Sandbox Execution ===');
            outputChannel.appendLine(`Assessment: ${assessmentId}`);
            outputChannel.appendLine(`Execution Time: ${result.executionTime}ms`);
            outputChannel.appendLine(`Exit Code: ${result.exitCode}`);
            outputChannel.appendLine('');

            if (result.resourceUsage) {
                outputChannel.appendLine(`Memory Used: ${result.resourceUsage.memoryMB.toFixed(2)} MB`);
                outputChannel.appendLine(`CPU Used: ${result.resourceUsage.cpuPercent.toFixed(2)}%`);
                outputChannel.appendLine('');
            }

            outputChannel.appendLine('=== Output ===');
            outputChannel.appendLine(result.output);

            if (result.error) {
                outputChannel.appendLine('');
                outputChannel.appendLine('=== Errors ===');
                outputChannel.appendLine(result.error);
            }

            outputChannel.show();

            if (result.success) {
                vscode.window.showInformationMessage(`✅ Tests passed! Execution time: ${result.executionTime}ms`);
            } else {
                vscode.window.showErrorMessage(`❌ Tests failed. Check output for details.`);
            }
        });
    });

    const cleanupSandboxCommand = vscode.commands.registerCommand('lodeai.cleanupSandboxes', async () => {
        await sandboxManager.cleanupAllSandboxes();
        vscode.window.showInformationMessage('All sandbox containers cleaned up.');
    });

    const sandboxStatusCommand = vscode.commands.registerCommand('lodeai.sandboxStatus', () => {
        const active = sandboxManager.getActiveSandboxes();
        if (active.length === 0) {
            vscode.window.showInformationMessage('No active sandbox containers.');
        } else {
            const statusMsg = `Active sandboxes: ${active.length}\n${active.map(s => `- ${s.assessmentId}`).join('\n')}`;
            vscode.window.showInformationMessage(statusMsg);
        }
    });

    // Log all registered components
    Logger.info('✅ Step 1.3: Webview provider registered');
    Logger.info('✅ Step 1.4: Sandbox manager initialized');
    Logger.info('✅ Step 1.5: All commands registered');
    Logger.info('=== LodeAI Extension Activation Complete ===');
    Logger.info('Extension is ready to use!');

    // Cleanup sandboxes on extension deactivation
    context.subscriptions.push(
        setupAssessmentCommand,
        showSidebarCommand,
        authenticateCommand,
        refreshWebviewCommand,
        buildSandboxCommand,
        runInSandboxCommand,
        cleanupSandboxCommand,
        sandboxStatusCommand,
        webviewView,
        { dispose: () => sandboxManager.cleanupAllSandboxes() }
    );
}

export function deactivate() {}