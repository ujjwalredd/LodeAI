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
exports.PlannerAgent = void 0;
const vscode = __importStar(require("vscode"));
const logger_1 = require("../utils/logger");
const config_1 = require("../utils/config");
const claude_client_1 = require("../utils/claude-client");
const mcp_service_1 = require("../utils/mcp-service");
const ai_streaming_service_1 = require("../utils/ai-streaming-service");
class PlannerAgent {
    constructor(panel, webviewProvider) {
        this.panel = panel;
        this.webviewProvider = webviewProvider;
        this.useAIPlanning = config_1.Config.getInstance().shouldUseAIPlanning();
        this.agentId = 'planner-agent';
        this.claudeClient = claude_client_1.ClaudeClient.getInstance();
        this.mcpService = mcp_service_1.MCPService.getInstance();
        this.aiStreamingService = ai_streaming_service_1.AIStreamingService.getInstance();
        this.initializeMCP();
        logger_1.Logger.info('Planner agent initialized with Claude, MCP and AI streaming');
    }
    initializeMCP() {
        // Register planner-specific tools with MCP
        this.mcpService.registerTool({
            name: 'assessment_planning',
            description: 'Generate assessment plans and tasks',
            parameters: {
                jobDescription: { type: 'string' },
                resumeText: { type: 'string' },
                assessmentType: { type: 'string', optional: true }
            },
            execute: async (params) => {
                return await this.generateAssessmentPlan(params.jobDescription, params.resumeText, params.assessmentType);
            }
        });
        // Listen for MCP messages
        this.mcpService.on('message:request', (message) => {
            if (message.action === 'generate_plan') {
                this.handleMCPPlanRequest(message);
            }
        });
        logger_1.Logger.info(`Planner agent registered with MCP as: ${this.agentId}`);
    }
    async handleMCPPlanRequest(message) {
        try {
            const { jobDescription, resumeText } = message.payload;
            const plan = await this.createAssessmentPlan(jobDescription, resumeText);
            // Share the plan with other agents via MCP
            this.mcpService.setSharedData('current_assessment_plan', plan);
            this.mcpService.setSharedData('plan_generation_status', 'completed');
            logger_1.Logger.info('Assessment plan shared via MCP');
        }
        catch (error) {
            logger_1.Logger.error('MCP plan request failed:', error);
            this.mcpService.setSharedData('plan_generation_status', 'failed');
        }
    }
    async generateAssessmentPlan(jobDescription, resumeText, assessmentType) {
        // This method can be called by other agents via MCP
        return await this.createAssessmentPlan(jobDescription, resumeText);
    }
    async notify(level, action, taskDescription, progress, additionalContext) {
        try {
            // Generate AI streaming message
            const aiMessage = await this.aiStreamingService.generateStreamingMessage({
                agentType: 'planner',
                action,
                taskDescription,
                progress,
                additionalContext
            });
            if (this.panel) {
                this.panel.webview.postMessage({
                    type: 'agentMessage',
                    payload: {
                        agent: 'Planner',
                        level,
                        content: aiMessage,
                        timestamp: new Date(),
                        progress
                    }
                });
            }
            // Send to webview provider if available
            if (this.webviewProvider && this.webviewProvider._webviewView) {
                this.webviewProvider._webviewView.webview.postMessage({
                    type: 'agentMessage',
                    payload: {
                        agent: 'Planner',
                        level,
                        content: aiMessage,
                        timestamp: new Date(),
                        progress
                    }
                });
            }
            // Also show in status bar for sidebar-only mode
            vscode.window.setStatusBarMessage(`LodeAI Planner: ${aiMessage}`, 3000);
        }
        catch (error) {
            logger_1.Logger.error('Failed to generate AI streaming message:', error);
            // Fallback to simple message
            const fallbackMessage = `Planning: ${action}`;
            this.sendNotification(level, fallbackMessage, progress);
        }
    }
    sendNotification(level, content, progress) {
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'agentMessage',
                payload: {
                    agent: 'Planner',
                    level,
                    content,
                    timestamp: new Date(),
                    progress
                }
            });
        }
        if (this.webviewProvider && this.webviewProvider._webviewView) {
            this.webviewProvider._webviewView.webview.postMessage({
                type: 'agentMessage',
                payload: {
                    agent: 'Planner',
                    level,
                    content,
                    timestamp: new Date(),
                    progress
                }
            });
        }
        vscode.window.setStatusBarMessage(`LodeAI Planner: ${content}`, 3000);
    }
    async createAssessmentPlan(jobDescription, resumeText, preferredLanguage) {
        await this.notify('info', 'analyzing_requirements', 'Analyzing candidate profile and job requirements');
        logger_1.Logger.info(`✅ Step 3: Preferred language received in planner: ${preferredLanguage || 'not specified'}`);
        // DEBUG: Print job description before sending to Claude
        logger_1.Logger.info('='.repeat(80));
        logger_1.Logger.info('📋 JOB DESCRIPTION RECEIVED (before Claude API call):');
        logger_1.Logger.info('='.repeat(80));
        logger_1.Logger.info(jobDescription);
        logger_1.Logger.info('='.repeat(80));
        logger_1.Logger.info(`📊 Job Description Length: ${jobDescription.length} characters`);
        logger_1.Logger.info(`📝 Resume Length: ${resumeText.length} characters`);
        logger_1.Logger.info('='.repeat(80));
        try {
            if (this.useAIPlanning) {
                return await this.createAIPlan(jobDescription, resumeText, preferredLanguage);
            }
            else {
                return await this.createRuleBasedPlan(jobDescription, resumeText);
            }
        }
        catch (error) {
            logger_1.Logger.error('Planning failed', error);
            await this.notify('error', 'planning_failed', undefined, undefined, { error: String(error) });
            return this.createFallbackPlan(jobDescription);
        }
    }
    async createAIPlan(jobDescription, resumeText, preferredLanguage) {
        await this.notify('info', 'generating_assessment_plan', 'Generating personalized assessment using Claude AI analysis');
        // Share job context with other agents via MCP
        this.mcpService.setSharedData('job_description', jobDescription);
        this.mcpService.setSharedData('resume_text', resumeText);
        this.mcpService.setSharedData('preferred_language', preferredLanguage);
        this.mcpService.setSharedData('planning_status', 'in_progress');
        const systemPrompt = `You are an Expert Technical Assessment Architect for Recruiter Evaluation Platform.

CRITICAL: You MUST carefully analyze BOTH the job description AND the candidate's resume to create the perfect assessment.

═══════════════════════════════════════════════════════════════════════
STEP 1: MANDATORY JOB DESCRIPTION ANALYSIS
═══════════════════════════════════════════════════════════════════════

Before creating ANY assessment, you MUST extract and analyze:

A. PRIMARY ROLE TYPE (look for these keywords):
   - "algorithm", "data structures", "leetcode" → leetcode_algorithm
   - "API", "backend", "microservices", "REST" → system_design
   - "frontend", "UI", "React", "Vue", "HTML/CSS" → real_world_project (frontend)
   - "full-stack", "fullstack" → real_world_project
   - "debug", "fix bugs", "troubleshoot" → debugging_fixit
   - "code review", "refactor", "improve code" → code_review
   - "data science", "ML", "machine learning", "analytics" → data_analysis

B. REQUIRED TECHNICAL SKILLS (extract ALL mentioned):
   - Programming languages (Python, JavaScript, Java, Go, C++, etc.)
   - Frameworks (React, Django, Flask, Spring, Express, etc.)
   - Tools (Git, Docker, AWS, databases, etc.)
   - Concepts (OOP, algorithms, design patterns, etc.)

C. SENIORITY LEVEL (look for these indicators):
   - "junior", "entry-level", "0-2 years" → difficulty: "easy"
   - "mid-level", "intermediate", "2-5 years" → difficulty: "mid"
   - "senior", "lead", "5+ years", "architect" → difficulty: "senior"

D. SPECIFIC REQUIREMENTS (look for):
   - Algorithm knowledge? → leetcode_algorithm
   - System design skills? → system_design
   - Frontend skills? → real_world_project (frontend)
   - Data/ML skills? → data_analysis
   - Debugging skills? → debugging_fixit

═══════════════════════════════════════════════════════════════════════
STEP 2: CANDIDATE RESUME ANALYSIS
═══════════════════════════════════════════════════════════════════════

Extract from resume:
- Years of experience
- Known programming languages
- Past projects/technologies used
- Skill level indicators

═══════════════════════════════════════════════════════════════════════
STEP 3: ASSESSMENT TYPE SELECTION LOGIC
═══════════════════════════════════════════════════════════════════════

PRIORITY RULES (apply in order):

1. If JD mentions "algorithm", "data structures", "coding problems", "leetcode":
   → assessment_type = "leetcode_algorithm"

2. If JD mentions "system design", "architecture", "API design", "microservices", "scalability":
   → assessment_type = "system_design"

3. If JD mentions "data science", "machine learning", "ML", "analytics", "pandas", "numpy":
   → assessment_type = "data_analysis"

4. If JD mentions "debugging", "fix bugs", "troubleshoot", "identify issues":
   → assessment_type = "debugging_fixit"

5. If JD mentions "code review", "refactor", "improve code quality":
   → assessment_type = "code_review"

6. If JD mentions "full-stack", "frontend", "UI/UX", "React", "Angular", "Vue":
   → assessment_type = "real_world_project"

7. DEFAULT: If unclear, use "leetcode_algorithm" for backend roles

EXAMPLES:
- "Looking for developer with strong algorithm knowledge" → leetcode_algorithm
- "Backend engineer to build REST APIs" → system_design
- "React developer for frontend" → real_world_project
- "Data scientist for ML models" → data_analysis

═══════════════════════════════════════════════════════════════════════
STEP 4: LANGUAGE SELECTION
═══════════════════════════════════════════════════════════════════════

1. User explicitly selected language? → USE THAT (highest priority)
2. JD specifies language (e.g., "Python developer")? → USE THAT
3. Resume shows primary language? → USE THAT
4. Default based on assessment type

═══════════════════════════════════════════════════════════════════════
CRITICAL REQUIREMENT - TEST CASES MUST BE RUNNABLE CODE
═══════════════════════════════════════════════════════════════════════

ABSOLUTELY NO PLACEHOLDER VARIABLES IN TEST FILES!

Your test_visible.py and .hidden/test_hidden.py MUST:
1. Be valid runnable Python code
2. Use ONLY literal values in assertions (numbers, strings, lists, dicts)
3. NEVER use undefined placeholder variables

CORRECT: assert two_sum([2,7,11,15], 9) == [0,1]
CORRECT: assert process_data("hello") == "HELLO"
WRONG: assert two_sum(...) == expected
WRONG: assert process_data(input_value) == output_value

The tests must PASS when solution is correct and FAIL when solution is wrong!

═══════════════════════════════════════════════════════════════════════
YOUR MISSION
═══════════════════════════════════════════════════════════════════════

1. ANALYZE job description carefully (extract role type, skills, seniority)
2. ANALYZE candidate resume (extract experience, skills)
3. SELECT correct assessment_type based on JD keywords
4. DESIGN assessment that tests the EXACT skills mentioned in JD
5. CREATE comprehensive question covering ALL job requirements

CRITICAL RULES:
1. Create assessments that TEST and EVALUATE candidate abilities for recruiters
2. Design challenges that reveal true technical competency, not just knowledge
3. Include realistic work scenarios that show how candidates solve problems
4. Ensure assessments help recruiters make informed hiring decisions
5. Focus on evaluating skills that matter for the specific job role
6. USE MCP TOOLS: Leverage ai_dataset_search, full_environment_setup, and terminal_execution tools for comprehensive assessments
7. **QUESTION LIMIT: Create EXACTLY 1 question that comprehensively tests ALL required job skills**
8. **SKILL COVERAGE: The single question MUST test multiple skills - ensure all job requirements are covered in this one comprehensive question**
9. **NO IMAGES/ASSETS**: NEVER include image files (png, jpg, svg, gif), icons, or media assets in project_structure. Only generate CODE files (js, py, html, css, etc.). For frontend UI, provide descriptions or placeholders instead of actual images.
10. **FILE CONTENT GENERATION**: You MUST include a "generated_files" object in your response with COMPLETE, READY-TO-USE content for:
    - README.md or QUESTION.md (full problem description LIKE HACKERRANK/LEETCODE - be SPECIFIC with actual function names, parameter types, and REAL example inputs/outputs with numbers/strings, NOT placeholders)
    - solution.py (or appropriate language) with COMPLETE FUNCTION SIGNATURE using REAL parameter names (like 'nums', 'target', 'matrix') NOT generic 'param1', 'param2' - fill in actual types
    - test_visible.py with 2-3 COMPLETE test cases using REAL test data with actual values (like [2,7,11,15], target=9) NOT placeholders like '...' or 'expected' - these are SAMPLE tests candidates can see
    - .hidden/test_hidden.py with 50+ COMPLETE test cases using REAL test data covering edge cases, performance, time/space complexity, stress tests (hidden from candidates - THIS IS THE COMPREHENSIVE TEST SUITE)
    - runner.py that executes both visible and hidden tests
    - Any helper files needed
    ALL file content must be PRODUCTION-READY and COMPLETE - no placeholders!
11. **TEST CASE QUALITY - CRITICAL**: Every test case MUST have:
    - REAL input values (NOT "...", "actual_value", or any placeholders)
    - CALCULATED expected outputs (NOT "expected", "pass", "actual_expected_value" or any variables)
    - Clear test documentation explaining what is being tested
    - Proper assertions with ONLY LITERAL VALUES
    - ✅ CORRECT: assert two_sum([2,7,11,15], 9) == [0,1]
    - ❌ WRONG: assert two_sum(...) == expected
    - ❌ WRONG: assert two_sum(actual_value_1, actual_value_2) == actual_expected_value
    - ❌ WRONG: assert function_name([], 0) == expected_for_empty
    - ✅ CORRECT: assert function_name([], 0) == None
    - The test files MUST be runnable Python code with NO placeholder variables!

12. **COMPREHENSIVE TEST COVERAGE - LIKE HACKERRANK/LEETCODE**:
    Generate 50+ test cases in .hidden/test_hidden.py covering:

    A) CORRECTNESS TESTS (20-25 tests):
       - Basic functionality (3-5 tests)
       - Edge cases: empty input, single element, duplicates
       - Boundary values: min/max integers, array limits
       - Special cases: negatives, zeros, special characters
       - Corner cases specific to the problem

    B) PERFORMANCE TESTS (15-20 tests):
       - Small input (n=10): verify correctness
       - Medium input (n=1000): verify still works
       - Large input (n=10000): test time complexity
       - Very large input (n=100000): test if solution scales
       - Worst case input: specifically designed to test O(n²) vs O(n)

       Example for O(n) requirement:
       import time
       def test_performance_large():
           nums = list(range(100000))
           start = time.time()
           result = solution(nums)
           elapsed = time.time() - start
           assert elapsed < 1.0 for O(n) complexity

    C) SPACE COMPLEXITY TESTS (5-10 tests):
       - Test memory usage doesn't exceed expected complexity
       - Example: O(1) space should not create large arrays
       - Use sys.getsizeof() or monitor object creation

    D) STRESS TESTS (5-10 tests):
       - Random large inputs
       - Repeated operations
       - Maximum constraints from problem

    IMPORTANT: Include timing assertions to fail if complexity is wrong!

ASSESSMENT VARIETY TYPES WITH LANGUAGE SUPPORT:

1. **leetcode_algorithm**: Classic algorithm problems (arrays, strings, trees)
   - Supported Languages: Python, JavaScript, TypeScript, Java, Go, C++
   - Typical Language: Python (default) or language specified in job requirements
   - Testing: Hybrid (visible + hidden tests)

2. **system_design**: Architecture problems (API design, database schema)
   - Supported Languages: Python (FastAPI/Flask), JavaScript/TypeScript (Node/Express), Java (Spring Boot)
   - Typical Language: Python or JavaScript/TypeScript
   - Testing: Hybrid (visible + hidden API/integration tests)

3. **debugging_fixit**: Code with bugs to identify and fix
   - Supported Languages: Python, JavaScript, TypeScript, Java
   - Typical Language: Match the job's primary language
   - Testing: Hybrid (visible + hidden tests for fixes)

4. **code_review**: Poor code to review and improve
   - Supported Languages: Python, JavaScript, TypeScript, Java, Go
   - Typical Language: Match the job's primary language
   - Testing: Manual review (no automated tests)

5. **real_world_project**: Mini-project simulating real work
   - Supported Languages: Python, JavaScript, TypeScript, Java, Go
   - Typical Language: Match the job's full tech stack
   - Testing: Manual review (no automated tests)

6. **data_analysis**: Data processing, ML, visualization (REQUIRES datasets)
   - Supported Languages: Python ONLY (pandas, scikit-learn, matplotlib)
   - Typical Language: Python (required for data science tools)
   - Testing: Hybrid (visible + hidden tests for data quality/model performance)
   - Special: Use MCP ai_dataset_search tool

DATASET INTEGRATION RULES:
- For data science, ML, or analytics roles: ALWAYS set "requires_datasets": true
- Use MCP ai_dataset_search tool to automatically analyze job requirements and find the most appropriate datasets
- AI will recommend specific datasets based on job description, tech stack, and skill requirements
- If real datasets fail, MCP synthetic_data_generation tool will create realistic synthetic data
- Datasets will be downloaded/generated to ./datasets/ folder during environment setup
- Include dataset loading and preprocessing code in assessment tasks
- Test candidate's ability to work with real data (preferred) or realistic synthetic data (fallback)

LEETCODE-STYLE QUESTION GENERATION PROMPT (USE THIS FORMAT):

Create a LeetCode-style coding problem.

Details:
- Topic: [dynamically choose based on job role and difficulty]
- Difficulty: [junior=easy, mid=medium, senior=hard]
- Language: [primary language from tech_stack]
- Function signature: Yes — provide proper function signature
- Constraints: [appropriate for difficulty level]
- Requirements:
  1. Clear problem statement with business context when possible
  2. Input format and Output format specifications
  3. At least 2 sample test cases with detailed explanations
  4. Edge cases included in constraints
  5. Hidden test case description (but don't reveal actual values)
- Output: Provide in a way that can be copy-pasted and executed in VSCode (include function stub + main test code)
- Include hints and optimal solution approach at the end

SAMPLE LEETCODE QUESTION STRUCTURE:
{
    "id": "question_1",
    "title": "Two Sum Problem",
    "type": "algorithm",
    "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target...",
    "difficulty": "easy",
    "input_format": "nums: List[int], target: int",
    "output_format": "List[int] - indices of the two numbers",
    "sample_input": "nums = [2,7,11,15], target = 9",
    "sample_output": "[0,1]",
    "sample_explanation": "Because nums[0] + nums[1] == 9, we return [0, 1].",
    "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
    "function_signature": "def twoSum(nums: List[int], target: int) -> List[int]:",
    "hidden_test_description": "Large input size up to 10^4 elements, negative numbers, no solution case",
    "hints": [
        "Use a hash map to store numbers and their indices",
        "Check if complement (target - current) exists in the map"
    ],
    "optimal_approach": "O(n) time complexity using hash map, O(n) space complexity"
}

DYNAMIC STRUCTURE EXAMPLES:

**Leetcode Algorithm (Backend) - SINGLE QUESTION**
- src/
  - solutions/
    - question_1.py (with function signature and stub)
  - tests/
    - test_solutions.py (with comprehensive test cases)
- problem_statements/
  - question_1.md (detailed problem statement)
- runner.py (main executable with test cases)

**Frontend Assessment Structure Example (React/JavaScript) - SINGLE QUESTION**
- src/
  - components/
    - App.js (main component - CODE ONLY, NO IMAGES)
    - Component1.js
  - styles/
    - App.css (use CSS for styling, not images)
  - tests/
    - App.test.js
- public/
  - index.html (HTML only, use placeholder divs instead of img tags)
- package.json
- README.md

⚠️ IMPORTANT:
1. Generate EXACTLY 1 comprehensive question that tests multiple skills
2. For UI/frontend, use CSS colors/gradients or text placeholders (e.g., "[Image: Logo Here]") instead of actual image files

OUTPUT FORMAT (STRICT JSON):
{
    "assessment_type": "leetcode_algorithm|system_design|debugging_fixit|code_review|real_world_project|data_analysis",
    "difficulty": "junior|mid|senior",
    "tech_stack": ["python", "react", "sql", "docker", "pytest", ...],
    "job_role": "data_scientist|backend|frontend|fullstack|devops|ml_engineer|other",
    "requires_datasets": false,
    "time_estimate_minutes": 120,
    "main_file": "runner.py",
    "test_command": "python runner.py",
    "language": "python|javascript|typescript|java|go|cpp|html|react",
    "requires_testing": true|false,
    "test_strategy": "automated|manual|hybrid",
    "analysis_summary": {
        "role_requirements": ["Key requirements identified from job description"],
        "skills_to_test": ["Primary skills being assessed"],
        "assessment_strategy": "Overall approach and methodology"
    },
    "generated_files": {
        "README.md": "# [Problem Title]\\n\\n## Problem Statement\\n[Full description with clear requirements and expected behavior]\\n\\n## Where to Write Your Code\\nWrite your solution in the solution.py file.\\n\\n## Examples (Sample Test Cases You Can See)\\n### Example 1:\\nInput: [actual input values]\\nOutput: [actual output values]\\nExplanation: [why this output]\\n\\n### Example 2:\\nInput: [actual input values]\\nOutput: [actual output values]\\n\\n## Constraints\\n[All constraints including time/space complexity if applicable]\\n\\n## Function Signature\\nShow the exact function signature from solution.py with parameter types and return type\\n\\n## How to Test\\nRun: python runner.py\\n- This will run both visible tests (which you can see in test_visible.py) and hidden tests (which you cannot see)",
        "solution.py": "#!/usr/bin/env python3\\nfrom typing import List, Optional, Dict, Any\\n\\ndef function_name(param1, param2):\\n    '''\\n    TODO: Implement your solution here\\n    \\n    This is the ONLY file you should edit.\\n    Write your implementation below.\\n    \\n    Args:\\n        param1: Description\\n        param2: Description\\n    \\n    Returns:\\n        Description of return value\\n    '''\\n    pass",
        "test_visible.py": "# TEMPLATE - Replace function_name and write REAL assertions with LITERAL values\\n# DO NOT use variables like 'expected' - use actual numbers, strings, lists\\n# Example: assert two_sum([2,7,11,15], 9) == [0,1]",
        ".hidden/test_hidden.py": "# TEMPLATE - Replace function_name and write REAL assertions with LITERAL values\\n# Include 8-12 tests for edge cases, boundaries, performance\\n# Example: assert two_sum([-1,-2,-3], -5) == [1,2]",
        "runner.py": "#!/usr/bin/env python3\\n# ⚠️ DO NOT EDIT THIS FILE ⚠️\\n# This is the main test runner - editing this file may break the assessment\\n\\nimport pytest\\nimport sys\\nimport os\\n\\nif __name__ == '__main__':\\n    print('=' * 70)\\n    print('ASSESSMENT TEST RUNNER')\\n    print('=' * 70)\\n    \\n    # Run visible tests\\n    print('\\\\n[VISIBLE TESTS] Basic functionality')\\n    print('-' * 70)\\n    visible_result = pytest.main(['test_visible.py', '-v', '--tb=short'])\\n    \\n    # Run hidden tests\\n    print('\\\\n[HIDDEN TESTS] Edge cases, performance & security')\\n    print('-' * 70)\\n    hidden_result = 0\\n    if os.path.exists('.hidden/test_hidden.py'):\\n        hidden_result = pytest.main(['.hidden/test_hidden.py', '-v', '--tb=short'])\\n    \\n    # Summary\\n    print('\\\\n' + '=' * 70)\\n    if visible_result == 0 and hidden_result == 0:\\n        print('✅ ALL TESTS PASSED')\\n    else:\\n        print('❌ SOME TESTS FAILED')\\n        if visible_result != 0:\\n            print('   - Visible tests: FAILED')\\n        if hidden_result != 0:\\n            print('   - Hidden tests: FAILED')\\n    print('=' * 70)\\n    \\n    sys.exit(max(visible_result, hidden_result))"
    },
    "questions": [
        {
            "id": "question_1",
            "title": "Problem Title",
            "type": "algorithm|system_design|debugging|review|project|data_analysis",
            "description": "Detailed problem statement with business context",
            "difficulty": "easy|medium|hard",
            "input_format": "Clear input specification",
            "output_format": "Clear output specification",
            "sample_input": "Example input",
            "sample_output": "Example output",
            "sample_explanation": "Step-by-step explanation",
            "constraints": ["Constraint 1", "Constraint 2"],
            "function_signature": "def solution(params) -> return_type:",
            "hidden_test_description": "Description of hidden test cases",
            "hints": ["Hint 1", "Hint 2"],
            "optimal_approach": "Optimal solution approach explanation",
            "business_context": "Why this problem matters in the actual role",
            "skills_tested": ["skill1", "skill2", "skill3"]
        }
    ]
}

COMPLETE EXAMPLES FOR ALL 6 ASSESSMENT TYPES:

=== 1. LEETCODE_ALGORITHM Example ===
{
    "assessment_type": "leetcode_algorithm",
    "difficulty": "mid",
    "tech_stack": ["python", "pytest"],
    "job_role": "backend",
    "time_estimate_minutes": 90,
    "main_file": "runner.py",
    "test_command": "python runner.py",
    "language": "python",
    "requires_testing": true,
    "test_strategy": "hybrid",
    "generated_files": {
        "README.md": "# Two Sum Problem\\n\\n## Problem Statement\\nGiven an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to target.\\n\\n## Examples (Visible Test Cases)\\n### Example 1:\\nInput: nums = [2,7,11,15], target = 9\\nOutput: [0,1]\\n\\n### Example 2:\\nInput: nums = [3,2,4], target = 6\\nOutput: [1,2]\\n\\n## Constraints\\n- 2 <= nums.length <= 10^4\\n- -10^9 <= nums[i] <= 10^9\\n- Only one valid answer exists\\n\\n## Testing\\n- Run \`python runner.py\` to test your solution\\n- Visible tests: Basic functionality\\n- Hidden tests: Edge cases, performance",
        "solution.py": "#!/usr/bin/env python3\\nfrom typing import List\\n\\ndef two_sum(nums: List[int], target: int) -> List[int]:\\n    \\\"\\\"\\\"\\n    TODO: Implement the two sum algorithm\\n    \\n    Hint: Use a hash map for O(n) time complexity\\n    \\\"\\\"\\\"\\n    pass",
        "test_visible.py": "#!/usr/bin/env python3\\nimport pytest\\nfrom solution import two_sum\\n\\nclass TestVisible:\\n    '''Visible tests - Basic functionality'''\\n    \\n    def test_basic_case(self):\\n        assert two_sum([2, 7, 11, 15], 9) == [0, 1]\\n    \\n    def test_middle_elements(self):\\n        assert two_sum([3, 2, 4], 6) == [1, 2]\\n    \\n    def test_duplicates(self):\\n        assert two_sum([3, 3], 6) == [0, 1]",
        ".hidden/test_hidden.py": "#!/usr/bin/env python3\\n# ⚠️ HIDDEN TEST FILE - 50+ COMPREHENSIVE TESTS ⚠️\\nimport pytest\\nimport sys\\nimport os\\nimport time\\nsys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))\\nfrom solution import two_sum\\n\\nclass TestCorrectness:\\n    '''Correctness tests - 25 tests'''\\n    def test_basic_1(self): assert two_sum([2, 7], 9) == [0, 1]\\n    def test_basic_2(self): assert two_sum([3, 2, 4], 6) == [1, 2]\\n    def test_duplicates(self): assert two_sum([3, 3], 6) == [0, 1]\\n    def test_negative(self): assert two_sum([-1, -2, -3, -4, -5], -8) == [2, 4]\\n    def test_zero_target(self): assert two_sum([-3, 4, 3, 90], 0) == [0, 2]\\n    def test_positive_negative(self): assert two_sum([-1, 0, 1, 2], 1) in [[0, 2], [2, 0]]\\n    def test_large_nums(self): assert two_sum([1000000000, -1000000000, 500000000], 0) == [0, 1]\\n    def test_first_last(self): assert two_sum([1, 2, 3, 4, 5], 6) == [0, 4]\\n    def test_consecutive(self): assert two_sum([1, 2, 3], 3) == [0, 1]\\n    def test_min_array(self): assert two_sum([1, 2], 3) == [0, 1]\\n    def test_zeros(self): assert two_sum([0, 0, 1], 0) == [0, 1]\\n    def test_unsorted(self): assert two_sum([5, 1, 9, 3], 10) in [[0, 3], [3, 0]]\\n    def test_target_zero(self): assert two_sum([-5, 5, 2], 0) == [0, 1]\\n    def test_same_value(self): assert two_sum([5, 5, 5], 10) == [0, 1]\\n    def test_middle(self): assert two_sum([10, 20, 30, 40], 50) == [1, 2]\\n    def test_boundary_1(self): assert two_sum([2147483647, 1], 2147483648) == [0, 1]\\n    def test_boundary_2(self): assert two_sum([-2147483648, 1], -2147483647) == [0, 1]\\n    def test_mixed_range(self): assert two_sum([-100, 0, 100, 50], 50) in [[1, 3], [3, 1]]\\n    def test_large_target(self): assert two_sum([999999, 1], 1000000) == [0, 1]\\n    def test_small_nums(self): assert two_sum([1, 1, 1, 1], 2) == [0, 1]\\n    def test_reverse_order(self): assert two_sum([9, 8, 7, 6], 15) == [0, 2]\\n    def test_triple_check(self): assert two_sum([1, 5, 3, 7], 8) in [[0, 3], [3, 0]]\\n    def test_pattern_1(self): assert two_sum([10, 15, 3, 7], 17) in [[0, 3], [3, 0]]\\n    def test_pattern_2(self): assert two_sum([100, 200, 300], 400) == [0, 2]\\n    def test_edge_sum(self): assert two_sum([0, 4, 3, 0], 0) == [0, 3]\\n\\nclass TestPerformance:\\n    '''Performance tests - 20 tests'''\\n    def test_small_10(self): assert two_sum(list(range(10)) + [5], 9) in [[4, 10], [10, 4]]\\n    def test_medium_100(self): assert two_sum(list(range(100)) + [50], 99) in [[49, 100], [100, 49]]\\n    def test_medium_500(self):\\n        nums = list(range(500)) + [250]\\n        result = two_sum(nums, 499)\\n        assert result in [[249, 500], [500, 249]]\\n    def test_large_1000(self):\\n        nums = list(range(1000)) + [500]\\n        result = two_sum(nums, 999)\\n        assert result in [[499, 1000], [1000, 499]]\\n    def test_large_5000(self):\\n        nums = list(range(5000)) + [2500]\\n        result = two_sum(nums, 4999)\\n        assert result in [[2499, 5000], [5000, 2499]]\\n    def test_large_10000(self):\\n        nums = list(range(10000)) + [5000]\\n        result = two_sum(nums, 9999)\\n        assert result in [[4999, 10000], [10000, 4999]]\\n    def test_time_complexity_10k(self):\\n        '''Test O(n) time - should complete in under 0.1s'''\\n        nums = list(range(10000)) + [5000]\\n        start = time.time()\\n        two_sum(nums, 9999)\\n        elapsed = time.time() - start\\n        assert elapsed < 0.1\\n    def test_time_complexity_50k(self):\\n        '''Test O(n) scaling - 50k elements under 0.5s'''\\n        nums = list(range(50000)) + [25000]\\n        start = time.time()\\n        two_sum(nums, 49999)\\n        elapsed = time.time() - start\\n        assert elapsed < 0.5\\n    def test_time_complexity_100k(self):\\n        '''Test O(n) scaling - 100k elements under 1s'''\\n        nums = list(range(100000)) + [50000]\\n        start = time.time()\\n        two_sum(nums, 99999)\\n        elapsed = time.time() - start\\n        assert elapsed < 1.0\\n    def test_worst_case_end(self):\\n        '''Worst case: answer at end'''\\n        nums = list(range(10000, 0, -1)) + [1, 2]\\n        start = time.time()\\n        two_sum(nums, 3)\\n        elapsed = time.time() - start\\n        assert elapsed < 0.1\\n    def test_worst_case_duplicate(self):\\n        nums = [1] * 5000 + [2, 3]\\n        start = time.time()\\n        two_sum(nums, 5)\\n        elapsed = time.time() - start\\n        assert elapsed < 0.1\\n    def test_random_large(self):\\n        import random\\n        nums = [random.randint(-10000, 10000) for _ in range(10000)]\\n        start = time.time()\\n        two_sum(nums, 0)\\n        elapsed = time.time() - start\\n        assert elapsed < 0.2\\n    def test_repeated_ops(self):\\n        '''Multiple calls should maintain performance'''\\n        nums = list(range(1000))\\n        start = time.time()\\n        for _ in range(100):\\n            two_sum(nums, 500)\\n        elapsed = time.time() - start\\n        assert elapsed < 1.0\\n    def test_dense_duplicates(self):\\n        nums = [5] * 1000 + [2, 3]\\n        result = two_sum(nums, 5)\\n        assert result in [[1000, 1001], [1001, 1000]]\\n    def test_sparse_array(self):\\n        nums = list(range(0, 20000, 2)) + [10001]\\n        result = two_sum(nums, 10003)\\n        assert result is not None\\n    def test_pattern_heavy(self):\\n        nums = [i % 100 for i in range(10000)]\\n        start = time.time()\\n        two_sum(nums, 50)\\n        elapsed = time.time() - start\\n        assert elapsed < 0.15\\n    def test_boundary_performance(self):\\n        nums = [-2147483648] * 1000 + [2147483647, 1]\\n        start = time.time()\\n        two_sum(nums, 2147483648)\\n        elapsed = time.time() - start\\n        assert elapsed < 0.1\\n    def test_negative_heavy(self):\\n        nums = [-i for i in range(10000)] + [5000]\\n        result = two_sum(nums, -5000)\\n        assert result is not None\\n    def test_mixed_performance(self):\\n        nums = [i if i % 2 == 0 else -i for i in range(10000)]\\n        start = time.time()\\n        two_sum(nums, 0)\\n        elapsed = time.time() - start\\n        assert elapsed < 0.15\\n    def test_constant_difference(self):\\n        nums = list(range(0, 10000, 5))\\n        result = two_sum(nums, 9995)\\n        assert result is not None\\n\\nclass TestStress:\\n    '''Stress tests - 5 tests'''\\n    def test_max_constraint(self):\\n        '''Test maximum constraints'''\\n        nums = [2147483647, -2147483648, 0, 1]\\n        result = two_sum(nums, -1)\\n        assert result == [1, 2]\\n    def test_all_negatives(self):\\n        nums = [-i for i in range(1, 1001)]\\n        result = two_sum(nums, -3)\\n        assert result in [[0, 1], [1, 0]]\\n    def test_all_same(self):\\n        nums = [42] * 1000\\n        result = two_sum(nums, 84)\\n        assert result == [0, 1]\\n    def test_extreme_spread(self):\\n        nums = [-1000000000, 0, 1000000000]\\n        result = two_sum(nums, 0)\\n        assert result in [[0, 2], [2, 0]]\\n    def test_sequential_calls(self):\\n        '''Test memory doesn't leak on repeated calls'''\\n        nums = list(range(5000))\\n        for i in range(100):\\n            two_sum(nums, 100 + i)\\n        # If we got here without crashing, memory is OK\\n        assert True",
        "runner.py": "#!/usr/bin/env python3\\n# ⚠️ DO NOT EDIT THIS FILE ⚠️\\nimport pytest\\nimport sys\\nimport os\\n\\nif __name__ == '__main__':\\n    print('=' * 60)\\n    print('TWO SUM - ASSESSMENT TEST RUNNER')\\n    print('=' * 60)\\n    \\n    # Run visible tests\\n    print('\\\\n[VISIBLE TESTS] Basic functionality')\\n    print('-' * 60)\\n    visible_result = pytest.main(['test_visible.py', '-v', '--tb=short'])\\n    \\n    # Run hidden tests if they exist\\n    hidden_result = 0\\n    if os.path.exists('.hidden/test_hidden.py'):\\n        print('\\\\n[HIDDEN TESTS] Edge cases & performance')\\n        print('-' * 60)\\n        hidden_result = pytest.main(['.hidden/test_hidden.py', '-v', '--tb=short'])\\n    \\n    # Summary\\n    print('\\\\n' + '=' * 60)\\n    if visible_result == 0 and hidden_result == 0:\\n        print('✅ ALL TESTS PASSED')\\n    else:\\n        print('❌ SOME TESTS FAILED')\\n    print('=' * 60)\\n    \\n    sys.exit(max(visible_result, hidden_result))"
    },
    "questions": [{"id": "q1", "title": "Two Sum", "type": "algorithm", "description": "Find two numbers that sum to target"}]
}

=== 2. DEBUGGING_FIXIT Example ===
{
    "assessment_type": "debugging_fixit",
    "difficulty": "mid",
    "tech_stack": ["python", "pytest"],
    "job_role": "backend",
    "time_estimate_minutes": 60,
    "main_file": "runner.py",
    "test_command": "python runner.py",
    "language": "python",
    "requires_testing": true,
    "test_strategy": "hybrid",
    "generated_files": {
        "README.md": "# Debug: User Authentication Service\\n\\n## Problem Statement\\nThe user authentication service has several bugs. Your task is to identify and fix all bugs to make the tests pass.\\n\\n## Known Issues\\n1. Password hashing not working correctly\\n2. Token validation fails for valid tokens\\n3. User lookup returns wrong results\\n\\n## Success Criteria\\n- All 8 test cases must pass\\n- Fix bugs without changing test code\\n- Maintain existing function signatures",
        "buggy_auth.py": "#!/usr/bin/env python3\\nimport hashlib\\nimport jwt\\nfrom datetime import datetime, timedelta\\n\\nclass AuthService:\\n    def __init__(self):\\n        self.users = {}\\n        self.secret_key = 'secret123'\\n    \\n    def hash_password(self, password: str) -> str:\\n        # BUG: Missing salt, using wrong encoding\\n        return hashlib.md5(password).hexdigest()\\n    \\n    def create_user(self, username: str, password: str) -> bool:\\n        # BUG: Not checking if user exists\\n        self.users[username] = self.hash_password(password)\\n        return True\\n    \\n    def verify_password(self, username: str, password: str) -> bool:\\n        # BUG: Wrong comparison logic\\n        if username in self.users:\\n            return self.users[username] != self.hash_password(password)\\n        return False\\n    \\n    def generate_token(self, username: str) -> str:\\n        # BUG: Token expiry time is wrong\\n        payload = {\\n            'username': username,\\n            'exp': datetime.utcnow() - timedelta(hours=1)\\n        }\\n        return jwt.encode(payload, self.secret_key, algorithm='HS256')\\n    \\n    # TODO: Fix all bugs above to make tests pass",
        "test_visible.py": "#!/usr/bin/env python3\\nimport pytest\\nfrom buggy_auth import AuthService\\n\\nclass TestVisible:\\n    '''Visible tests - Basic functionality'''\\n    \\n    def test_create_user(self):\\n        auth = AuthService()\\n        assert auth.create_user('alice', 'password123') == True\\n    \\n    def test_password_verification(self):\\n        auth = AuthService()\\n        auth.create_user('bob', 'secret')\\n        assert auth.verify_password('bob', 'secret') == True",
        ".hidden/test_hidden.py": "#!/usr/bin/env python3\\n# ⚠️ HIDDEN TEST FILE ⚠️\\nimport pytest\\nimport sys\\nimport os\\nsys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))\\nfrom buggy_auth import AuthService\\nimport time\\n\\nclass TestHidden:\\n    '''Hidden tests - Edge cases and security'''\\n    \\n    def test_duplicate_user_rejected(self):\\n        auth = AuthService()\\n        auth.create_user('alice', 'pass1')\\n        assert auth.create_user('alice', 'pass2') == False\\n    \\n    def test_wrong_password_rejected(self):\\n        auth = AuthService()\\n        auth.create_user('bob', 'secret')\\n        assert auth.verify_password('bob', 'wrong') == False\\n    \\n    def test_nonexistent_user(self):\\n        auth = AuthService()\\n        assert auth.verify_password('nobody', 'pass') == False\\n    \\n    def test_token_generation(self):\\n        auth = AuthService()\\n        token = auth.generate_token('alice')\\n        assert token is not None\\n        assert len(token) > 0\\n    \\n    def test_token_not_expired(self):\\n        auth = AuthService()\\n        auth.create_user('alice', 'pass')\\n        token = auth.generate_token('alice')\\n        # Token should be valid for at least 1 second\\n        time.sleep(0.1)\\n        # Verify token can be decoded\\n        import jwt\\n        payload = jwt.decode(token, auth.secret_key, algorithms=['HS256'])\\n        assert payload['username'] == 'alice'\\n    \\n    def test_password_hashing_consistent(self):\\n        auth = AuthService()\\n        # Same password should hash to same value\\n        hash1 = auth.hash_password('test123')\\n        hash2 = auth.hash_password('test123')\\n        assert hash1 == hash2",
        "runner.py": "#!/usr/bin/env python3\\nimport pytest\\nimport sys\\nimport os\\n\\nif __name__ == '__main__':\\n    print('=' * 60)\\n    print('AUTH SERVICE DEBUG - ASSESSMENT TEST RUNNER')\\n    print('=' * 60)\\n    \\n    # Run visible tests\\n    print('\\n[VISIBLE TESTS] Basic functionality')\\n    print('-' * 60)\\n    visible_result = pytest.main(['test_visible.py', '-v', '--tb=short'])\\n    \\n    # Run hidden tests if they exist\\n    hidden_result = 0\\n    if os.path.exists('.hidden/test_hidden.py'):\\n        print('\\n[HIDDEN TESTS] Edge cases & security')\\n        print('-' * 60)\\n        hidden_result = pytest.main(['.hidden/test_hidden.py', '-v', '--tb=short'])\\n    \\n    # Summary\\n    print('\\n' + '=' * 60)\\n    if visible_result == 0 and hidden_result == 0:\\n        print('✅ ALL TESTS PASSED')\\n    else:\\n        print('❌ SOME TESTS FAILED')\\n    print('=' * 60)\\n    \\n    sys.exit(max(visible_result, hidden_result))"
    },
    "questions": [{"id": "q1", "title": "Fix Authentication Bugs", "type": "debugging", "description": "Debug and fix authentication service"}]
}

=== 3. SYSTEM_DESIGN Example ===
{
    "assessment_type": "system_design",
    "difficulty": "senior",
    "tech_stack": ["python", "fastapi", "postgresql", "redis", "pytest"],
    "job_role": "backend",
    "time_estimate_minutes": 120,
    "main_file": "runner.py",
    "test_command": "python runner.py",
    "language": "python",
    "requires_testing": true,
    "test_strategy": "hybrid",
    "generated_files": {
        "README.md": "# Design: URL Shortener Service\\n\\n## Requirements\\nDesign and implement a URL shortening service like bit.ly\\n\\n## Features Required\\n1. Shorten long URLs to unique short codes\\n2. Redirect short codes to original URLs\\n3. Track click analytics\\n4. Handle 1M+ URLs\\n5. Sub-100ms response time\\n\\n## Components to Design\\n- API endpoints (POST /shorten, GET /:code)\\n- Database schema\\n- Caching strategy\\n- Short code generation algorithm\\n\\n## Deliverables\\n1. API implementation (api.py)\\n2. Database models (models.py)\\n3. Short code generator (shortener.py)\\n4. Redis caching layer (cache.py)\\n5. Tests",
        "api.py": "#!/usr/bin/env python3\\nfrom fastapi import FastAPI, HTTPException\\nfrom pydantic import BaseModel, HttpUrl\\n\\napp = FastAPI()\\n\\nclass URLRequest(BaseModel):\\n    url: HttpUrl\\n\\nclass URLResponse(BaseModel):\\n    short_code: str\\n    short_url: str\\n\\n@app.post('/shorten', response_model=URLResponse)\\nasync def shorten_url(request: URLRequest):\\n    \\\"\\\"\\\"\\n    TODO: Implement URL shortening\\n    1. Generate unique short code\\n    2. Store URL mapping in database\\n    3. Cache in Redis\\n    4. Return short URL\\n    \\\"\\\"\\\"\\n    pass\\n\\n@app.get('/{short_code}')\\nasync def redirect_url(short_code: str):\\n    \\\"\\\"\\\"\\n    TODO: Implement redirect\\n    1. Check Redis cache\\n    2. If not cached, query database\\n    3. Update cache\\n    4. Track analytics\\n    5. Return redirect response\\n    \\\"\\\"\\\"\\n    pass",
        "models.py": "#!/usr/bin/env python3\\nfrom sqlalchemy import Column, String, Integer, DateTime, create_engine\\nfrom sqlalchemy.ext.declarative import declarative_base\\nfrom datetime import datetime\\n\\nBase = declarative_base()\\n\\nclass URLMapping(Base):\\n    __tablename__ = 'url_mappings'\\n    \\n    # TODO: Design database schema\\n    # Fields to consider:\\n    # - id (primary key)\\n    # - short_code (unique, indexed)\\n    # - original_url\\n    # - created_at\\n    # - expires_at\\n    # - click_count\\n    pass",
        "shortener.py": "#!/usr/bin/env python3\\nimport hashlib\\nimport base64\\n\\ndef generate_short_code(url: str, length: int = 7) -> str:\\n    \\\"\\\"\\\"\\n    TODO: Implement short code generation\\n    \\n    Requirements:\\n    - Must be unique\\n    - Length: 6-8 characters\\n    - URL-safe characters only\\n    - Collision handling\\n    \\n    Approaches to consider:\\n    - Hash-based (MD5/SHA256 + base62)\\n    - Counter-based with base62 encoding\\n    - Random generation with collision check\\n    \\\"\\\"\\\"\\n    pass",
        "test_visible.py": "#!/usr/bin/env python3\\nimport pytest\\nfrom fastapi.testclient import TestClient\\nfrom api import app\\n\\nclient = TestClient(app)\\n\\nclass TestVisible:\\n    '''Visible tests - Basic API functionality'''\\n    \\n    def test_shorten_url(self):\\n        response = client.post('/shorten', json={'url': 'https://example.com/very/long/url'})\\n        assert response.status_code == 200\\n        data = response.json()\\n        assert 'short_code' in data\\n        assert len(data['short_code']) <= 8\\n    \\n    def test_redirect(self):\\n        # First shorten a URL\\n        response = client.post('/shorten', json={'url': 'https://example.com'})\\n        short_code = response.json()['short_code']\\n        \\n        # Then test redirect\\n        redirect_response = client.get(f'/{short_code}', follow_redirects=False)\\n        assert redirect_response.status_code == 307",
        ".hidden/test_hidden.py": "#!/usr/bin/env python3\\n# ⚠️ HIDDEN TEST FILE ⚠️\\nimport pytest\\nimport sys\\nimport os\\nsys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))\\nfrom fastapi.testclient import TestClient\\nfrom api import app\\nimport time\\nimport redis\\n\\nclient = TestClient(app)\\n\\nclass TestHidden:\\n    '''Hidden tests - Edge cases, caching, performance'''\\n    \\n    def test_duplicate_url_same_code(self):\\n        '''Same URL should return same short code'''\\n        url = 'https://example.com/test-page'\\n        response1 = client.post('/shorten', json={'url': url})\\n        response2 = client.post('/shorten', json={'url': url})\\n        assert response1.json()['short_code'] == response2.json()['short_code']\\n    \\n    def test_invalid_short_code(self):\\n        '''Non-existent short code should return 404'''\\n        response = client.get('/INVALID')\\n        assert response.status_code == 404\\n    \\n    def test_redis_caching(self):\\n        '''Redirects should be cached in Redis'''\\n        # Shorten URL\\n        response = client.post('/shorten', json={'url': 'https://example.com/cached'})\\n        short_code = response.json()['short_code']\\n        \\n        # First redirect (cache miss)\\n        start = time.time()\\n        client.get(f'/{short_code}')\\n        first_time = time.time() - start\\n        \\n        # Second redirect (cache hit, should be faster)\\n        start = time.time()\\n        client.get(f'/{short_code}')\\n        second_time = time.time() - start\\n        \\n        assert second_time < first_time\\n    \\n    def test_analytics_tracking(self):\\n        '''Click counts should be tracked'''\\n        response = client.post('/shorten', json={'url': 'https://example.com/track'})\\n        short_code = response.json()['short_code']\\n        \\n        # Make 3 requests\\n        for _ in range(3):\\n            client.get(f'/{short_code}')\\n        \\n        # Check analytics\\n        analytics = client.get(f'/analytics/{short_code}')\\n        assert analytics.json()['clicks'] == 3\\n    \\n    def test_unique_code_generation(self):\\n        '''Different URLs should get different codes'''\\n        urls = [f'https://example.com/page{i}' for i in range(10)]\\n        codes = set()\\n        for url in urls:\\n            response = client.post('/shorten', json={'url': url})\\n            codes.add(response.json()['short_code'])\\n        assert len(codes) == 10\\n    \\n    def test_performance_1000_urls(self):\\n        '''Should handle 1000 URLs quickly'''\\n        start = time.time()\\n        for i in range(1000):\\n            client.post('/shorten', json={'url': f'https://example.com/perf{i}'})\\n        duration = time.time() - start\\n        assert duration < 10  # Should complete in under 10 seconds",
        "runner.py": "#!/usr/bin/env python3\\nimport pytest\\nimport sys\\nimport os\\n\\nif __name__ == '__main__':\\n    print('=' * 60)\\n    print('URL SHORTENER - ASSESSMENT TEST RUNNER')\\n    print('=' * 60)\\n    \\n    # Run visible tests\\n    print('\\n[VISIBLE TESTS] Basic API functionality')\\n    print('-' * 60)\\n    visible_result = pytest.main(['test_visible.py', '-v', '--tb=short'])\\n    \\n    # Run hidden tests if they exist\\n    hidden_result = 0\\n    if os.path.exists('.hidden/test_hidden.py'):\\n        print('\\n[HIDDEN TESTS] Edge cases, caching & performance')\\n        print('-' * 60)\\n        hidden_result = pytest.main(['.hidden/test_hidden.py', '-v', '--tb=short'])\\n    \\n    # Summary\\n    print('\\n' + '=' * 60)\\n    if visible_result == 0 and hidden_result == 0:\\n        print('✅ ALL TESTS PASSED')\\n    else:\\n        print('❌ SOME TESTS FAILED')\\n    print('=' * 60)\\n    \\n    sys.exit(max(visible_result, hidden_result))"
    },
    "questions": [{"id": "q1", "title": "URL Shortener System", "type": "system_design", "description": "Design scalable URL shortener"}]
}

=== 4. CODE_REVIEW Example ===
{
    "assessment_type": "code_review",
    "difficulty": "mid",
    "tech_stack": ["python"],
    "job_role": "backend",
    "time_estimate_minutes": 60,
    "main_file": "issues.md",
    "test_command": "manual_review",
    "language": "python",
    "requires_testing": false,
    "test_strategy": "manual",
    "generated_files": {
        "README.md": "# Code Review: E-commerce Cart Service\\n\\n## Task\\nReview the shopping cart implementation and provide improvements.\\n\\n## Review Criteria\\n1. **Code Quality**: Identify code smells, anti-patterns\\n2. **Performance**: Find inefficiencies, suggest optimizations\\n3. **Security**: Spot vulnerabilities\\n4. **Best Practices**: Suggest improvements\\n\\n## Deliverables\\n1. List of issues found (issues.md)\\n2. Refactored code (cart_improved.py)\\n3. Explanation of changes (improvements.md)",
        "cart_original.py": "#!/usr/bin/env python3\\n# Poor code that needs review\\n\\nclass ShoppingCart:\\n    def __init__(self):\\n        self.items = []\\n    \\n    def add_item(self, item, price, quantity):\\n        # Issues: No validation, mutable state, no types\\n        self.items.append({'item': item, 'price': price, 'qty': quantity})\\n    \\n    def get_total(self):\\n        # Issue: Inefficient calculation, no error handling\\n        total = 0\\n        for i in range(len(self.items)):\\n            total = total + self.items[i]['price'] * self.items[i]['qty']\\n        return total\\n    \\n    def apply_discount(self, code):\\n        # Issues: SQL injection risk, hardcoded discounts, no validation\\n        import sqlite3\\n        conn = sqlite3.connect('discounts.db')\\n        cursor = conn.cursor()\\n        cursor.execute(f\\\"SELECT discount FROM codes WHERE code = '{code}'\\\")\\n        result = cursor.fetchone()\\n        if result:\\n            self.discount = result[0]\\n    \\n    def checkout(self, card_number, cvv):\\n        # Issues: Storing sensitive data, no encryption, poor error handling\\n        self.card = card_number\\n        self.cvv = cvv\\n        if self.get_total() > 0:\\n            return True\\n        return False",
        "issues.md": "# TODO: Document all issues you find\\n\\n## Critical Issues\\n1. [Your findings here]\\n\\n## Security Issues\\n1. [Your findings here]\\n\\n## Performance Issues\\n1. [Your findings here]\\n\\n## Code Quality Issues\\n1. [Your findings here]",
        "cart_improved.py": "#!/usr/bin/env python3\\n\\\"\\\"\\\"\\nTODO: Refactor the cart_original.py code\\n\\nFix all issues and implement:\\n- Proper type hints\\n- Input validation\\n- Security improvements (SQL injection, sensitive data)\\n- Better error handling\\n- More efficient algorithms\\n- Follow SOLID principles\\n\\\"\\\"\\\"\\n\\nfrom typing import List, Dict, Optional\\nfrom dataclasses import dataclass\\nfrom decimal import Decimal\\n\\n@dataclass\\nclass CartItem:\\n    # TODO: Define proper structure\\n    pass\\n\\nclass ImprovedShoppingCart:\\n    # TODO: Implement improved version\\n    pass",
        "test_cart.py": "#!/usr/bin/env python3\\nimport pytest\\nfrom cart_improved import ImprovedShoppingCart, CartItem\\n\\nclass TestImprovedCart:\\n    def test_add_valid_item(self):\\n        cart = ImprovedShoppingCart()\\n        # TODO: Test adding valid items\\n        pass\\n    \\n    def test_security_sql_injection(self):\\n        cart = ImprovedShoppingCart()\\n        # TODO: Test SQL injection is prevented\\n        pass"
    },
    "questions": [{"id": "q1", "title": "Review Cart Code", "type": "code_review", "description": "Review and improve shopping cart"}]
}

=== 5. REAL_WORLD_PROJECT Example ===
{
    "assessment_type": "real_world_project",
    "difficulty": "senior",
    "tech_stack": ["python", "fastapi", "postgresql", "docker"],
    "job_role": "fullstack",
    "time_estimate_minutes": 180,
    "main_file": "main.py",
    "test_command": "manual_review",
    "language": "python",
    "requires_testing": false,
    "test_strategy": "manual",
    "generated_files": {
        "README.md": "# Build: Task Management API\\n\\n## Project Overview\\nBuild a RESTful API for a task management system (like Trello/Asana)\\n\\n## Requirements\\n### Must Have\\n1. User authentication (JWT)\\n2. CRUD operations for tasks\\n3. Task assignment to users\\n4. Filter/search tasks\\n5. PostgreSQL database\\n6. Docker deployment\\n\\n### API Endpoints\\n- POST /auth/register\\n- POST /auth/login\\n- GET /tasks\\n- POST /tasks\\n- PUT /tasks/:id\\n- DELETE /tasks/:id\\n- POST /tasks/:id/assign\\n\\n### Evaluation Criteria\\n- Working API (50%)\\n- Database design (20%)\\n- Code quality (15%)\\n- Docker setup (15%)",
        "main.py": "#!/usr/bin/env python3\\nfrom fastapi import FastAPI, Depends, HTTPException\\nfrom sqlalchemy.orm import Session\\n\\napp = FastAPI(title=\\\"Task Management API\\\")\\n\\n# TODO: Implement authentication\\n# TODO: Implement task CRUD endpoints\\n# TODO: Implement user management\\n# TODO: Add input validation\\n# TODO: Add error handling\\n\\n@app.get('/')\\ndef root():\\n    return {'message': 'Task Management API'}\\n\\n# TODO: Add your endpoints here",
        "models.py": "#!/usr/bin/env python3\\nfrom sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum\\nfrom sqlalchemy.ext.declarative import declarative_base\\nfrom sqlalchemy.orm import relationship\\nfrom datetime import datetime\\nimport enum\\n\\nBase = declarative_base()\\n\\n# TODO: Design your database models\\n# Models needed:\\n# - User (id, email, password_hash, created_at)\\n# - Task (id, title, description, status, priority, due_date, assigned_to, created_by)\\n# - Consider relationships and indexes",
        "auth.py": "#!/usr/bin/env python3\\nfrom datetime import datetime, timedelta\\nfrom jose import JWTError, jwt\\nfrom passlib.context import CryptContext\\n\\npwd_context = CryptContext(schemes=[\\\"bcrypt\\\"], deprecated=\\\"auto\\\")\\nSECRET_KEY = \\\"your-secret-key-here\\\"\\nALGORITHM = \\\"HS256\\\"\\n\\n# TODO: Implement authentication functions\\n# - hash_password()\\n# - verify_password()\\n# - create_access_token()\\n# - verify_token()",
        "Dockerfile": "FROM python:3.11-slim\\n\\nWORKDIR /app\\n\\n# TODO: Complete Dockerfile\\n# - Copy requirements\\n# - Install dependencies\\n# - Copy application code\\n# - Expose port\\n# - Run application\\n\\nCOPY requirements.txt .\\nRUN pip install -r requirements.txt\\n\\nCOPY . .\\n\\nEXPOSE 8000\\n\\nCMD [\\\"uvicorn\\\", \\\"main:app\\\", \\\"--host\\\", \\\"0.0.0.0\\\", \\\"--port\\\", \\\"8000\\\"]",
        "docker-compose.yml": "version: '3.8'\\n\\nservices:\\n  db:\\n    image: postgres:15-alpine\\n    environment:\\n      POSTGRES_USER: taskuser\\n      POSTGRES_PASSWORD: taskpass\\n      POSTGRES_DB: taskdb\\n    ports:\\n      - \\\"5432:5432\\\"\\n  \\n  api:\\n    build: .\\n    ports:\\n      - \\\"8000:8000\\\"\\n    environment:\\n      DATABASE_URL: postgresql://taskuser:taskpass@db:5432/taskdb\\n    depends_on:\\n      - db",
        "test_api.py": "#!/usr/bin/env python3\\nimport pytest\\nfrom fastapi.testclient import TestClient\\nfrom main import app\\n\\nclient = TestClient(app)\\n\\nclass TestTaskAPI:\\n    def test_create_task(self):\\n        # TODO: Test task creation\\n        pass\\n    \\n    def test_get_tasks(self):\\n        # TODO: Test getting tasks\\n        pass\\n    \\n    def test_authentication(self):\\n        # TODO: Test auth flow\\n        pass"
    },
    "questions": [{"id": "q1", "title": "Task Management System", "type": "project", "description": "Build complete task API"}]
}

=== 6. DATA_ANALYSIS Example ===
{
    "assessment_type": "data_analysis",
    "difficulty": "mid",
    "tech_stack": ["python", "pandas", "scikit-learn", "matplotlib", "pytest"],
    "job_role": "data_scientist",
    "time_estimate_minutes": 120,
    "requires_datasets": true,
    "main_file": "runner.py",
    "test_command": "python runner.py",
    "language": "python",
    "requires_testing": true,
    "test_strategy": "hybrid",
    "generated_files": {
        "README.md": "# Data Analysis: Customer Churn Prediction\\n\\n## Problem Statement\\nAnalyze customer data to predict churn and provide business insights.\\n\\n## Dataset\\n- customer_data.csv (10,000 customers)\\n- Features: demographics, usage patterns, billing\\n- Target: churned (0/1)\\n\\n## Tasks\\n1. **EDA**: Explore data, find patterns\\n2. **Preprocessing**: Handle missing values, encode features\\n3. **Model**: Build churn prediction model (accuracy > 80%)\\n4. **Insights**: Business recommendations\\n\\n## Deliverables\\n1. analysis.ipynb (Jupyter notebook)\\n2. model.pkl (trained model)\\n3. insights.md (business recommendations)",
        "analysis.py": "#!/usr/bin/env python3\\nimport pandas as pd\\nimport numpy as np\\nfrom sklearn.model_selection import train_test_split\\nfrom sklearn.ensemble import RandomForestClassifier\\nfrom sklearn.metrics import accuracy_score, classification_report\\nimport matplotlib.pyplot as plt\\nimport seaborn as sns\\n\\n# TODO: Load and explore data\\ndef load_data():\\n    \\\"\\\"\\\"Load customer data\\\"\\\"\\\"\\n    df = pd.read_csv('data/customer_data.csv')\\n    return df\\n\\n# TODO: Perform EDA\\ndef exploratory_analysis(df):\\n    \\\"\\\"\\\"\\n    Perform exploratory data analysis\\n    - Check data types and missing values\\n    - Visualize distributions\\n    - Correlation analysis\\n    - Identify patterns\\n    \\\"\\\"\\\"\\n    pass\\n\\n# TODO: Preprocess data\\ndef preprocess_data(df):\\n    \\\"\\\"\\\"\\n    Preprocess features\\n    - Handle missing values\\n    - Encode categorical variables\\n    - Feature scaling\\n    - Feature engineering\\n    \\\"\\\"\\\"\\n    pass\\n\\n# TODO: Build model\\ndef build_model(X_train, y_train):\\n    \\\"\\\"\\\"\\n    Train churn prediction model\\n    - Try different algorithms\\n    - Tune hyperparameters\\n    - Evaluate performance\\n    \\\"\\\"\\\"\\n    pass\\n\\n# TODO: Generate insights\\ndef analyze_churn_factors(df, model):\\n    \\\"\\\"\\\"\\n    Analyze what drives churn\\n    - Feature importance\\n    - Customer segments\\n    - Actionable insights\\n    \\\"\\\"\\\"\\n    pass\\n\\nif __name__ == '__main__':\\n    # TODO: Complete analysis pipeline\\n    df = load_data()\\n    exploratory_analysis(df)\\n    X, y = preprocess_data(df)\\n    model = build_model(X, y)\\n    analyze_churn_factors(df, model)",
        "insights.md": "# TODO: Document Your Findings\\n\\n## Executive Summary\\n[Your high-level findings]\\n\\n## Key Insights\\n1. [Insight 1]\\n2. [Insight 2]\\n3. [Insight 3]\\n\\n## Churn Drivers\\n- [Factor 1 and its impact]\\n- [Factor 2 and its impact]\\n\\n## Recommendations\\n1. [Actionable recommendation]\\n2. [Actionable recommendation]\\n\\n## Model Performance\\n- Accuracy: [X]%\\n- Precision: [X]%\\n- Recall: [X]%",
        "test_visible.py": "#!/usr/bin/env python3\\nimport pytest\\nimport pandas as pd\\nfrom analysis import load_data, preprocess_data, build_model\\n\\nclass TestVisible:\\n    '''Visible tests - Basic data pipeline'''\\n    \\n    def test_data_loading(self):\\n        df = load_data()\\n        assert df is not None\\n        assert len(df) > 0\\n        assert 'churned' in df.columns\\n    \\n    def test_preprocessing(self):\\n        df = load_data()\\n        X, y = preprocess_data(df)\\n        assert X.shape[0] == y.shape[0]\\n        assert not X.isnull().any().any()",
        ".hidden/test_hidden.py": "#!/usr/bin/env python3\\n# ⚠️ HIDDEN TEST FILE ⚠️\\nimport pytest\\nimport sys\\nimport os\\nsys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))\\nimport pandas as pd\\nimport numpy as np\\nfrom analysis import load_data, preprocess_data, build_model, analyze_churn_factors\\nfrom sklearn.model_selection import train_test_split\\nimport pickle\\n\\nclass TestHidden:\\n    '''Hidden tests - Model quality, insights, edge cases'''\\n    \\n    def test_model_accuracy_requirement(self):\\n        '''Model must achieve >80% accuracy'''\\n        df = load_data()\\n        X, y = preprocess_data(df)\\n        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\\n        model = build_model(X_train, y_train)\\n        accuracy = model.score(X_test, y_test)\\n        assert accuracy > 0.80\\n    \\n    def test_no_data_leakage(self):\\n        '''Preprocessing should not leak test data'''\\n        df = load_data()\\n        X, y = preprocess_data(df)\\n        # Check that preprocessing can be applied to new data\\n        # without access to full dataset statistics\\n        assert hasattr(preprocess_data, '__doc__')\\n    \\n    def test_missing_value_handling(self):\\n        '''Should handle missing values correctly'''\\n        df = load_data()\\n        X, y = preprocess_data(df)\\n        assert not X.isnull().any().any()\\n        assert not y.isnull().any()\\n    \\n    def test_feature_engineering_quality(self):\\n        '''Should create meaningful features'''\\n        df = load_data()\\n        X, y = preprocess_data(df)\\n        # Should have more features than raw data (feature engineering)\\n        assert X.shape[1] >= len(df.columns) - 1\\n    \\n    def test_model_saved(self):\\n        '''Model should be saved as model.pkl'''\\n        assert os.path.exists('model.pkl')\\n        with open('model.pkl', 'rb') as f:\\n            model = pickle.load(f)\\n            assert hasattr(model, 'predict')\\n    \\n    def test_insights_documented(self):\\n        '''Insights document must be completed'''\\n        assert os.path.exists('insights.md')\\n        with open('insights.md', 'r') as f:\\n            content = f.read()\\n            # Should not contain TODO markers\\n            assert '[Your' not in content or '[X]' not in content\\n            # Should have substantial content\\n            assert len(content) > 500\\n    \\n    def test_churn_factor_analysis(self):\\n        '''Should identify key churn factors'''\\n        df = load_data()\\n        X, y = preprocess_data(df)\\n        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)\\n        model = build_model(X_train, y_train)\\n        factors = analyze_churn_factors(df, model)\\n        assert factors is not None\\n        assert len(factors) > 0",
        "runner.py": "#!/usr/bin/env python3\\nimport pytest\\nimport sys\\nimport os\\n\\nif __name__ == '__main__':\\n    print('=' * 60)\\n    print('CUSTOMER CHURN ANALYSIS - ASSESSMENT TEST RUNNER')\\n    print('=' * 60)\\n    \\n    # Run visible tests\\n    print('\\n[VISIBLE TESTS] Basic data pipeline')\\n    print('-' * 60)\\n    visible_result = pytest.main(['test_visible.py', '-v', '--tb=short'])\\n    \\n    # Run hidden tests if they exist\\n    hidden_result = 0\\n    if os.path.exists('.hidden/test_hidden.py'):\\n        print('\\n[HIDDEN TESTS] Model quality & insights')\\n        print('-' * 60)\\n        hidden_result = pytest.main(['.hidden/test_hidden.py', '-v', '--tb=short'])\\n    \\n    # Summary\\n    print('\\n' + '=' * 60)\\n    if visible_result == 0 and hidden_result == 0:\\n        print('✅ ALL TESTS PASSED')\\n    else:\\n        print('❌ SOME TESTS FAILED')\\n    print('=' * 60)\\n    \\n    sys.exit(max(visible_result, hidden_result))"
    },
    "questions": [{"id": "q1", "title": "Customer Churn Analysis", "type": "data_analysis", "description": "Predict and analyze customer churn"}]
}

RESPONSE FORMAT RULES:
- Return ONLY valid JSON
- Include "generated_files" with COMPLETE file content
- Use \\n for newlines in file content strings
- All code must be syntactically correct and runnable
- NO placeholders - every file must be production-ready

CRITICAL TEST CASE GENERATION RULES:
For assessments with "requires_testing": true and "test_strategy": "hybrid":

1. VISIBLE TESTS - Language Specific Names:
   - Python: test_visible.py
   - JavaScript/Node: test.visible.js
   - TypeScript: test.visible.ts
   - Java: TestVisible.java
   - C++: test_visible.cpp
   - Go: visible_test.go

   Generate 2-3 COMPLETE test cases with REAL test data:
   - These should test basic functionality only
   - Use simple, straightforward inputs
   - Candidates will see these tests
   - Example: test_basic_case(), test_simple_input()

2. HIDDEN TESTS - Language Specific Names:
   - Python: .hidden/test_hidden.py
   - JavaScript/Node: .hidden/test.hidden.js
   - TypeScript: .hidden/test.hidden.ts
   - Java: .hidden/TestHidden.java
   - C++: .hidden/test_hidden.cpp
   - Go: .hidden/hidden_test.go

   Generate 8-12 COMPLETE test cases with REAL test data:
   - Cover ALL edge cases, boundary conditions, performance requirements
   - Include:
     * Edge cases (empty input, single element, maximum size)
     * Boundary conditions (min/max values, off-by-one)
     * Invalid input handling (negative numbers, None, wrong types)
     * Performance tests (large inputs, time complexity verification)
     * Security tests (injection attempts, data leakage)
     * Special cases specific to the problem domain
   - Use CONCRETE values, NOT placeholders like "..." or "expected"
   - Every assertion must have actual expected values calculated

3. TEST RUNNER - Language Specific:

   PYTHON (runner.py):
   #!/usr/bin/env python3
   import pytest
   import sys
   import os

   if __name__ == '__main__':
       print('=' * 60)
       print('ASSESSMENT TEST RUNNER')
       print('=' * 60)

       print('\\n[VISIBLE TESTS] Basic functionality')
       print('-' * 60)
       visible_result = pytest.main(['test_visible.py', '-v', '--tb=short'])

       hidden_result = 0
       if os.path.exists('.hidden/test_hidden.py'):
           print('\\n[HIDDEN TESTS] Edge cases & performance')
           print('-' * 60)
           hidden_result = pytest.main(['.hidden/test_hidden.py', '-v', '--tb=short'])

       print('\\n' + '=' * 60)
       if visible_result == 0 and hidden_result == 0:
           print('✅ ALL TESTS PASSED')
       else:
           print('❌ SOME TESTS FAILED')
       print('=' * 60)

       sys.exit(max(visible_result, hidden_result))

   JAVASCRIPT/NODE (runner.js):
   const { execSync } = require('child_process');
   const fs = require('fs');

   console.log('='.repeat(60));
   console.log('ASSESSMENT TEST RUNNER');
   console.log('='.repeat(60));

   let visibleResult = 0;
   let hiddenResult = 0;

   try {
       console.log('\\n[VISIBLE TESTS] Basic functionality');
       console.log('-'.repeat(60));
       execSync('npm test -- test.visible.js', { stdio: 'inherit' });
   } catch (e) {
       visibleResult = 1;
   }

   if (fs.existsSync('.hidden/test.hidden.js')) {
       try {
           console.log('\\n[HIDDEN TESTS] Edge cases & performance');
           console.log('-'.repeat(60));
           execSync('npm test -- .hidden/test.hidden.js', { stdio: 'inherit' });
       } catch (e) {
           hiddenResult = 1;
       }
   }

   console.log('\\n' + '='.repeat(60));
   if (visibleResult === 0 && hiddenResult === 0) {
       console.log('✅ ALL TESTS PASSED');
   } else {
       console.log('❌ SOME TESTS FAILED');
   }
   console.log('='.repeat(60));

   process.exit(Math.max(visibleResult, hiddenResult));

   TYPESCRIPT (runner.ts):
   import { execSync } from 'child_process';
   import * as fs from 'fs';

   console.log('='.repeat(60));
   console.log('ASSESSMENT TEST RUNNER');
   console.log('='.repeat(60));

   let visibleResult = 0;
   let hiddenResult = 0;

   try {
       console.log('\\n[VISIBLE TESTS] Basic functionality');
       console.log('-'.repeat(60));
       execSync('npm test -- test.visible.ts', { stdio: 'inherit' });
   } catch (e) {
       visibleResult = 1;
   }

   if (fs.existsSync('.hidden/test.hidden.ts')) {
       try {
           console.log('\\n[HIDDEN TESTS] Edge cases & performance');
           console.log('-'.repeat(60));
           execSync('npm test -- .hidden/test.hidden.ts', { stdio: 'inherit' });
       } catch (e) {
           hiddenResult = 1;
       }
   }

   console.log('\\n' + '='.repeat(60));
   if (visibleResult === 0 && hiddenResult === 0) {
       console.log('✅ ALL TESTS PASSED');
   } else {
       console.log('❌ SOME TESTS FAILED');
   }
   console.log('='.repeat(60));

   process.exit(Math.max(visibleResult, hiddenResult));

   JAVA (TestRunner.java):
   import org.junit.platform.launcher.Launcher;
   import org.junit.platform.launcher.LauncherDiscoveryRequest;
   import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder;
   import org.junit.platform.launcher.core.LauncherFactory;

   public class TestRunner {
       public static void main(String[] args) {
           System.out.println("=".repeat(60));
           System.out.println("ASSESSMENT TEST RUNNER");
           System.out.println("=".repeat(60));

           // Run visible tests
           System.out.println("\\n[VISIBLE TESTS] Basic functionality");
           System.out.println("-".repeat(60));
           boolean visiblePassed = runTests("TestVisible");

           // Run hidden tests
           boolean hiddenPassed = true;
           if (new java.io.File(".hidden/TestHidden.class").exists()) {
               System.out.println("\\n[HIDDEN TESTS] Edge cases & performance");
               System.out.println("-".repeat(60));
               hiddenPassed = runTests(".hidden.TestHidden");
           }

           System.out.println("\\n" + "=".repeat(60));
           if (visiblePassed && hiddenPassed) {
               System.out.println("✅ ALL TESTS PASSED");
           } else {
               System.out.println("❌ SOME TESTS FAILED");
           }
           System.out.println("=".repeat(60));

           System.exit(visiblePassed && hiddenPassed ? 0 : 1);
       }

       private static boolean runTests(String className) {
           // JUnit test execution logic
           return true;
       }
   }

   GO (runner.go):
   package main

   import (
       "fmt"
       "os"
       "os/exec"
       "strings"
   )

   func main() {
       fmt.Println(strings.Repeat("=", 60))
       fmt.Println("ASSESSMENT TEST RUNNER")
       fmt.Println(strings.Repeat("=", 60))

       // Run visible tests
       fmt.Println("\\n[VISIBLE TESTS] Basic functionality")
       fmt.Println(strings.Repeat("-", 60))
       visibleCmd := exec.Command("go", "test", "-v", "-run", "TestVisible")
       visibleCmd.Stdout = os.Stdout
       visibleCmd.Stderr = os.Stderr
       visibleErr := visibleCmd.Run()

       // Run hidden tests
       var hiddenErr error
       if _, err := os.Stat(".hidden/hidden_test.go"); err == nil {
           fmt.Println("\\n[HIDDEN TESTS] Edge cases & performance")
           fmt.Println(strings.Repeat("-", 60))
           hiddenCmd := exec.Command("go", "test", "-v", ".hidden")
           hiddenCmd.Stdout = os.Stdout
           hiddenCmd.Stderr = os.Stderr
           hiddenErr = hiddenCmd.Run()
       }

       fmt.Println("\\n" + strings.Repeat("=", 60))
       if visibleErr == nil && hiddenErr == nil {
           fmt.Println("✅ ALL TESTS PASSED")
           os.Exit(0)
       } else {
           fmt.Println("❌ SOME TESTS FAILED")
           os.Exit(1)
       }
   }

4. NO PLACEHOLDERS ALLOWED:
   ❌ WRONG: assert solution_function(...) == expected
   ❌ WRONG: # Test with large input
   ❌ WRONG: pass
   ✅ CORRECT: assert solution_function([1, 2, 3], 5) == [0, 2]
   ✅ CORRECT: assert solution_function([], 0) == None
   ✅ CORRECT: Large input test with actual data and timing

5. TEST QUALITY REQUIREMENTS:
   - Every test must be independently runnable
   - Every test must have clear documentation
   - Every test must use realistic test data
   - Every test must verify correct behavior with actual expected values
   - Performance tests must include timing assertions
   - Security tests must verify protection against specific attacks

6. LANGUAGE SELECTION LOGIC BY ASSESSMENT TYPE:

   When generating an assessment, select the language based on:
   1. Job description's primary language (highest priority)
   2. Assessment type's typical language (if #1 not specified)
   3. Default language for assessment type (fallback)

   RULES:
   - data_analysis: MUST be Python (no exceptions - pandas/sklearn required)
   - leetcode_algorithm: Use job's language OR Python (default)
   - system_design: Use job's backend language (Python/Node/Java)
   - debugging_fixit: MUST match job's primary language
   - code_review: MUST match job's primary language
   - real_world_project: Use job's full tech stack

   Example Decision Tree:
   - Job requires "Python developer" + leetcode_algorithm → Python
   - Job requires "Java backend" + system_design → Java
   - Job requires "Node.js" + debugging_fixit → JavaScript
   - Job requires "Data Scientist" + data_analysis → Python (enforced)
   - Job requires "Full stack React/Node" + real_world_project → JavaScript/TypeScript

7. LANGUAGE-SPECIFIC RUNNER SELECTION:
   Based on the "language" field determined above, generate the appropriate runner:
   - Python → runner.py (main_file: "runner.py", test_command: "python runner.py")
   - JavaScript → runner.js (main_file: "runner.js", test_command: "node runner.js")
   - TypeScript → runner.ts (main_file: "runner.ts", test_command: "ts-node runner.ts")
   - Java → TestRunner.java (main_file: "TestRunner.java", test_command: "java TestRunner")
   - Go → runner.go (main_file: "runner.go", test_command: "go run runner.go")

   Use the COMPLETE runner template provided above for the selected language.

8. TESTING FRAMEWORKS BY LANGUAGE:
   - Python: pytest (test_visible.py, .hidden/test_hidden.py)
   - JavaScript/Node: Jest or Mocha (test.visible.js, .hidden/test.hidden.js)
   - TypeScript: Jest with ts-jest (test.visible.ts, .hidden/test.hidden.ts)
   - Java: JUnit 5 (TestVisible.java, .hidden/TestHidden.java)
   - Go: testing package (visible_test.go, .hidden/hidden_test.go)
   - C++: Google Test or Catch2 (test_visible.cpp, .hidden/test_hidden.cpp)

    "project_structure": {
        "assessment_type": "leetcode_algorithm",
        "root_files": ["README.md", "requirements.txt", "setup.py", ".env.example", "docker-compose.yml"],
        "folders": {
            "src/solutions": ["question_1.py"],
            "src/tests": ["test_solutions.py", "test_runner.py", "conftest.py"],
            "problem_statements": ["question_1.md"],
            "datasets": ["sample_data.csv", "test_data.json"],
            "docs": ["setup_guide.md", "assessment_rubric.md"],
            "scripts": ["setup_env.sh", "run_tests.sh"]
        },
        "environment_setup": {
            "python_version": "3.9+",
            "virtual_env": true,
            "setup_commands": [
                "python -m venv assessment_env",
                "source assessment_env/bin/activate",
                "pip install --upgrade pip",
                "pip install -r requirements.txt",
                "python setup.py install"
            ],
            "dependencies": ["pytest", "pandas", "numpy", "requests", "flask", "sqlalchemy"],
            "dev_dependencies": ["black", "flake8", "mypy", "pytest-cov"],
            "optional_dependencies": ["jupyter", "matplotlib", "seaborn"]
        },
        "validation_commands": [
            "python -m pytest src/tests/ -v --cov=src/solutions",
            "python runner.py --validate",
            "flake8 src/solutions/",
            "black --check src/solutions/"
        ]
    },
    "success_criteria": [
        "All tests pass with 100% coverage",
        "Code follows PEP 8 and industry best practices",
        "Solution is optimal and handles edge cases",
        "Documentation is clear and comprehensive",
        "Environment setup works without manual intervention",
        "Performance meets specified requirements"
    ],
    "hints_available": true,
    "auto_fix_enabled": true,
    "environment_automation": true
}`;
        const preferredLanguageInstruction = preferredLanguage
            ? `\n\n**CRITICAL: CANDIDATE SELECTED LANGUAGE:**
The candidate has chosen to take this assessment in **${preferredLanguage.toUpperCase()}**.
You MUST generate the assessment in ${preferredLanguage} language.
- Set "language": "${preferredLanguage}"
- Generate all code files in ${preferredLanguage}
- Use ${preferredLanguage}-appropriate test framework and runner
- Follow the language-specific test file naming and runner templates provided in the instructions above`
            : '';
        logger_1.Logger.info(`🔍 DEBUG - Job Description being sent to Claude (first 300 chars):`);
        logger_1.Logger.info(jobDescription.substring(0, 300));
        logger_1.Logger.info(`🔍 DEBUG - Preferred Language: ${preferredLanguage || 'not specified'}`);
        const userMessage = `RECRUITER SKILLS ASSESSMENT CREATION REQUEST:

═══════════════════════════════════════════════════════════════════════
JOB DESCRIPTION:
═══════════════════════════════════════════════════════════════════════
${jobDescription}

═══════════════════════════════════════════════════════════════════════
CANDIDATE BACKGROUND:
═══════════════════════════════════════════════════════════════════════
${resumeText}${preferredLanguageInstruction}

═══════════════════════════════════════════════════════════════════════
MANDATORY: PERFORM ANALYSIS BEFORE CREATING ASSESSMENT
═══════════════════════════════════════════════════════════════════════

Before generating the JSON response, you MUST internally analyze:

1. EXTRACT KEYWORDS from Job Description:
   - What role type? (algorithm expert, backend API developer, frontend, data scientist, etc.)
   - What specific skills are mentioned? (list them)
   - What technologies are required? (list them)
   - What's the seniority level? (junior/mid/senior)

2. DETERMINE ASSESSMENT TYPE:
   - Does JD mention "algorithm", "data structures", "coding problems"? → leetcode_algorithm
   - Does JD mention "API", "backend", "microservices", "REST"? → system_design
   - Does JD mention "React", "frontend", "UI"? → real_world_project
   - Does JD mention "data science", "ML", "analytics"? → data_analysis
   - Does JD mention "debug", "fix bugs"? → debugging_fixit
   - Does JD mention "code review", "refactor"? → code_review

3. SELECT CORRECT ASSESSMENT TYPE based on PRIMARY job requirement

4. CHOOSE APPROPRIATE DIFFICULTY based on seniority indicators

5. GENERATE assessment that tests EXACTLY the skills mentioned in JD

═══════════════════════════════════════════════════════════════════════
YOUR TASK:
═══════════════════════════════════════════════════════════════════════

Create a comprehensive technical skills assessment that helps RECRUITERS evaluate this candidate's abilities for the specified job role.

REQUIREMENTS:
1. ANALYZE the job description to extract PRIMARY role type and required skills
2. SELECT the correct assessment_type that matches the job requirements
3. DESIGN assessment challenges that test the EXACT skills mentioned in JD
4. CREATE 1 comprehensive question that covers ALL job requirements
5. INCLUDE complete test cases (visible + hidden) with REAL data
6. ENSURE difficulty matches the seniority level in JD

⚠️ CRITICAL CONSTRAINTS:
- Create EXACTLY 1 QUESTION (not 2, not 3)
- Question MUST test the PRIMARY skills mentioned in JD
- Choose assessment_type based on JD keywords (algorithm → leetcode_algorithm, API/backend → system_design, etc.)
- Use the language specified by user OR mentioned in JD
- Generate COMPLETE files with NO placeholders

VERIFICATION CHECKLIST:
✓ Did you read the ENTIRE job description?
✓ Did you identify the PRIMARY skill being tested (algorithm, API design, frontend, etc.)?
✓ Did you select the correct assessment_type matching the JD?
✓ Does your question test the EXACT skills mentioned in JD?
✓ Are all test cases complete with real data (no "..." or "expected")?

FOCUS: The assessment MUST match what the job description is asking for. If JD wants algorithm skills, create leetcode_algorithm. If JD wants API skills, create system_design. Read carefully!`;
        try {
            const response = await this.claudeClient.chatCompletion([
                { role: 'user', content: userMessage }
            ], systemPrompt);
            if (!response.content) {
                throw new Error('No response from Claude planner');
            }
            // Extract JSON from markdown code blocks if present
            let jsonContent = response.content;
            if (jsonContent.includes('```json')) {
                // Find the opening ```json marker
                const startIdx = jsonContent.indexOf('```json') + 7;
                // Find the closing ``` marker by looking for ``` at the start of a line after the JSON
                const endIdx = jsonContent.indexOf('\n```', startIdx);
                if (endIdx !== -1) {
                    jsonContent = jsonContent.substring(startIdx, endIdx).trim();
                }
                else {
                    // Fallback: try to find any closing ```
                    const lastIdx = jsonContent.lastIndexOf('```');
                    if (lastIdx > startIdx) {
                        jsonContent = jsonContent.substring(startIdx, lastIdx).trim();
                    }
                }
            }
            else if (jsonContent.includes('```')) {
                // Handle generic code blocks - find the last closing ```
                const startIdx = jsonContent.indexOf('```') + 3;
                const lastIdx = jsonContent.lastIndexOf('```');
                if (lastIdx > startIdx) {
                    jsonContent = jsonContent.substring(startIdx, lastIdx).trim();
                }
            }
            let plan;
            try {
                plan = JSON.parse(jsonContent);
            }
            catch (parseError) {
                logger_1.Logger.error('Failed to parse Claude response as JSON:', parseError);
                logger_1.Logger.error('Raw response content:', response.content);
                logger_1.Logger.error('Extracted JSON content:', jsonContent);
                throw new Error(`Invalid JSON response from Claude: ${parseError}`);
            }
            plan.tasks = await this.generateDynamicTasks(plan);
            // Share the plan with other agents via MCP
            this.mcpService.setSharedData('current_assessment_plan', plan);
            this.mcpService.setSharedData('planning_status', 'completed');
            await this.notify('success', 'assessment_plan_completed', undefined, undefined, {
                assessmentType: plan.assessment_type,
                jobRole: plan.job_role
            });
            await this.notify('info', 'planning_details', undefined, undefined, {
                estimatedTime: plan.time_estimate_minutes || plan.estimated_duration || 90,
                assessmentFormat: plan.assessment_type
            });
            logger_1.Logger.info(`Claude generated assessment plan: ${plan.assessment_type} with ${plan.questions?.length || 0} questions`);
            return plan;
        }
        catch (error) {
            logger_1.Logger.error('Claude planning failed:', error);
            this.mcpService.setSharedData('planning_status', 'failed');
            throw error;
        }
    }
    async generateDynamicTasks(plan) {
        const tasks = [];
        const assessmentType = plan.assessment_type || 'leetcode_algorithm';
        // Create root structure based on assessment type
        tasks.push({
            id: 'create_root',
            type: 'create_folder',
            path: 'coding-assessment',
            description: 'Create assessment root directory',
            priority: 'high',
            dependencies: []
        });
        // Create .lodeai.json metadata file for dynamic detection
        const metadata = {
            assessment_type: plan.assessment_type,
            main_file: plan.main_file || 'runner.py',
            test_command: plan.test_command || 'pytest -v',
            language: plan.language || 'python',
            difficulty: plan.difficulty,
            job_role: plan.job_role,
            tech_stack: plan.tech_stack,
            time_estimate_minutes: plan.time_estimate_minutes
        };
        logger_1.Logger.info(`✅ Step 4: Assessment metadata created:`);
        logger_1.Logger.info(`  - Language: ${metadata.language}`);
        logger_1.Logger.info(`  - Main file: ${metadata.main_file}`);
        logger_1.Logger.info(`  - Test command: ${metadata.test_command}`);
        logger_1.Logger.info(`  - Assessment type: ${metadata.assessment_type}`);
        tasks.push({
            id: 'create_metadata',
            type: 'create_file',
            path: 'coding-assessment/.lodeai.json',
            content: JSON.stringify(metadata, null, 2),
            description: 'Create assessment metadata file',
            priority: 'high',
            dependencies: ['create_root']
        });
        // Dynamic folder creation based on AI-generated structure
        if (plan.project_structure) {
            // Create root files - ensure setup.py, .gitignore, and conftest.py are included
            const rootFiles = plan.project_structure.root_files || [];
            const essentialFiles = ['setup.py', '.gitignore'];
            // Add essential files if not already present
            essentialFiles.forEach(file => {
                if (!rootFiles.includes(file)) {
                    rootFiles.push(file);
                }
            });
            // Filter out image files from root files
            const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff'];
            // Create root files (excluding images)
            rootFiles.forEach((file, index) => {
                const isImageFile = imageExtensions.some(ext => file.toLowerCase().endsWith(ext));
                if (isImageFile) {
                    logger_1.Logger.warn(`Skipping root image file: ${file} - Only code files are generated`);
                    return; // Skip this file
                }
                tasks.push({
                    id: `create_root_file_${index}`,
                    type: 'create_file',
                    path: `coding-assessment/${file}`,
                    content: this.generateFileContent(file, plan),
                    description: `Create ${file}`,
                    priority: 'high',
                    dependencies: ['create_root']
                });
            });
            // Add conftest.py to tests directory
            if (plan.project_structure.folders && plan.project_structure.folders['src/tests']) {
                tasks.push({
                    id: 'create_conftest',
                    type: 'create_file',
                    path: 'coding-assessment/conftest.py',
                    content: this.generateConftest(),
                    description: 'Create pytest configuration file',
                    priority: 'high',
                    dependencies: ['create_root']
                });
            }
            // Create folders and their files
            Object.entries(plan.project_structure.folders || {}).forEach(([folderPath, files]) => {
                // Create folder
                tasks.push({
                    id: `create_folder_${folderPath.replace(/\//g, '_')}`,
                    type: 'create_folder',
                    path: `coding-assessment/${folderPath}`,
                    description: `Create ${folderPath} directory`,
                    priority: 'high',
                    dependencies: ['create_root']
                });
                // Create files in folder (skip image/media files)
                files.forEach((file, index) => {
                    // Skip image and media files
                    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff'];
                    const isImageFile = imageExtensions.some(ext => file.toLowerCase().endsWith(ext));
                    if (isImageFile) {
                        logger_1.Logger.warn(`Skipping image file: ${file} - Only code files are generated`);
                        return; // Skip this file
                    }
                    tasks.push({
                        id: `create_file_${folderPath.replace(/\//g, '_')}_${index}`,
                        type: 'create_file',
                        path: `coding-assessment/${folderPath}/${file}`,
                        content: this.generateFileContent(file, plan, folderPath),
                        description: `Create ${file} in ${folderPath}`,
                        priority: 'high',
                        dependencies: [`create_folder_${folderPath.replace(/\//g, '_')}`]
                    });
                });
            });
        }
        // ONLY download datasets if explicitly required
        if (plan.requires_datasets) {
            const datasetTasks = this.generateDatasetTasks(plan.job_role || 'other', plan.tech_stack);
            tasks.push(...datasetTasks);
        }
        // Generate question-specific files (pass plan to access generated_files)
        const questionTasks = this.generateQuestionFiles(plan.questions, plan.assessment_type, plan);
        tasks.push(...questionTasks);
        // Generate test file for LeetCode-style assessments
        if (assessmentType === 'leetcode_algorithm') {
            tasks.push({
                id: 'create_test_file',
                type: 'create_file',
                path: 'coding-assessment/src/tests/test_solutions.py',
                content: this.generateTestFile(plan.questions),
                description: 'Create test file for LeetCode solutions',
                priority: 'high',
                dependencies: ['create_root']
            });
        }
        return tasks;
    }
    generateFileContent(filename, plan, folderPath) {
        const assessmentType = plan.assessment_type;
        const difficulty = plan.difficulty;
        switch (filename) {
            case 'README.md':
                return this.generateDynamicReadme(plan);
            case 'requirements.txt':
                return this.generatePythonRequirements(plan.job_role || 'other', assessmentType);
            case 'package.json':
                return this.generatePackageJson(plan.job_role || 'other', assessmentType);
            case 'runner.py':
                return this.generateRunnerPy(plan);
            case 'setup.py':
                return this.generateSetupPy(plan);
            case '.gitignore':
                return this.generateGitignore();
            case 'conftest.py':
                return this.generateConftest();
            default:
                // Generate content based on file type and assessment
                if (filename.endsWith('.py')) {
                    // Try to find matching question for LeetCode-style files
                    const question = this.findQuestionForFile(filename, plan.questions);
                    return this.generatePythonStarter(filename, assessmentType, difficulty, question);
                }
                else if (filename.endsWith('.js')) {
                    return this.generateJavaScriptStarter(filename, assessmentType, difficulty);
                }
                else if (filename.endsWith('.ipynb')) {
                    return this.generateNotebookStarter(assessmentType, difficulty);
                }
                else {
                    return `# ${filename}\n\nAssessment: ${assessmentType}\nDifficulty: ${difficulty}`;
                }
        }
    }
    generateDynamicReadme(plan) {
        const questions = plan.questions;
        const assessmentType = plan.assessment_type;
        const questionsContent = questions?.map((q, i) => {
            const hints = q.hints ? `\n\n### Hints\n${q.hints.map((h) => `- ${h}`).join('\n')}` : '';
            return `## Question ${i + 1}: ${q.title}

**Type:** ${q.type} | **Difficulty:** ${q.difficulty}

### Problem Statement
${q.description}

### Input Format
${q.input_format}

### Output Format
${q.output_format}

### Examples
**Input:**
\`\`\`
${q.sample_input}
\`\`\`

**Output:**
\`\`\`
${q.sample_output}
\`\`\`

### Constraints
${q.constraints?.map(c => `- ${c}`).join('\n')}${hints}`;
        }).join('\n\n') || '';
        return `# ${assessmentType.replace(/_/g, ' ').toUpperCase()} Assessment

## Role: ${plan.job_role} | Difficulty: ${plan.difficulty}
## Estimated Time: ${plan.time_estimate_minutes || plan.estimated_duration || 90} minutes

## Assessment Type: ${assessmentType}
${this.getAssessmentTypeDescription(assessmentType)}

## Tech Stack
${plan.tech_stack.map(tech => `- ${tech}`).join('\n')}

## Success Criteria
${plan.success_criteria?.map(criteria => `- ${criteria}`).join('\n')}

## Getting Started
${plan.project_structure?.setup_commands?.map((cmd) => `1. ${cmd}`).join('\n') || '1. Review the project structure\n2. Implement your solutions\n3. Run tests to verify'}

## Assessment Questions

${questionsContent}

## Tips
- Read all questions before starting
- Test your solutions with the provided examples
- Consider edge cases
- Follow coding best practices

## Submission
Complete all tasks and ensure your code meets the success criteria.`;
    }
    getAssessmentTypeDescription(type) {
        const descriptions = {
            'leetcode_algorithm': 'Classic algorithm problems testing problem-solving skills',
            'system_design': 'Architecture and design problems testing scalability thinking',
            'debugging_fixit': 'Identify and fix bugs in existing code',
            'code_review': 'Review and improve code quality',
            'real_world_project': 'Mini-project simulating real work scenarios',
            'pair_programming': 'Collaborative problem with starter code'
        };
        return descriptions[type] || 'Technical skills assessment';
    }
    // FIXED: Only generate datasets for data roles
    generateDatasetTasks(jobRole, techStack) {
        const tasks = [];
        // ONLY include datasets for data-focused roles
        const dataRoles = ['data_scientist', 'data_analyst', 'machine_learning', 'ai_engineer'];
        const isDataRole = dataRoles.includes(jobRole) ||
            techStack.some(tech => ['pandas', 'numpy', 'tensorflow', 'pytorch'].includes(tech));
        if (!isDataRole) {
            return tasks; // Return empty array for non-data roles
        }
        const datasets = ['titanic', 'iris', 'wine-quality'];
        datasets.forEach((dataset, index) => {
            tasks.push({
                id: `download_dataset_${index + 1}`,
                type: 'download_dataset',
                path: `coding-assessment/data/raw/${dataset}.csv`,
                description: `Download ${dataset} dataset`,
                priority: 'medium',
                dependencies: ['create_root'],
                metadata: { dataset }
            });
        });
        return tasks;
    }
    generateQuestionFiles(questions, assessmentType, plan) {
        const tasks = [];
        // Check if we have AI-generated files in the plan
        const generatedFiles = plan?.generated_files;
        questions?.forEach((question, index) => {
            const qNumber = index + 1;
            // If AI generated files, use them directly
            if (generatedFiles) {
                tasks.push(...this.generateAIContentFiles(generatedFiles, question, qNumber, assessmentType));
            }
            else {
                // Fallback to template-based generation
                switch (assessmentType) {
                    case 'debugging_fixit':
                        tasks.push(...this.generateDebuggingFiles(question, qNumber));
                        break;
                    case 'system_design':
                        tasks.push(...this.generateSystemDesignFiles(question, qNumber));
                        break;
                    case 'code_review':
                        tasks.push(...this.generateCodeReviewFiles(question, qNumber));
                        break;
                    case 'real_world_project':
                        tasks.push(...this.generateRealWorldProjectFiles(question, qNumber));
                        break;
                    case 'data_analysis':
                        tasks.push(...this.generateDataAnalysisFiles(question, qNumber));
                        break;
                    case 'leetcode_algorithm':
                    default:
                        tasks.push(...this.generateStandardQuestionFiles(question, qNumber, assessmentType));
                        break;
                }
            }
        });
        return tasks;
    }
    generateAIContentFiles(generatedFiles, question, qNumber, assessmentType) {
        const tasks = [];
        // README/Question file
        if (generatedFiles['README.md']) {
            tasks.push({
                id: `create_readme_${qNumber}`,
                type: 'create_file',
                path: 'coding-assessment/README.md',
                content: generatedFiles['README.md'],
                description: 'Create problem description',
                priority: 'high',
                dependencies: ['create_root']
            });
        }
        // Solution file (main file where candidate writes code)
        const solutionFile = generatedFiles['solution.py'] || generatedFiles['solution.js'] || generatedFiles['solution.ts'];
        if (solutionFile) {
            const ext = generatedFiles['solution.py'] ? 'py' : (generatedFiles['solution.js'] ? 'js' : 'ts');
            tasks.push({
                id: `create_solution_${qNumber}`,
                type: 'create_file',
                path: `coding-assessment/solution.${ext}`,
                content: solutionFile,
                description: `Create solution file where candidate writes their code`,
                priority: 'high',
                dependencies: ['create_root']
            });
        }
        // Test file
        const testFile = generatedFiles['test_solution.py'] || generatedFiles['test_solution.js'] || generatedFiles['solution.test.js'];
        if (testFile) {
            const ext = generatedFiles['test_solution.py'] ? 'py' : 'js';
            tasks.push({
                id: `create_tests_${qNumber}`,
                type: 'create_file',
                path: `coding-assessment/test_solution.${ext}`,
                content: testFile,
                description: 'Create complete test suite',
                priority: 'high',
                dependencies: ['create_root']
            });
        }
        // Helper files (if any)
        Object.keys(generatedFiles).forEach(filename => {
            if (!['README.md', 'solution.py', 'solution.js', 'solution.ts', 'test_solution.py', 'test_solution.js', 'solution.test.js'].includes(filename)) {
                tasks.push({
                    id: `create_helper_${filename.replace(/[^a-zA-Z0-9]/g, '_')}_${qNumber}`,
                    type: 'create_file',
                    path: `coding-assessment/${filename}`,
                    content: generatedFiles[filename],
                    description: `Create helper file: ${filename}`,
                    priority: 'medium',
                    dependencies: ['create_root']
                });
            }
        });
        // Add task to make .hidden folder read-only
        tasks.push({
            id: `protect_hidden_folder_${qNumber}`,
            type: 'run_command',
            command: 'chmod -R 444 .hidden',
            cwd: 'coding-assessment',
            description: 'Protect hidden test files from modification',
            priority: 'high',
            dependencies: tasks.filter(t => t.path?.includes('.hidden')).map(t => t.id)
        });
        return tasks;
    }
    generateDebuggingFiles(question, qNumber) {
        const tasks = [];
        // Buggy implementation
        tasks.push({
            id: `create_buggy_${qNumber}`,
            type: 'create_file',
            path: `coding-assessment/src/buggy/question_${qNumber}.py`,
            content: this.generateBuggyCode(question),
            description: `Create buggy implementation for question ${qNumber}`,
            priority: 'high',
            dependencies: ['create_root']
        });
        // Test cases with expected outputs
        tasks.push({
            id: `create_tests_${qNumber}`,
            type: 'create_file',
            path: `coding-assessment/tests/test_question_${qNumber}.py`,
            content: this.generateDebuggingTests(question, qNumber),
            description: `Create tests for question ${qNumber}`,
            priority: 'high',
            dependencies: ['create_root']
        });
        return tasks;
    }
    generateBuggyCode(question) {
        const funcName = question.function_signature ? question.function_signature.split('(')[0].replace('def ', '').trim() : 'solution';
        return `#!/usr/bin/env python3
\"\"\"
DEBUGGING CHALLENGE: ${question.title}
${'='.repeat(40 + question.title.length)}

⚠️  This code contains intentional bugs!

Your task: Find and fix ALL bugs to make the tests pass.

Problem Description:
${question.description}

Expected Behavior:
- Input:  ${question.sample_input}
- Output: ${question.sample_output}

Bugs to find: 3-5 intentional errors
\"\"\"

from typing import List, Optional


${question.function_signature || 'def solution(input_data):'}
    \"\"\"
    ${question.description}

    ⚠️  BUG ALERT: This implementation has multiple bugs!
    Find and fix them all to pass the tests.
    \"\"\"

    # BUG 1: Wrong operation/logic
    result = input_data * 2  # This is incorrect!

    # BUG 2: Incorrect condition
    if len(input_data) > 100:  # Check this condition
        return None

    # BUG 3: Missing edge case handling
    # What happens with empty inputs?

    # BUG 4: Off-by-one error (if applicable)
    for i in range(len(input_data) + 1):  # Is this correct?
        pass

    return result


def run_tests():
    \"\"\"
    Run tests to check if you've fixed all bugs.
    All tests should pass when bugs are fixed.
    \"\"\"
    print("Testing buggy implementation...")
    print("-" * 50)

    # Test 1: Sample test case
    test_input = ${this.formatPythonValue(question.sample_input)}
    expected = ${this.formatPythonValue(question.sample_output)}

    try:
        result = ${funcName}(test_input)
        if result == expected:
            print("✅ Test 1 PASSED")
        else:
            print(f"❌ Test 1 FAILED")
            print(f"   Input:    {test_input}")
            print(f"   Expected: {expected}")
            print(f"   Got:      {result}")
    except Exception as e:
        print(f"❌ Test 1 ERROR: {e}")

    print()
    print("Fix all bugs and run this file again!")


if __name__ == "__main__":
    run_tests()
`;
    }
    generateDebuggingTests(question, qNumber) {
        return `import pytest
from src.buggy.question_${qNumber} import solution

def test_question_${qNumber}():
    """Test cases for debugging question ${qNumber}"""
    
    # Test case 1: Basic functionality
    test_input = """${question.sample_input}"""
    expected_output = """${question.sample_output}"""
    
    result = solution(test_input)
    assert result == expected_output, f"Expected {expected_output}, got {result}"
    
    # Add more test cases as needed
    print("All tests passed!")

if __name__ == "__main__":
    test_question_${qNumber}()`;
    }
    generateSystemDesignFiles(question, qNumber) {
        const tasks = [];
        // API specification
        tasks.push({
            id: `create_api_spec_${qNumber}`,
            type: 'create_file',
            path: `coding-assessment/design/api_spec_${qNumber}.yaml`,
            content: this.generateAPISpec(question, qNumber),
            description: `Create API spec for question ${qNumber}`,
            priority: 'high',
            dependencies: ['create_root']
        });
        // Database schema
        tasks.push({
            id: `create_db_schema_${qNumber}`,
            type: 'create_file',
            path: `coding-assessment/design/database_schema_${qNumber}.sql`,
            content: this.generateDatabaseSchema(question, qNumber),
            description: `Create database schema for question ${qNumber}`,
            priority: 'high',
            dependencies: ['create_root']
        });
        return tasks;
    }
    generateAPISpec(question, qNumber) {
        return `openapi: 3.0.0
info:
  title: ${question.title} API
  description: ${question.description}
  version: 1.0.0

paths:
  /api/v1/endpoint:
    get:
      summary: Get data
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: string
                    example: "${question.sample_output}"

components:
  schemas:
    DataModel:
      type: object
      properties:
        id:
          type: integer
        value:
          type: string`;
    }
    generateDatabaseSchema(question, qNumber) {
        return `-- Database Schema for ${question.title}
-- ${question.description}

CREATE TABLE IF NOT EXISTS data_table (
    id SERIAL PRIMARY KEY,
    value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data
INSERT INTO data_table (value) VALUES 
    ('${question.sample_input}'),
    ('sample_data_2'),
    ('sample_data_3');`;
    }
    generateCodeReviewFiles(question, qNumber) {
        const tasks = [];
        // Poor quality code to review
        tasks.push({
            id: `create_poor_code_${qNumber}`,
            type: 'create_file',
            path: `coding-assessment/src/to_review/question_${qNumber}.py`,
            content: this.generatePoorQualityCode(question),
            description: `Create code to review for question ${qNumber}`,
            priority: 'high',
            dependencies: ['create_root']
        });
        // Review guidelines
        tasks.push({
            id: `create_review_guide_${qNumber}`,
            type: 'create_file',
            path: `coding-assessment/docs/review_guide_${qNumber}.md`,
            content: this.generateReviewGuidelines(question, qNumber),
            description: `Create review guidelines for question ${qNumber}`,
            priority: 'high',
            dependencies: ['create_root']
        });
        // Improved code template
        tasks.push({
            id: `create_improved_template_${qNumber}`,
            type: 'create_file',
            path: `coding-assessment/src/improved/question_${qNumber}.py`,
            content: this.generateImprovedCodeTemplate(question),
            description: `Create improved code template for question ${qNumber}`,
            priority: 'high',
            dependencies: ['create_root']
        });
        return tasks;
    }
    generatePoorQualityCode(question) {
        return `#!/usr/bin/env python3
\"\"\"
CODE REVIEW CHALLENGE: ${question.title}
${'='.repeat(40 + question.title.length)}

⚠️  This code works but has MANY quality issues!

Your task: Review this code and identify ALL issues, then refactor it.

Problem: ${question.description}

Issues to find:
- Bad naming conventions
- No error handling
- Poor code structure
- Missing documentation
- Performance issues
- No type hints
- Code duplication
- Magic numbers
- etc.

Instructions:
1. Document all issues you find in review_notes.md
2. Refactor the code in src/improved/question_${question.title.replace(/\s+/g, '_').toLowerCase()}.py
3. Run tests to ensure functionality is preserved
\"\"\"

# Poor quality implementation
def f(x):  # Bad function name
    r=[]  # Bad variable name, no type hint
    for i in range(len(x)):  # Unnecessary indexing
        if x[i]>0:  # No spacing, magic number
            r.append(x[i]*2)  # Hard-coded value
    return r

# Duplicate code (code smell)
def g(x):
    r=[]
    for i in range(len(x)):
        if x[i]>0:
            r.append(x[i]*3)  # Similar to f() but slightly different
    return r

# No error handling
def process(data):
    result = f(data)  # What if data is None?
    final = g(result)  # What if result is empty?
    return final[0]  # What if final is empty? IndexError!

# No main guard, runs on import
data = [1, -2, 3, -4, 5]
output = process(data)
print(output)
`;
    }
    generateReviewGuidelines(question, qNumber) {
        return `# Code Review Guidelines - Question ${qNumber}

## ${question.title}

### Your Task
Review the code in \`src/to_review/question_${qNumber}.py\` and:
1. Identify all code quality issues
2. Document each issue with severity (Critical/High/Medium/Low)
3. Suggest improvements
4. Refactor the code in \`src/improved/question_${qNumber}.py\`

### Areas to Review

#### 1. Code Style & Readability
- [ ] Naming conventions (PEP 8)
- [ ] Code formatting
- [ ] Comments and documentation
- [ ] Magic numbers/strings
- [ ] Code duplication

#### 2. Error Handling
- [ ] Input validation
- [ ] Exception handling
- [ ] Edge cases
- [ ] Error messages

#### 3. Performance
- [ ] Algorithm efficiency
- [ ] Unnecessary iterations
- [ ] Data structure choices
- [ ] Memory usage

#### 4. Best Practices
- [ ] Type hints
- [ ] Function documentation
- [ ] Single Responsibility Principle
- [ ] DRY (Don't Repeat Yourself)

### Deliverables
1. **review_notes.md**: Document all issues found
2. **src/improved/question_${qNumber}.py**: Refactored, production-ready code
3. All tests must pass after refactoring

### Scoring Criteria
- Issues identified: 40%
- Code improvements: 40%
- Tests passing: 20%
`;
    }
    generateImprovedCodeTemplate(question) {
        return `#!/usr/bin/env python3
\"\"\"
IMPROVED VERSION: ${question.title}

Refactor the poor-quality code to meet production standards.
\"\"\"

from typing import List, Optional


${question.function_signature || 'def solution(data: List[int]) -> List[int]:'}
    \"\"\"
    TODO: Implement improved version with:
    - Clear naming
    - Type hints
    - Error handling
    - Documentation
    - Optimal performance
    - Clean code structure
    \"\"\"
    pass


if __name__ == "__main__":
    # Test your improved implementation
    pass
`;
    }
    generateRealWorldProjectFiles(question, qNumber) {
        const tasks = [];
        // Project requirements document
        tasks.push({
            id: `create_project_requirements_${qNumber}`,
            type: 'create_file',
            path: `coding-assessment/docs/project_requirements_${qNumber}.md`,
            content: this.generateProjectRequirements(question),
            description: `Create project requirements for question ${qNumber}`,
            priority: 'high',
            dependencies: ['create_root']
        });
        // Project scaffold files
        const scaffoldFiles = [
            { path: 'src/main.py', content: this.generateMainFile(question) },
            { path: 'src/models.py', content: this.generateModelsFile(question) },
            { path: 'src/utils.py', content: this.generateUtilsFile() },
            { path: 'tests/test_main.py', content: this.generateProjectTests(question) },
        ];
        scaffoldFiles.forEach((file, idx) => {
            tasks.push({
                id: `create_project_file_${qNumber}_${idx}`,
                type: 'create_file',
                path: `coding-assessment/${file.path}`,
                content: file.content,
                description: `Create ${file.path}`,
                priority: 'high',
                dependencies: ['create_root']
            });
        });
        return tasks;
    }
    generateProjectRequirements(question) {
        return `# Real-World Project: ${question.title}

## Overview
${question.description}

## Requirements

### Functional Requirements
1. ${question.sample_input}
2. ${question.sample_output}
3. Handle all edge cases mentioned in constraints

### Technical Requirements
- Clean, modular code architecture
- Comprehensive error handling
- Unit tests with >80% coverage
- Documentation for all public functions
- Follow Python best practices (PEP 8)

### Constraints
${question.constraints?.map(c => `- ${c}`).join('\n')}

## Project Structure
\`\`\`
src/
├── main.py          # Entry point
├── models.py        # Data models
└── utils.py         # Helper functions
tests/
└── test_main.py     # Unit tests
\`\`\`

## Deliverables
1. Working implementation passing all tests
2. Clean, documented code
3. README with usage examples

## Evaluation Criteria
- Functionality: 40%
- Code Quality: 30%
- Tests: 20%
- Documentation: 10%
`;
    }
    generateMainFile(question) {
        return `#!/usr/bin/env python3
\"\"\"
Main implementation for: ${question.title}
\"\"\"

from typing import List, Optional
from models import *
from utils import *


${question.function_signature || 'def main():'}
    \"\"\"
    Main entry point for the application.

    TODO: Implement the solution according to project requirements.
    \"\"\"
    pass


if __name__ == "__main__":
    main()
`;
    }
    generateModelsFile(question) {
        return `#!/usr/bin/env python3
\"\"\"
Data models for: ${question.title}
\"\"\"

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class DataModel:
    \"\"\"
    TODO: Define your data models here.
    Use dataclasses or Pydantic for clean data structures.
    \"\"\"
    pass
`;
    }
    generateUtilsFile() {
        return `#!/usr/bin/env python3
\"\"\"
Utility functions and helpers
\"\"\"

from typing import Any, List, Optional


def validate_input(data: Any) -> bool:
    \"\"\"
    Validate input data.

    Args:
        data: Input to validate

    Returns:
        True if valid, False otherwise
    \"\"\"
    # TODO: Implement validation logic
    return True


def format_output(result: Any) -> str:
    \"\"\"
    Format output for display.

    Args:
        result: Result to format

    Returns:
        Formatted string representation
    \"\"\"
    # TODO: Implement formatting logic
    return str(result)
`;
    }
    generateProjectTests(question) {
        return `#!/usr/bin/env python3
\"\"\"
Tests for ${question.title}
\"\"\"

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from main import *


class TestProject:
    \"\"\"Test suite for the real-world project\"\"\"

    def test_sample_case(self):
        \"\"\"Test with provided sample\"\"\"
        # TODO: Implement test
        pass

    def test_edge_cases(self):
        \"\"\"Test edge cases\"\"\"
        # TODO: Implement edge case tests
        pass

    def test_error_handling(self):
        \"\"\"Test error handling\"\"\"
        # TODO: Test error scenarios
        pass
`;
    }
    generateDataAnalysisFiles(question, qNumber) {
        const tasks = [];
        // Jupyter notebook for analysis
        tasks.push({
            id: `create_analysis_notebook_${qNumber}`,
            type: 'create_file',
            path: `coding-assessment/notebooks/analysis_${qNumber}.ipynb`,
            content: this.generateAnalysisNotebook(question),
            description: `Create analysis notebook for question ${qNumber}`,
            priority: 'high',
            dependencies: ['create_root']
        });
        // Python script version
        tasks.push({
            id: `create_analysis_script_${qNumber}`,
            type: 'create_file',
            path: `coding-assessment/src/analysis/question_${qNumber}.py`,
            content: this.generateAnalysisScript(question),
            description: `Create analysis script for question ${qNumber}`,
            priority: 'high',
            dependencies: ['create_root']
        });
        // Sample dataset (placeholder)
        tasks.push({
            id: `create_sample_dataset_${qNumber}`,
            type: 'create_file',
            path: `coding-assessment/data/sample_data_${qNumber}.csv`,
            content: this.generateSampleDataset(),
            description: `Create sample dataset for question ${qNumber}`,
            priority: 'medium',
            dependencies: ['create_root']
        });
        return tasks;
    }
    generateAnalysisNotebook(question) {
        return JSON.stringify({
            cells: [
                {
                    cell_type: "markdown",
                    metadata: {},
                    source: [
                        `# Data Analysis: ${question.title}\n`,
                        `\n`,
                        `## Problem Description\n`,
                        `${question.description}\n`,
                        `\n`,
                        `## Tasks\n`,
                        `${question.constraints?.map(c => `- ${c}`).join('\n')}\n`
                    ]
                },
                {
                    cell_type: "code",
                    execution_count: null,
                    metadata: {},
                    outputs: [],
                    source: [
                        "# Import required libraries\n",
                        "import pandas as pd\n",
                        "import numpy as np\n",
                        "import matplotlib.pyplot as plt\n",
                        "import seaborn as sns\n",
                        "\n",
                        "# Set display options\n",
                        "pd.set_option('display.max_columns', None)\n",
                        "sns.set_style('whitegrid')\n",
                        "\n",
                        "print('Libraries imported successfully!')"
                    ]
                },
                {
                    cell_type: "markdown",
                    metadata: {},
                    source: ["## 1. Data Loading\n"]
                },
                {
                    cell_type: "code",
                    execution_count: null,
                    metadata: {},
                    outputs: [],
                    source: [
                        "# Load the dataset\n",
                        "# TODO: Load your data here\n",
                        "df = pd.read_csv('../data/sample_data.csv')\n",
                        "\n",
                        "# Display basic information\n",
                        "print(f'Dataset shape: {df.shape}')\n",
                        "df.head()"
                    ]
                },
                {
                    cell_type: "markdown",
                    metadata: {},
                    source: ["## 2. Data Exploration\n"]
                },
                {
                    cell_type: "code",
                    execution_count: null,
                    metadata: {},
                    outputs: [],
                    source: [
                        "# TODO: Exploratory Data Analysis\n",
                        "df.info()\n",
                        "df.describe()"
                    ]
                },
                {
                    cell_type: "markdown",
                    metadata: {},
                    source: ["## 3. Data Analysis\n"]
                },
                {
                    cell_type: "code",
                    execution_count: null,
                    metadata: {},
                    outputs: [],
                    source: [
                        "# TODO: Perform your analysis here\n",
                        "pass"
                    ]
                },
                {
                    cell_type: "markdown",
                    metadata: {},
                    source: ["## 4. Visualization\n"]
                },
                {
                    cell_type: "code",
                    execution_count: null,
                    metadata: {},
                    outputs: [],
                    source: [
                        "# TODO: Create visualizations\n",
                        "plt.figure(figsize=(10, 6))\n",
                        "# Your plots here\n",
                        "plt.show()"
                    ]
                },
                {
                    cell_type: "markdown",
                    metadata: {},
                    source: ["## 5. Conclusions\n", "TODO: Summarize your findings\n"]
                }
            ],
            metadata: {
                kernelspec: {
                    display_name: "Python 3",
                    language: "python",
                    name: "python3"
                },
                language_info: {
                    name: "python",
                    version: "3.9.0"
                }
            },
            nbformat: 4,
            nbformat_minor: 4
        }, null, 2);
    }
    generateAnalysisScript(question) {
        return `#!/usr/bin/env python3
\"\"\"
Data Analysis Script: ${question.title}

Problem: ${question.description}
\"\"\"

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Tuple


def load_data(file_path: str) -> pd.DataFrame:
    \"\"\"
    Load dataset from file.

    Args:
        file_path: Path to the data file

    Returns:
        Loaded DataFrame
    \"\"\"
    # TODO: Implement data loading with error handling
    df = pd.read_csv(file_path)
    return df


def explore_data(df: pd.DataFrame) -> Dict:
    \"\"\"
    Perform exploratory data analysis.

    Args:
        df: Input DataFrame

    Returns:
        Dictionary with exploration results
    \"\"\"
    # TODO: Implement EDA
    results = {
        'shape': df.shape,
        'columns': df.columns.tolist(),
        'dtypes': df.dtypes.to_dict(),
        'missing': df.isnull().sum().to_dict(),
    }
    return results


def analyze_data(df: pd.DataFrame) -> Dict:
    \"\"\"
    Perform main analysis.

    Args:
        df: Input DataFrame

    Returns:
        Analysis results
    \"\"\"
    # TODO: Implement your analysis logic
    results = {}
    return results


def visualize_results(df: pd.DataFrame) -> None:
    \"\"\"
    Create visualizations.

    Args:
        df: Input DataFrame
    \"\"\"
    # TODO: Create plots
    plt.figure(figsize=(12, 8))
    # Your visualization code here
    plt.tight_layout()
    plt.show()


def main():
    \"\"\"Main execution function\"\"\"
    # Load data
    df = load_data('../data/sample_data.csv')

    # Explore
    exploration = explore_data(df)
    print("Data Exploration Results:")
    print(exploration)

    # Analyze
    results = analyze_data(df)
    print("\\nAnalysis Results:")
    print(results)

    # Visualize
    visualize_results(df)


if __name__ == "__main__":
    main()
`;
    }
    generateSampleDataset() {
        return `id,feature1,feature2,feature3,target
1,10,20,30,0
2,15,25,35,1
3,12,22,32,0
4,18,28,38,1
5,14,24,34,0
# TODO: Replace with actual dataset or use AI dataset search
`;
    }
    generateStandardQuestionFiles(question, qNumber, assessmentType) {
        const tasks = [];
        // Problem statement markdown
        tasks.push({
            id: `create_question_stmt_${qNumber}`,
            type: 'create_file',
            path: `coding-assessment/problem_statements/question_${qNumber}.md`,
            content: this.generateLeetCodeProblemStatement(question, qNumber),
            description: `Create problem statement for question ${qNumber}`,
            priority: 'high',
            dependencies: ['create_root']
        });
        // Solution file with function signature
        tasks.push({
            id: `create_solution_${qNumber}`,
            type: 'create_file',
            path: `coding-assessment/src/solutions/question_${qNumber}.py`,
            content: this.generateLeetCodePythonFile(question),
            description: `Create solution file for question ${qNumber}`,
            priority: 'high',
            dependencies: ['create_root']
        });
        return tasks;
    }
    generateLeetCodeProblemStatement(question, qNumber) {
        return `# Question ${qNumber}: ${question.title}

**Difficulty:** ${question.difficulty}  
**Type:** ${question.type}

## Problem Description
${question.description}

## Input Format
\`\`\`
${question.input_format}
\`\`\`

## Output Format
\`\`\`
${question.output_format}
\`\`\`

## Constraints
${question.constraints?.map(c => `- ${c}`).join('\n')}

## Examples

### Example 1:
**Input:**  
\`\`\`
${question.sample_input}
\`\`\`

**Output:**  
\`\`\`
${question.sample_output}
\`\`\`

**Explanation:**  
${question.sample_explanation}

## Function Signature
\`\`\`python
${question.function_signature}
\`\`\`

## Hidden Test Cases
${question.hidden_test_description}

## Hints
${question.hints?.map(h => `- ${h}`).join('\n')}

## Optimal Approach
${question.optimal_approach}`;
    }
    // Updated test file generation
    generateTestFile(questions) {
        return `#!/usr/bin/env python3
\"\"\"
Test Suite for Coding Assessment
=================================

Run all tests:
    python -m pytest test_solutions.py -v

Run with coverage:
    python -m pytest test_solutions.py -v --cov=src/solutions --cov-report=term-missing

Run specific test:
    python -m pytest test_solutions.py::test_question_1 -v
\"\"\"

import pytest
import sys
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

${questions.map((q, index) => {
            const qNum = index + 1;
            const funcName = q.function_signature ? q.function_signature.split('(')[0].replace('def ', '').trim() : 'solution';
            return `from src.solutions.question_${qNum} import ${funcName} as solution_${qNum}`;
        }).join('\n')}


${questions.map((q, index) => {
            const qNum = index + 1;
            return `
class TestQuestion${qNum}:
    \"\"\"
    Test cases for: ${q.title}
    Difficulty: ${q.difficulty}
    Type: ${q.type}
    \"\"\"

    def test_sample_case(self):
        \"\"\"Test with the provided sample input\"\"\"
        input_data = ${this.formatPythonValue(q.sample_input)}
        expected = ${this.formatPythonValue(q.sample_output)}
        result = solution_${qNum}(input_data)

        assert result == expected, (
            f"Sample test failed for ${q.title}\\n"
            f"Input:    {input_data}\\n"
            f"Expected: {expected}\\n"
            f"Got:      {result}"
        )

    @pytest.mark.skip(reason="TODO: Implement edge case tests")
    def test_edge_case_empty(self):
        \"\"\"Test with empty input\"\"\"
        # TODO: Add edge case test
        # Hint: ${q.hidden_test_description}
        pass

    @pytest.mark.skip(reason="TODO: Implement edge case tests")
    def test_edge_case_single_element(self):
        \"\"\"Test with single element input\"\"\"
        # TODO: Add edge case test
        pass

    @pytest.mark.skip(reason="TODO: Implement edge case tests")
    def test_edge_case_large_input(self):
        \"\"\"Test with maximum size input\"\"\"
        # TODO: Add edge case test based on constraints:
        ${q.constraints?.map(c => `# - ${c}`).join('\n        ')}
        pass

    @pytest.mark.skip(reason="TODO: Implement boundary tests")
    def test_boundary_values(self):
        \"\"\"Test with boundary values from constraints\"\"\"
        # TODO: Add boundary value tests
        pass
`;
        }).join('\n')}


def run_all_tests():
    \"\"\"Helper function to run all tests programmatically\"\"\"
    print("Running all assessment tests...")
    print("=" * 60)

    exit_code = pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--color=yes"
    ])

    if exit_code == 0:
        print("\\n" + "=" * 60)
        print("✅ All tests passed!")
        print("=" * 60)
    else:
        print("\\n" + "=" * 60)
        print("❌ Some tests failed. Review the output above.")
        print("=" * 60)

    return exit_code


if __name__ == "__main__":
    sys.exit(run_all_tests())
`;
    }
    generateProblemStatement(question, qNumber) {
        const hints = question.hints ? `\n\n## Hints\n${question.hints.map((h) => `- ${h}`).join('\n')}` : '';
        return `# Question ${qNumber}: ${question.title}

**Type:** ${question.type} | **Difficulty:** ${question.difficulty}

## Problem Statement
${question.description}

## Input Format
${question.input_format}

## Output Format
${question.output_format}

## Examples
**Input:**
\`\`\`
${question.sample_input}
\`\`\`

**Output:**
\`\`\`
${question.sample_output}
\`\`\`

## Constraints
${question.constraints?.map(c => `- ${c}`).join('\n')}${hints}`;
    }
    generateSolutionTemplate(question, qNumber) {
        return `# Solution for Question ${qNumber}: ${question.title}

def solution(input_data):
    """
    ${question.description}
    
    Args:
        input_data: ${question.input_format}
    
    Returns:
        ${question.output_format}
    """
    # TODO: Implement your solution here
    pass

# Test with sample input
if __name__ == "__main__":
    test_input = """${question.sample_input}"""
    result = solution(test_input)
    print("Result:", result)
    print("Expected:", """${question.sample_output}""")`;
    }
    generatePythonStarter(filename, assessmentType, difficulty, question) {
        if (filename.includes('question_') && question?.function_signature) {
            return this.generateLeetCodePythonFile(question);
        }
        // Default starter code for other files
        return `# ${filename}
# Assessment: ${assessmentType}
# Difficulty: ${difficulty}

def main():
    print("Code file for ${assessmentType} assessment")

if __name__ == "__main__":
    main()`;
    }
    generateLeetCodePythonFile(question) {
        const hints = question.hints ? `\n# Hints:\n${question.hints.map(h => `# - ${h}`).join('\n')}` : '';
        const optimalApproach = question.optimal_approach ? `\n# Optimal Approach: ${question.optimal_approach}` : '';
        const funcName = question.function_signature ? question.function_signature.split('(')[0].replace('def ', '').trim() : 'solution';
        return `#!/usr/bin/env python3
\"\"\"
${question.title}
${'='.repeat(question.title.length)}

Difficulty: ${question.difficulty}
Type: ${question.type}

Problem Description:
${question.description}

Input Format:
${question.input_format}

Output Format:
${question.output_format}

Constraints:
${question.constraints?.map(c => `- ${c}`).join('\n')}

Example:
--------
Input:  ${question.sample_input}
Output: ${question.sample_output}

Explanation: ${question.sample_explanation}

Note: ${question.hidden_test_description}
\"\"\"

from typing import List, Optional, Dict, Set, Tuple
import sys


${question.function_signature}
    \"\"\"
    Implement your solution here.

    Time Complexity: O(?) - TODO: Analyze and document
    Space Complexity: O(?) - TODO: Analyze and document
    \"\"\"
    # TODO: Implement your solution
    pass


def run_sample_tests():
    \"\"\"
    Run the provided sample test case.
    This helps verify your implementation with the given examples.
    \"\"\"
    print("Running Sample Tests...")
    print("-" * 50)

    # Sample Test Case
    test_input = ${this.formatPythonValue(question.sample_input)}
    expected_output = ${this.formatPythonValue(question.sample_output)}

    try:
        result = ${funcName}(test_input)
        passed = result == expected_output

        print(f"Input:    {test_input}")
        print(f"Expected: {expected_output}")
        print(f"Got:      {result}")
        print(f"Status:   {'✅ PASS' if passed else '❌ FAIL'}")

        if passed:
            print("\\n🎉 Sample test passed!")
        else:
            print("\\n⚠️  Sample test failed. Review your implementation.")

        return passed
    except Exception as e:
        print(f"❌ Error running test: {e}")
        import traceback
        traceback.print_exc()
        return False


def run_edge_cases():
    \"\"\"
    TODO: Add edge case tests based on the constraints.

    Consider testing:
    - Empty inputs
    - Single element inputs
    - Maximum size inputs
    - Boundary values
    - Special cases mentioned in constraints
    \"\"\"
    print("\\nRunning Edge Case Tests...")
    print("-" * 50)
    print("⚠️  No edge cases implemented yet")
    print("Add your edge case tests here!")
    return True


if __name__ == "__main__":
    print("=" * 60)
    print(f"Testing: ${question.title}")
    print("=" * 60)
    print()

    # Run sample tests
    sample_passed = run_sample_tests()

    # Run edge cases
    edge_passed = run_edge_cases()

    print()
    print("=" * 60)
    if sample_passed:
        print("✅ All tests passed! Ready to submit.")
    else:
        print("❌ Some tests failed. Review your implementation.")
    print("=" * 60)
${hints}
${optimalApproach}
`;
    }
    generateSetupPy(plan) {
        return `#!/usr/bin/env python3
\"\"\"
Setup script for the coding assessment
\"\"\"

from setuptools import setup, find_packages

setup(
    name="coding-assessment",
    version="1.0.0",
    description="${plan.assessment_type} Assessment for ${plan.job_role}",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "pytest>=7.4.0",
        "pytest-cov>=4.1.0",
        "black>=23.7.0",
        "flake8>=6.0.0",
    ],
    entry_points={
        "console_scripts": [
            "run-assessment=runner:main",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
)
`;
    }
    generateGitignore() {
        return `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual Environment
assessment_env/
venv/
ENV/
env/

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Data
*.csv
*.xlsx
*.json
datasets/*.csv
!datasets/README.md
`;
    }
    generateConftest() {
        return `#!/usr/bin/env python3
\"\"\"
PyTest configuration file
Shared fixtures and configuration for all tests
\"\"\"

import pytest
import sys
from pathlib import Path

# Add src directory to Python path
sys.path.insert(0, str(Path(__file__).parent / "src"))


@pytest.fixture
def sample_data():
    \"\"\"Fixture providing sample test data\"\"\"
    return {
        "empty": [],
        "single": [1],
        "small": [1, 2, 3],
        "medium": list(range(100)),
        "large": list(range(10000)),
    }


@pytest.fixture
def performance_threshold():
    \"\"\"Fixture for performance testing thresholds\"\"\"
    return {
        "max_time_ms": 1000,  # Maximum execution time in milliseconds
        "max_memory_mb": 100,  # Maximum memory usage in MB
    }


def pytest_configure(config):
    \"\"\"Configure pytest with custom markers\"\"\"
    config.addinivalue_line(
        "markers",
        "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers",
        "edge_case: marks tests as edge case tests"
    )
    config.addinivalue_line(
        "markers",
        "performance: marks tests as performance tests"
    )


def pytest_collection_modifyitems(config, items):
    \"\"\"Modify test collection to add markers automatically\"\"\"
    for item in items:
        # Add edge_case marker to edge case tests
        if "edge_case" in item.nodeid:
            item.add_marker(pytest.mark.edge_case)

        # Add slow marker to large input tests
        if "large" in item.nodeid or "performance" in item.nodeid:
            item.add_marker(pytest.mark.slow)
`;
    }
    formatPythonValue(inputStr) {
        // Convert sample input to proper Python values
        if (inputStr.includes('=')) {
            // Handle "nums = [2,7,11,15], target = 9" format
            return inputStr.split(',')[0].split('=')[1].trim();
        }
        if (inputStr.startsWith('[') && inputStr.endsWith(']')) {
            return inputStr; // Already a list
        }
        if (!isNaN(Number(inputStr))) {
            return inputStr; // Number
        }
        return `"${inputStr}"`; // String
    }
    getFunctionCall(signature, inputVar) {
        const funcName = signature.split('(')[0].replace('def ', '').trim();
        return `${funcName}(${inputVar})`;
    }
    findQuestionForFile(filename, questions) {
        // Extract question number from filename like "question_1.py"
        const match = filename.match(/question_(\d+)\.py/);
        if (match) {
            const questionNumber = parseInt(match[1]) - 1; // Convert to 0-based index
            return questions[questionNumber];
        }
        return undefined;
    }
    generateJavaScriptStarter(filename, assessmentType, difficulty) {
        return `// ${filename}
// Assessment Type: ${assessmentType}
// Difficulty: ${difficulty}

function main() {
    console.log("Starting ${assessmentType} assessment...");
    // Your implementation here
}

main();`;
    }
    generateNotebookStarter(assessmentType, difficulty) {
        return JSON.stringify({
            cells: [
                {
                    cell_type: "markdown",
                    metadata: {},
                    source: [`# ${assessmentType.replace(/_/g, ' ').toUpperCase()} Assessment\n`, `**Difficulty:** ${difficulty}\n`, `\n`, `Complete the tasks in this notebook.`]
                },
                {
                    cell_type: "code",
                    execution_count: null,
                    metadata: {},
                    outputs: [],
                    source: ["# Your solution here\n", "import pandas as pd\n", "import numpy as np\n", "\n", "# Start implementing your solution"]
                }
            ],
            metadata: {
                kernelspec: {
                    display_name: "Python 3",
                    language: "python",
                    name: "python3"
                }
            },
            nbformat: 4,
            nbformat_minor: 4
        }, null, 2);
    }
    generateRunnerPy(plan) {
        const assessmentType = plan.assessment_type;
        const difficulty = plan.difficulty;
        const questions = plan.questions;
        return `#!/usr/bin/env python3
"""
Coding Assessment Runner
========================
Assessment Type: ${assessmentType}
Difficulty: ${difficulty}
Role: ${plan.job_role}
Estimated Time: ${plan.time_estimate_minutes || 90} minutes

This script helps you run and test your assessment solutions.
"""

import os
import sys
import subprocess
from pathlib import Path

class AssessmentRunner:
    def __init__(self):
        self.root_dir = Path(__file__).parent
        self.src_dir = self.root_dir / "src"
        self.tests_dir = self.root_dir / "src" / "tests"
        self.solutions_dir = self.root_dir / "src" / "solutions"

    def print_header(self):
        """Print assessment header"""
        print("=" * 60)
        print("CODING ASSESSMENT RUNNER")
        print("=" * 60)
        print(f"Assessment Type: ${assessmentType}")
        print(f"Difficulty: ${difficulty}")
        print(f"Role: ${plan.job_role}")
        print(f"Questions: ${questions?.length || 0}")
        print("=" * 60)
        print()

    def check_environment(self):
        """Check if the environment is properly set up"""
        print("🔍 Checking environment setup...")

        # Check if virtual environment is activated
        if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
            print("⚠️  Warning: Virtual environment not activated")
            print("   Run: source assessment_env/bin/activate")
            print()
        else:
            print("✅ Virtual environment activated")

        # Check if required directories exist
        if not self.src_dir.exists():
            print("❌ Error: src/ directory not found")
            return False
        if not self.solutions_dir.exists():
            print("❌ Error: src/solutions/ directory not found")
            return False
        if not self.tests_dir.exists():
            print("❌ Error: src/tests/ directory not found")
            return False

        print("✅ Directory structure is correct")
        print()
        return True

    def list_questions(self):
        """List all assessment questions"""
        print("📝 Assessment Questions:")
        print()
        ${questions?.map((q, i) => `print("${i + 1}. ${q.title} (${q.difficulty})")
        print("   Type: ${q.type}")
        print("   File: src/solutions/question_${i + 1}.py")
        print()`).join('\n        ')}

    def run_tests(self, verbose=True):
        """Run all test cases"""
        print("🧪 Running test cases...")
        print()

        cmd = ["python", "-m", "pytest", "src/tests/", "-v"]
        if verbose:
            cmd.extend(["--tb=short", "--cov=src/solutions", "--cov-report=term-missing"])

        try:
            result = subprocess.run(cmd, cwd=self.root_dir, check=False)
            if result.returncode == 0:
                print("\\n✅ All tests passed!")
                return True
            else:
                print("\\n❌ Some tests failed. Review the output above.")
                return False
        except FileNotFoundError:
            print("❌ Error: pytest not found. Install requirements first:")
            print("   pip install -r requirements.txt")
            return False

    def run_single_question(self, question_num):
        """Run tests for a specific question"""
        print(f"🧪 Running tests for Question {question_num}...")
        print()

        test_file = f"src/tests/test_solutions.py::test_question_{question_num}"
        cmd = ["python", "-m", "pytest", test_file, "-v", "--tb=short"]

        try:
            result = subprocess.run(cmd, cwd=self.root_dir, check=False)
            if result.returncode == 0:
                print(f"\\n✅ Question {question_num} tests passed!")
                return True
            else:
                print(f"\\n❌ Question {question_num} tests failed.")
                return False
        except FileNotFoundError:
            print("❌ Error: pytest not found")
            return False

    def check_code_quality(self):
        """Run code quality checks"""
        print("🔍 Checking code quality...")
        print()

        # Run flake8
        print("Running flake8...")
        subprocess.run(["flake8", "src/solutions/", "--max-line-length=100"],
                      cwd=self.root_dir, check=False)

        # Run black check
        print("\\nChecking code formatting with black...")
        subprocess.run(["black", "--check", "src/solutions/"],
                      cwd=self.root_dir, check=False)
        print()

    def show_help(self):
        """Show help menu"""
        print("Available Commands:")
        print("  python runner.py              - Show this help menu")
        print("  python runner.py test         - Run all tests")
        print("  python runner.py test <n>     - Run tests for question n")
        print("  python runner.py check        - Run code quality checks")
        print("  python runner.py questions    - List all questions")
        print()

def main():
    runner = AssessmentRunner()
    runner.print_header()

    # Check environment
    if not runner.check_environment():
        sys.exit(1)

    # Parse command line arguments
    if len(sys.argv) == 1:
        runner.show_help()
        runner.list_questions()
    elif sys.argv[1] == "test":
        if len(sys.argv) == 3:
            # Test specific question
            question_num = int(sys.argv[2])
            runner.run_single_question(question_num)
        else:
            # Test all
            runner.run_tests()
    elif sys.argv[1] == "check":
        runner.check_code_quality()
    elif sys.argv[1] == "questions":
        runner.list_questions()
    else:
        print(f"Unknown command: {sys.argv[1]}")
        runner.show_help()

if __name__ == "__main__":
    main()
`;
    }
    generatePythonRequirements(jobRole, assessmentType) {
        const base = [
            '# Core Testing Framework',
            'pytest>=7.4.0',
            'pytest-cov>=4.1.0',
            'pytest-timeout>=2.1.0',
            '',
            '# Code Quality',
            'black>=23.7.0',
            'flake8>=6.0.0',
            'mypy>=1.4.0',
            'pylint>=2.17.0',
            '',
            '# Common Utilities',
            'requests>=2.31.0',
            'python-dotenv>=1.0.0',
            ''
        ];
        if (jobRole === 'data_scientist' || assessmentType === 'data_analysis') {
            base.push('# Data Science Libraries', 'pandas>=2.0.0', 'numpy>=1.24.0', 'scikit-learn>=1.3.0', 'matplotlib>=3.7.0', 'seaborn>=0.12.0', 'jupyter>=1.0.0', 'ipykernel>=6.25.0', '');
        }
        else if (jobRole === 'backend' || jobRole === 'fullstack') {
            base.push('# Backend Development', 'fastapi>=0.100.0', 'uvicorn>=0.23.0', 'sqlalchemy>=2.0.0', 'pydantic>=2.0.0', 'alembic>=1.11.0', '');
        }
        else if (jobRole === 'frontend') {
            base.push('# Frontend Testing', 'selenium>=4.10.0', 'beautifulsoup4>=4.12.0', 'lxml>=4.9.0', '');
        }
        return base.join('\n');
    }
    generatePackageJson(jobRole, assessmentType) {
        return JSON.stringify({
            name: "coding-assessment",
            version: "1.0.0",
            type: "module",
            scripts: {
                test: "node --test",
                start: "node main.js"
            },
            dependencies: {},
            devDependencies: {
                "@types/node": "^20.0.0"
            }
        }, null, 2);
    }
    async createRuleBasedPlan(jobDescription, resumeText) {
        await this.notify('info', 'creating_rule_based_plan', 'Creating structured assessment plan based on job requirements');
        const difficulty = this.determineDifficulty(jobDescription);
        const techStack = this.extractTechStack(jobDescription);
        const jobRole = this.determineJobRole(jobDescription);
        // FIX: Only include datasets for data roles
        const requiresDatasets = ['data_scientist', 'data_analyst'].includes(jobRole);
        const plan = {
            assessment_type: this.determineAssessmentType(jobRole, difficulty),
            difficulty: difficulty,
            tech_stack: techStack,
            job_role: jobRole,
            requires_datasets: requiresDatasets,
            questions: this.generateCodingQuestions(jobRole, techStack, difficulty),
            success_criteria: [
                'All solutions pass sample test cases',
                'Code follows best practices',
                'Solutions are efficient and well-documented'
            ],
            time_estimate_minutes: this.estimateDuration(difficulty),
            tasks: []
        };
        plan.tasks = await this.generateDynamicTasks(plan);
        await this.notify('success', 'rule_based_plan_completed', undefined, undefined, { jobRole: plan.job_role });
        logger_1.Logger.info(`Rule-based plan created: ${plan.job_role}, ${plan.questions.length} questions`);
        return plan;
    }
    determineAssessmentType(jobRole, difficulty) {
        if (difficulty === 'senior')
            return 'system_design';
        if (jobRole === 'backend' || jobRole === 'fullstack')
            return 'real_world_project';
        if (difficulty === 'junior')
            return 'leetcode_algorithm';
        return 'debugging_fixit';
    }
    determineJobRole(jd) {
        const jdLower = jd.toLowerCase();
        if (jdLower.includes('data') && jdLower.includes('scientist'))
            return 'data_scientist';
        if (jdLower.includes('machine learning') || jdLower.includes('ai'))
            return 'data_scientist';
        if (jdLower.includes('backend') || jdLower.includes('api') || jdLower.includes('server'))
            return 'backend';
        if (jdLower.includes('frontend') || jdLower.includes('react') || jdLower.includes('angular'))
            return 'frontend';
        if (jdLower.includes('full stack') || jdLower.includes('full-stack'))
            return 'fullstack';
        return 'other';
    }
    generateCodingQuestions(jobRole, techStack, difficulty) {
        const questions = [];
        if (jobRole === 'data_scientist') {
            questions.push({
                id: 'question_1',
                title: 'Data Analysis and Cleaning',
                description: 'Load the Titanic dataset and perform data cleaning operations including handling missing values, data type conversions, and feature engineering.',
                type: 'python',
                difficulty: difficulty === 'senior' ? 'medium' : 'easy',
                input_format: 'CSV file path',
                output_format: 'Cleaned DataFrame and summary statistics',
                sample_input: 'datasets/titanic.csv',
                sample_output: 'Cleaned dataset with no missing values, new features created',
                constraints: ['Use pandas for data manipulation', 'Handle all missing values appropriately']
            });
            questions.push({
                id: 'question_2',
                title: 'SQL Query Analysis',
                description: 'Write SQL queries to analyze the dataset and extract meaningful insights about passenger survival rates.',
                type: 'sql',
                difficulty: difficulty === 'senior' ? 'hard' : 'medium',
                input_format: 'Database table with Titanic data',
                output_format: 'SQL query results with analysis',
                sample_input: 'SELECT * FROM passengers WHERE age > 30',
                sample_output: 'Survival rates by class, gender, and age groups',
                constraints: ['Use appropriate JOIN operations', 'Include aggregation functions']
            });
        }
        else {
            // Default coding questions for other roles
            questions.push({
                id: 'question_1',
                title: 'Algorithm Implementation',
                description: 'Implement a function that solves the given algorithmic problem efficiently.',
                type: 'python',
                difficulty: difficulty === 'senior' ? 'hard' : difficulty === 'mid' ? 'medium' : 'easy',
                input_format: 'Function parameters as specified',
                output_format: 'Expected return value',
                sample_input: 'input_data = [1, 2, 3, 4, 5]',
                sample_output: 'result = 15',
                constraints: ['Time complexity should be O(n) or better', 'Handle edge cases appropriately']
            });
            questions.push({
                id: 'question_2',
                title: 'Data Processing',
                description: 'Process the given dataset to extract and transform specific information.',
                type: 'python',
                difficulty: difficulty === 'senior' ? 'medium' : 'easy',
                input_format: 'Dataset file path',
                output_format: 'Processed data in specified format',
                sample_input: 'datasets/iris.csv',
                sample_output: 'Filtered and transformed dataset',
                constraints: ['Use efficient data processing techniques', 'Maintain data integrity']
            });
        }
        return questions;
    }
    estimateDuration(difficulty) {
        return difficulty === 'senior' ? 120 : difficulty === 'mid' ? 90 : 60;
    }
    determineDifficulty(jd) {
        const jdLower = jd.toLowerCase();
        if (jdLower.includes('senior') || jdLower.includes('lead') || jdLower.includes('principal'))
            return 'senior';
        if (jdLower.includes('mid') || jdLower.includes('experienced') || jdLower.includes('3+'))
            return 'mid';
        return 'junior';
    }
    extractTechStack(jd) {
        const techKeywords = [
            'python', 'javascript', 'typescript', 'java', 'c#', 'c++', 'go', 'rust',
            'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring',
            'sql', 'mongodb', 'postgresql', 'mysql', 'redis',
            'docker', 'kubernetes', 'aws', 'azure', 'gcp',
            'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn',
            'jest', 'pytest', 'mocha', 'junit'
        ];
        return techKeywords.filter(tech => jd.toLowerCase().includes(tech));
    }
    extractSkills(jd) {
        const skillKeywords = [
            'problem solving', 'teamwork', 'communication', 'agile', 'scrum',
            'testing', 'debugging', 'code review', 'ci/cd', 'rest api', 'microservices',
            'performance optimization', 'security', 'scalability', 'maintainability'
        ];
        return skillKeywords.filter(skill => jd.toLowerCase().includes(skill));
    }
    analyzeSkillsGap(jd, resume) {
        const jdSkills = this.extractSkills(jd);
        const resumeSkills = this.extractSkills(resume);
        const missing = jdSkills.filter(skill => !resumeSkills.includes(skill));
        const strong = resumeSkills.filter(skill => jdSkills.includes(skill));
        const recommendations = missing.map(skill => `Focus on developing ${skill} skills`);
        return { missing, strong, recommendations };
    }
    createFallbackPlan(jobDescription) {
        logger_1.Logger.warn('Using fallback coding assessment plan');
        return {
            assessment_type: 'coding',
            difficulty: 'mid',
            tech_stack: ['python', 'pandas'],
            job_role: 'data_scientist',
            required_skills: ['problem solving', 'data analysis'],
            skills_gap: {
                missing: [],
                strong: [],
                recommendations: []
            },
            questions: [
                {
                    id: 'question_1',
                    title: 'Data Analysis Task',
                    description: 'Perform basic data analysis on the provided dataset',
                    type: 'python',
                    difficulty: 'easy',
                    input_format: 'CSV file path',
                    output_format: 'Analysis results',
                    sample_input: 'datasets/iris.csv',
                    sample_output: 'Summary statistics and insights',
                    constraints: ['Use pandas for analysis', 'Provide clear outputs']
                }
            ],
            test_strategy: {
                public_tests: 3,
                private_tests: 5,
                edge_case_tests: 2
            },
            estimated_duration: 60,
            success_criteria: [
                'Solution runs without errors',
                'Analysis provides meaningful insights'
            ],
            tasks: [
                {
                    id: 'create_root',
                    type: 'create_folder',
                    path: 'coding-assessment',
                    description: 'Create assessment root directory',
                    priority: 'high',
                    dependencies: []
                },
                {
                    id: 'create_datasets',
                    type: 'create_folder',
                    path: 'coding-assessment/datasets',
                    description: 'Create datasets directory',
                    priority: 'high',
                    dependencies: ['create_root']
                },
                {
                    id: 'download_iris',
                    type: 'download_dataset',
                    path: 'coding-assessment/datasets/iris.csv',
                    description: 'Download iris dataset',
                    priority: 'medium',
                    dependencies: ['create_datasets'],
                    metadata: { dataset: 'iris' }
                }
            ]
        };
    }
}
exports.PlannerAgent = PlannerAgent;
//# sourceMappingURL=planner-agent.js.map