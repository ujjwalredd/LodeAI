"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillDetector = void 0;
const claude_client_1 = require("./claude-client");
const logger_1 = require("./logger");
class SkillDetector {
    constructor() {
        this.claudeClient = claude_client_1.ClaudeClient.getInstance();
    }
    async analyzeJobDescription(jobDescription) {
        logger_1.Logger.info('Analyzing job description for skill requirements...');
        const systemPrompt = `You are an expert technical recruiter and assessment architect. Analyze job descriptions to identify required skills and recommend appropriate assessment environments.

Your task is to:
1. Identify primary and secondary technical skills
2. Determine appropriate tools and technologies for each skill
3. Recommend assessment environment setup
4. Suggest assessment complexity and duration

Focus on creating realistic, hands-on assessments that test actual job-relevant skills.

Common skill categories and their assessment approaches:

**Analytics & BI Tools:**
- Power BI: Webview integration with sample datasets, create dashboards/reports
- Tableau: Embedded Tableau Public, build visualizations from provided data
- Excel: Advanced formulas, pivot tables, data analysis
- SQL: Database queries, optimization, data modeling

**Development Skills:**
- Frontend: React/Vue/Angular projects with specific features
- Backend: API development, database integration, authentication
- Full-stack: Complete applications with frontend and backend
- Mobile: React Native/Flutter app development

**Data Science:**
- Python: Jupyter notebooks with real datasets
- R: Statistical analysis and visualization
- Machine Learning: Model building and evaluation
- Data Engineering: ETL pipelines, data processing

**Cloud & DevOps:**
- AWS/Azure/GCP: Infrastructure setup and management
- Docker/Kubernetes: Containerization and orchestration
- CI/CD: Pipeline setup and automation

**Database:**
- SQL: Query optimization, schema design
- NoSQL: Document/Graph database operations
- Data Modeling: ERD creation and normalization

Return ONLY valid JSON with this exact structure:
{
  "primarySkills": [
    {
      "skill": "Power BI",
      "category": "analytics",
      "priority": "high",
      "tools": ["Power BI Desktop", "Power BI Service", "Excel"],
      "assessmentType": "dashboard_creation",
      "environment": {
        "type": "webview",
        "setup": ["launch_powerbi_webview", "load_sample_datasets", "create_workspace"],
        "datasets": ["sales_data.csv", "customer_analytics.xlsx"],
        "templates": ["sales_dashboard_template.pbix"]
      }
    }
  ],
  "secondarySkills": [...],
  "recommendedEnvironment": "Power BI + SQL + Excel",
  "assessmentComplexity": "intermediate",
  "estimatedDuration": 120
}`;
        const userMessage = `Analyze this job description and create a comprehensive skill assessment plan:

JOB DESCRIPTION:
${jobDescription}

Provide detailed skill requirements with specific assessment environments and tools needed.`;
        try {
            const response = await this.claudeClient.chatCompletion([
                { role: 'user', content: userMessage }
            ], systemPrompt);
            if (!response.content) {
                throw new Error('No response from Claude skill detector');
            }
            // Extract JSON from response
            let jsonContent = response.content;
            if (jsonContent.includes('```json')) {
                const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    jsonContent = jsonMatch[1];
                }
            }
            else if (jsonContent.includes('```')) {
                const codeMatch = jsonContent.match(/```\s*([\s\S]*?)\s*```/);
                if (codeMatch) {
                    jsonContent = codeMatch[1];
                }
            }
            const analysis = JSON.parse(jsonContent);
            logger_1.Logger.info(`Skill analysis completed: ${analysis.primarySkills.length} primary skills identified`);
            return analysis;
        }
        catch (error) {
            logger_1.Logger.error('Skill detection failed:', error);
            // Return fallback analysis
            return this.getFallbackAnalysis(jobDescription);
        }
    }
    getFallbackAnalysis(jobDescription) {
        const jdLower = jobDescription.toLowerCase();
        // Simple keyword-based fallback
        const skills = [];
        if (jdLower.includes('power bi') || jdLower.includes('powerbi')) {
            skills.push({
                skill: 'Power BI',
                category: 'analytics',
                priority: 'high',
                tools: ['Power BI Desktop', 'Power BI Service'],
                assessmentType: 'dashboard_creation',
                environment: {
                    type: 'webview',
                    setup: ['launch_powerbi_webview', 'load_sample_datasets'],
                    datasets: ['sales_data.csv', 'customer_analytics.xlsx']
                }
            });
        }
        if (jdLower.includes('tableau')) {
            skills.push({
                skill: 'Tableau',
                category: 'analytics',
                priority: 'high',
                tools: ['Tableau Desktop', 'Tableau Public'],
                assessmentType: 'visualization_creation',
                environment: {
                    type: 'webview',
                    setup: ['launch_tableau_webview', 'load_sample_datasets'],
                    datasets: ['superstore_sales.csv', 'world_indicators.xlsx']
                }
            });
        }
        if (jdLower.includes('sql') || jdLower.includes('database')) {
            skills.push({
                skill: 'SQL',
                category: 'database',
                priority: 'high',
                tools: ['PostgreSQL', 'MySQL', 'SQL Server'],
                assessmentType: 'query_optimization',
                environment: {
                    type: 'docker',
                    setup: ['setup_database_container', 'load_sample_schema', 'create_test_data'],
                    datasets: ['northwind_database.sql', 'sample_queries.sql']
                }
            });
        }
        if (jdLower.includes('python') || jdLower.includes('data science')) {
            skills.push({
                skill: 'Python',
                category: 'development',
                priority: 'high',
                tools: ['Jupyter Notebook', 'Pandas', 'NumPy', 'Matplotlib'],
                assessmentType: 'data_analysis',
                environment: {
                    type: 'docker',
                    setup: ['setup_python_environment', 'install_data_science_packages', 'load_datasets'],
                    datasets: ['titanic.csv', 'iris.csv', 'housing_data.csv']
                }
            });
        }
        if (jdLower.includes('react') || jdLower.includes('frontend')) {
            skills.push({
                skill: 'React',
                category: 'development',
                priority: 'high',
                tools: ['React', 'Node.js', 'npm'],
                assessmentType: 'component_development',
                environment: {
                    type: 'docker',
                    setup: ['setup_react_environment', 'create_starter_project', 'install_dependencies'],
                    templates: ['react_assessment_template']
                }
            });
        }
        return {
            primarySkills: skills.filter(s => s.priority === 'high'),
            secondarySkills: skills.filter(s => s.priority === 'medium' || s.priority === 'low'),
            recommendedEnvironment: skills.map(s => s.skill).join(' + ') || 'General Development',
            assessmentComplexity: 'intermediate',
            estimatedDuration: skills.length * 60 + 30 // 60 minutes per skill + 30 minutes setup
        };
    }
    getAssessmentEnvironment(skill) {
        switch (skill.skill.toLowerCase()) {
            case 'power bi':
                return 'powerbi-webview';
            case 'tableau':
                return 'tableau-webview';
            case 'sql':
            case 'database':
                return 'sql-docker';
            case 'python':
                return 'python-jupyter';
            case 'react':
            case 'frontend':
                return 'react-docker';
            case 'aws':
            case 'azure':
            case 'gcp':
                return 'cloud-console';
            default:
                return 'general-docker';
        }
    }
    getRequiredTools(skills) {
        const tools = new Set();
        skills.forEach(skill => {
            skill.tools.forEach(tool => tools.add(tool));
        });
        return Array.from(tools);
    }
    getRequiredDatasets(skills) {
        const datasets = new Set();
        skills.forEach(skill => {
            if (skill.environment.datasets) {
                skill.environment.datasets.forEach(dataset => datasets.add(dataset));
            }
        });
        return Array.from(datasets);
    }
}
exports.SkillDetector = SkillDetector;
//# sourceMappingURL=skill-detector.js.map