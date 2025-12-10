export type AssessmentType = 
    | 'algorithmic' 
    | 'applied' 
    | 'debugging' 
    | 'data_science' 
    | 'system_design' 
    | 'frontend' 
    | 'backend' 
    | 'fullstack'
    | 'coding'
    | 'leetcode_algorithm'
    | 'debugging_fixit'
    | 'code_review'
    | 'real_world_project'
    | 'pair_programming';

export type DifficultyLevel = 'junior' | 'mid' | 'senior';

export interface PlanTask {
    id: string;
    type: 'create_folder' | 'create_file' | 'run_command' | 'assessment_question' | 'download_dataset' | 'setup_environment' | 'install_dependencies' | 'create_virtual_env' | 'run_validation' | 'generate_dataset' | 'synthetic_dataset';
    path?: string;
    content?: string;
    command?: string;
    cwd?: string;
    description: string;
    priority?: 'high' | 'medium' | 'low';
    dependencies?: string[];
    metadata?: Record<string, any>;
}

export interface CodingQuestion {
    id: string;
    title: string;
    description: string;
    type: 'python' | 'sql' | 'algorithm' | 'system_design' | 'debugging' | 'review' | 'project';
    difficulty: 'easy' | 'medium' | 'hard';
    input_format: string;
    output_format: string;
    sample_input: string;
    sample_output: string;
    sample_explanation?: string;
    constraints: string[];
    function_signature?: string;
    hidden_test_description?: string;
    hints?: string[];
    optimal_approach?: string;
}

export interface ProjectStructure {
    assessment_type: string;
    root_files: string[];
    folders: Record<string, string[]>;
    setup_commands: string[];
}

export interface AssessmentPlan {
    assessment_type: AssessmentType;
    difficulty: DifficultyLevel;
    tech_stack: string[];
    required_skills?: string[];
    job_role?: string;
    requires_datasets?: boolean;
    skills_gap?: { 
        missing: string[]; 
        strong: string[];
        recommendations: string[];
    };
    questions: CodingQuestion[] | string[];
    tasks: PlanTask[];
    project_structure?: ProjectStructure;
    test_strategy?: {
        unit_tests?: number;
        integration_tests?: number;
        hidden_tests?: number;
        performance_tests?: number;
        public_tests?: number;
        private_tests?: number;
        edge_case_tests?: number;
    };
    estimated_duration?: number; // in minutes
    time_estimate_minutes?: number; // in minutes
    success_criteria?: string[];
    hints_available?: boolean;
}

export interface ExecutionResult {
    success: boolean;
    output?: string;
    error?: string;
    task: PlanTask;
    duration?: number;
}

export interface ErrorResolution {
    fixed: boolean;
    retry_command?: string;
    alternative_approach?: string;
    error_analysis: string;
    recommendations: string[];
}

export interface TestPlan {
    id: string;
    assignment: string;
    required_files: string[];
    dependencies: string[];
    instructions: string;
    job_descriptions: {
        title: string;
        description: string;
        requirements: string[];
    };
}

export interface CandidateAssignment {
    id: string;
    test_plan_id: string;
    candidate_email: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    resume_text?: string;
    created_at: string;
    test_plans: TestPlan;
}

export interface AgentMessage {
    type: 'agentMessage';
    payload: {
        agent: string;
        level: 'info' | 'success' | 'warning' | 'error' | 'execute' | 'verify' | 'plan';
        content: string;
        timestamp: Date;
        progress?: number;
    };
}