"use strict";
/**
 * Test EnvironmentSetup Class
 *
 * Run this to test the environment setup functionality independently
 *
 * Usage:
 *   ts-node src/test/test-environment-setup.ts
 */
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
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const environment_setup_1 = require("../utils/environment-setup");
async function testEnvironmentSetup() {
    console.log('='.repeat(60));
    console.log('Testing EnvironmentSetup Class');
    console.log('='.repeat(60));
    console.log();
    // Create a test project path
    const testProjectPath = path.join(os.homedir(), 'lodeai-env-test');
    console.log(`📁 Test Project Path: ${testProjectPath}`);
    console.log();
    // Test 1: Platform Detection
    console.log('Test 1: Platform Detection');
    console.log('-'.repeat(40));
    console.log(`Detected Platform: ${os.platform()}`);
    console.log(`OS Type: ${os.type()}`);
    console.log(`OS Release: ${os.release()}`);
    console.log('✅ Platform detected successfully');
    console.log();
    // Test 2: Environment Setup (if you want to actually test it)
    const shouldRunActualSetup = process.argv.includes('--run-setup');
    if (shouldRunActualSetup) {
        console.log('Test 2: Running Actual Environment Setup');
        console.log('-'.repeat(40));
        console.log('⚠️  This will create a virtual environment and install packages');
        console.log('Press Ctrl+C to cancel...');
        console.log();
        // Wait 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));
        const envSetup = new environment_setup_1.EnvironmentSetup(testProjectPath);
        const result = await envSetup.setupEnvironment();
        console.log();
        console.log('Setup Result:');
        console.log(`  Success: ${result.success}`);
        console.log(`  Message: ${result.message}`);
        if (result.success) {
            console.log('✅ Environment setup completed successfully!');
        }
        else {
            console.log('❌ Environment setup failed');
        }
    }
    else {
        console.log('Test 2: Dry Run (Skipped)');
        console.log('-'.repeat(40));
        console.log('ℹ️  Use --run-setup flag to test actual environment setup');
        console.log('   Example: ts-node src/test/test-environment-setup.ts --run-setup');
        console.log('✅ Dry run completed');
    }
    console.log();
    console.log('='.repeat(60));
    console.log('All Tests Completed');
    console.log('='.repeat(60));
}
// Run tests
testEnvironmentSetup().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
//# sourceMappingURL=test-environment-setup.js.map