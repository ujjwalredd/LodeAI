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
exports.Logger = void 0;
const vscode = __importStar(require("vscode"));
class Logger {
    static initialize() {
        if (!Logger.outputChannel) {
            Logger.outputChannel = vscode.window.createOutputChannel('LodeAI');
        }
    }
    static info(message) {
        const timestamp = new Date().toISOString();
        Logger.outputChannel.appendLine(`[INFO ${timestamp}] ${message}`);
        console.log(`[LodeAI INFO] ${message}`);
    }
    static error(message, error) {
        const timestamp = new Date().toISOString();
        const errorMessage = error ? `${message}: ${error}` : message;
        Logger.outputChannel.appendLine(`[ERROR ${timestamp}] ${errorMessage}`);
        console.error(`[LodeAI ERROR] ${message}`, error);
    }
    static warn(message, error) {
        const timestamp = new Date().toISOString();
        const warnMessage = error ? `${message}: ${error}` : message;
        Logger.outputChannel.appendLine(`[WARN ${timestamp}] ${warnMessage}`);
        console.warn(`[LodeAI WARN] ${message}`, error);
    }
    static show() {
        Logger.outputChannel.show();
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map