"use strict";
/**
 * Mock Assessment Data for Testing
 * Use this to test the environment setup and UI integration without AI generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestAssessmentData = void 0;
class TestAssessmentData {
    /**
     * Get a sample Python assessment plan for testing
     */
    static getSamplePythonAssessment() {
        const questions = [
            {
                id: 'test_question_1',
                title: 'Two Sum Problem',
                type: 'algorithm',
                description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
                difficulty: 'easy',
                input_format: 'nums: List[int], target: int',
                output_format: 'List[int] - indices of the two numbers',
                sample_input: 'nums = [2,7,11,15], target = 9',
                sample_output: '[0,1]',
                sample_explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
                constraints: [
                    '2 <= nums.length <= 10^4',
                    '-10^9 <= nums[i] <= 10^9',
                    '-10^9 <= target <= 10^9',
                    'Only one valid answer exists'
                ],
                function_signature: 'def twoSum(nums: List[int], target: int) -> List[int]:',
                hidden_test_description: 'Tests include: empty arrays, single element, negative numbers, large inputs up to 10^4 elements',
                hints: [
                    'Use a hash map to store numbers and their indices as you iterate',
                    'For each number, check if target - current_number exists in the map',
                    'This gives O(n) time complexity instead of O(n^2)'
                ],
                optimal_approach: 'O(n) time complexity using hash map, O(n) space complexity',
                business_context: 'Array manipulation is fundamental for data processing pipelines',
                skills_tested: ['arrays', 'hash_maps', 'algorithm_optimization']
            }
        ];
        return {
            assessment_type: 'leetcode_algorithm',
            difficulty: 'mid',
            tech_stack: ['python', 'pytest'],
            job_role: 'backend',
            requires_datasets: false,
            time_estimate_minutes: 60,
            analysis_summary: {
                role_requirements: ['Problem solving', 'Algorithm knowledge', 'Python proficiency'],
                skills_to_test: ['Data structures', 'Algorithm optimization', 'Code quality'],
                assessment_strategy: 'Test fundamental algorithm skills with a classic problem'
            },
            questions: questions,
            project_structure: {
                assessment_type: 'leetcode_algorithm',
                root_files: ['README.md', 'requirements.txt', 'runner.py'],
                folders: {
                    'src/solutions': ['question_1.py'],
                    'src/tests': ['test_solutions.py'],
                    'problem_statements': ['question_1.md']
                },
                environment_setup: {
                    python_version: '3.9+',
                    virtual_env: true,
                    setup_commands: [
                        'python -m venv assessment_env',
                        'source assessment_env/bin/activate',
                        'pip install -r requirements.txt'
                    ]
                },
                setup_commands: [
                    'source assessment_env/bin/activate',
                    'pip install -r requirements.txt',
                    'python runner.py test'
                ],
                validation_commands: [
                    'python -m pytest src/tests/ -v',
                    'python runner.py test'
                ]
            },
            tasks: [],
            success_criteria: [
                'All tests pass',
                'Code follows PEP 8',
                'Solution is optimal (O(n) time)'
            ],
            hints_available: true,
            auto_fix_enabled: false,
            environment_automation: true
        };
    }
    /**
     * Get a sample JavaScript/React assessment for testing
     */
    static getSampleFrontendAssessment() {
        const questions = [
            {
                id: 'test_question_1',
                title: 'Todo List Component',
                type: 'component',
                description: 'Create a React Todo List component with add, delete, and toggle complete functionality. The component should maintain state and render the list of todos.',
                difficulty: 'easy',
                input_format: 'React component with state management',
                output_format: 'Functional Todo List with CRUD operations',
                sample_input: 'User adds "Buy groceries", marks it complete, then deletes it',
                sample_output: 'Component updates UI accordingly with proper state management',
                sample_explanation: 'Component should use React hooks (useState) to manage todo items',
                constraints: [
                    'Must use functional components',
                    'Must use React hooks',
                    'Should have proper prop types or TypeScript',
                    'Must include basic styling'
                ],
                function_signature: 'function TodoList() { ... }',
                hidden_test_description: 'Tests check component rendering, state updates, and event handling',
                hints: [
                    'Use useState for managing the todo list array',
                    'Each todo should have an id, text, and completed status',
                    'Use map() to render the list of todos'
                ],
                optimal_approach: 'Functional component with useState hook and proper event handlers',
                business_context: 'CRUD operations are fundamental to most web applications',
                skills_tested: ['React', 'State management', 'Event handling', 'Component design']
            }
        ];
        return {
            assessment_type: 'real_world_project',
            difficulty: 'mid',
            tech_stack: ['react', 'javascript', 'jest'],
            job_role: 'frontend',
            requires_datasets: false,
            time_estimate_minutes: 90,
            analysis_summary: {
                role_requirements: ['React expertise', 'State management', 'Component design'],
                skills_to_test: ['React hooks', 'Event handling', 'UI/UX implementation'],
                assessment_strategy: 'Build a practical component to test React fundamentals'
            },
            questions: questions,
            project_structure: {
                assessment_type: 'real_world_project',
                root_files: ['README.md', 'package.json'],
                folders: {
                    'src/components': ['TodoList.js', 'TodoItem.js'],
                    'src/tests': ['TodoList.test.js'],
                    'src/styles': ['TodoList.css']
                },
                environment_setup: {
                    python_version: undefined,
                    virtual_env: false,
                    setup_commands: [
                        'npm install',
                        'npm test'
                    ]
                },
                setup_commands: [
                    'npm install',
                    'npm start'
                ],
                validation_commands: [
                    'npm test',
                    'npm run lint'
                ]
            },
            tasks: [],
            success_criteria: [
                'All tests pass',
                'Component renders correctly',
                'State updates work properly'
            ],
            hints_available: true,
            auto_fix_enabled: false,
            environment_automation: true
        };
    }
    /**
     * Get a sample Data Science assessment for testing
     */
    static getSampleDataScienceAssessment() {
        const questions = [
            {
                id: 'test_question_1',
                title: 'Customer Churn Analysis',
                type: 'data_analysis',
                description: 'Analyze customer data to predict churn. Load the dataset, perform exploratory data analysis, create visualizations, and build a simple prediction model.',
                difficulty: 'medium',
                input_format: 'CSV file with customer data (age, tenure, monthly_charges, etc.)',
                output_format: 'Analysis notebook with insights and predictions',
                sample_input: 'customers.csv with 1000 rows',
                sample_output: 'Jupyter notebook with EDA, visualizations, and model with >70% accuracy',
                sample_explanation: 'Use pandas for data manipulation, matplotlib/seaborn for visualization, sklearn for modeling',
                constraints: [
                    'Must handle missing values',
                    'Must include at least 3 visualizations',
                    'Model accuracy should be >70%',
                    'Code should be well-documented'
                ],
                function_signature: 'def predict_churn(customer_data: pd.DataFrame) -> np.array:',
                hidden_test_description: 'Tests check data preprocessing, feature engineering, and model performance',
                hints: [
                    'Check for missing values and outliers first',
                    'Create correlation heatmap to identify important features',
                    'Try logistic regression or random forest for classification'
                ],
                optimal_approach: 'Systematic EDA -> Feature engineering -> Model training -> Evaluation',
                business_context: 'Churn prediction helps businesses retain customers and reduce costs',
                skills_tested: ['Data analysis', 'Visualization', 'Machine learning', 'Pandas', 'Sklearn']
            }
        ];
        return {
            assessment_type: 'data_analysis',
            difficulty: 'senior',
            tech_stack: ['python', 'pandas', 'scikit-learn', 'jupyter'],
            job_role: 'data_scientist',
            requires_datasets: true,
            time_estimate_minutes: 120,
            analysis_summary: {
                role_requirements: ['Data analysis', 'ML modeling', 'Visualization'],
                skills_to_test: ['Pandas', 'Sklearn', 'Statistical analysis'],
                assessment_strategy: 'Real-world data analysis scenario'
            },
            questions: questions,
            project_structure: {
                assessment_type: 'data_analysis',
                root_files: ['README.md', 'requirements.txt', 'runner.py'],
                folders: {
                    'notebooks': ['analysis_1.ipynb'],
                    'src/analysis': ['question_1.py'],
                    'data': ['sample_data.csv'],
                    'src/tests': ['test_analysis.py']
                },
                environment_setup: {
                    python_version: '3.9+',
                    virtual_env: true,
                    setup_commands: [
                        'python -m venv assessment_env',
                        'source assessment_env/bin/activate',
                        'pip install -r requirements.txt',
                        'jupyter notebook'
                    ]
                },
                setup_commands: [
                    'source assessment_env/bin/activate',
                    'pip install -r requirements.txt'
                ],
                validation_commands: [
                    'python -m pytest src/tests/ -v'
                ]
            },
            tasks: [],
            success_criteria: [
                'EDA completed with insights',
                'At least 3 quality visualizations',
                'Model accuracy >70%',
                'Code is well-documented'
            ],
            hints_available: true,
            auto_fix_enabled: false,
            environment_automation: true
        };
    }
    /**
     * Get assessment by type
     */
    static getAssessmentByType(type) {
        switch (type) {
            case 'python':
                return this.getSamplePythonAssessment();
            case 'frontend':
                return this.getSampleFrontendAssessment();
            case 'data_science':
                return this.getSampleDataScienceAssessment();
            default:
                return this.getSamplePythonAssessment();
        }
    }
}
exports.TestAssessmentData = TestAssessmentData;
//# sourceMappingURL=test-assessment-data.js.map