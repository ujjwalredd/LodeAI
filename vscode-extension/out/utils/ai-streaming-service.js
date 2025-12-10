"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIStreamingService = void 0;
const claude_client_1 = require("./claude-client");
const logger_1 = require("./logger");
class AIStreamingService {
    constructor() {
        this.claudeClient = claude_client_1.ClaudeClient.getInstance();
    }
    static getInstance() {
        if (!AIStreamingService.instance) {
            AIStreamingService.instance = new AIStreamingService();
        }
        return AIStreamingService.instance;
    }
    async generateStreamingMessage(context) {
        const systemPrompt = `You are an AI assistant that generates natural, engaging, and informative messages for a technical assessment creation platform. 

Your role is to provide dynamic, contextual responses that feel natural and helpful. Avoid generic phrases, hardcoded text, or template-like responses.

Guidelines:
- Be conversational and engaging
- Provide specific, relevant information based on the context
- Use natural language that flows well
- Avoid repetitive or robotic phrasing
- Make each response unique and contextual
- Focus on being helpful and informative

Generate a single, natural sentence or short paragraph that accurately describes what's happening in the given context.`;
        const userMessage = this.buildContextMessage(context);
        try {
            const response = await this.claudeClient.chatCompletion([
                { role: 'user', content: userMessage }
            ], systemPrompt);
            return response.content || this.getFallbackMessage(context);
        }
        catch (error) {
            logger_1.Logger.error('AI streaming message generation failed:', error);
            return this.getFallbackMessage(context);
        }
    }
    buildContextMessage(context) {
        let message = `Generate a natural, engaging message for the following scenario:\n\n`;
        message += `Agent Type: ${context.agentType}\n`;
        message += `Action: ${context.action}\n`;
        if (context.taskDescription) {
            message += `Task: ${context.taskDescription}\n`;
        }
        if (context.errorMessage) {
            message += `Error: ${context.errorMessage}\n`;
        }
        if (context.progress !== undefined) {
            message += `Progress: ${context.progress}%\n`;
        }
        if (context.additionalContext) {
            message += `Additional Context: ${JSON.stringify(context.additionalContext)}\n`;
        }
        message += `\nGenerate a single, natural message that describes what's happening in this context. Be specific and helpful.\n\nIMPORTANT: This is a RECRUITER ASSESSMENT PLATFORM - the purpose is to help recruiters test candidate skills, not to prepare candidates for interviews. Focus on evaluation and assessment creation.`;
        return message;
    }
    getFallbackMessage(context) {
        switch (context.agentType) {
            case 'planner':
                return this.getPlannerFallback(context);
            case 'executor':
                return this.getExecutorFallback(context);
            case 'error-handler':
                return this.getErrorHandlerFallback(context);
            case 'orchestrator':
                return this.getOrchestratorFallback(context);
            default:
                return 'Processing request...';
        }
    }
    getPlannerFallback(context) {
        switch (context.action) {
            case 'analyzing':
                return 'Analyzing candidate profile and job requirements to create a personalized assessment strategy';
            case 'generating_plan':
                return 'Generating tailored assessment plan based on role requirements and candidate background';
            case 'completed':
                return 'Assessment plan generated successfully with customized questions and structure';
            default:
                return 'Planning assessment structure and requirements';
        }
    }
    getExecutorFallback(context) {
        switch (context.action) {
            case 'creating_files':
                return 'Creating assessment files and project structure';
            case 'executing_tasks':
                return 'Building the assessment environment and setting up project files';
            case 'downloading_data':
                return 'Preparing datasets and resources for the assessment';
            case 'completed':
                return 'Assessment environment setup completed successfully';
            default:
                return 'Executing assessment setup tasks';
        }
    }
    getErrorHandlerFallback(context) {
        switch (context.action) {
            case 'analyzing_error':
                return 'Analyzing encountered issue to determine the best resolution approach';
            case 'applying_fix':
                return 'Applying automated fix to resolve the current issue';
            case 'retrying':
                return 'Retrying operation with improved configuration';
            case 'resolved':
                return 'Issue resolved successfully, continuing with assessment setup';
            default:
                return 'Handling encountered issues and ensuring smooth operation';
        }
    }
    getOrchestratorFallback(context) {
        switch (context.action) {
            case 'coordinating':
                return 'Coordinating all agents to create a comprehensive assessment';
            case 'monitoring':
                return 'Monitoring assessment creation progress across all components';
            case 'verifying':
                return 'Verifying assessment completeness and quality';
            case 'completed':
                return 'Assessment creation completed successfully with all components verified';
            default:
                return 'Orchestrating the assessment creation process';
        }
    }
    async generateStreamingResponse(context) {
        const systemPrompt = `You are an AI assistant that generates natural, engaging, and informative streaming responses for a technical assessment creation platform.

Generate a natural, flowing response that describes what's happening in the given context. The response should be:
- Conversational and engaging
- Specific to the current situation
- Informative and helpful
- Natural in flow and language

Provide a detailed, natural response that explains the current process or status.`;
        const userMessage = this.buildContextMessage(context);
        try {
            return await this.claudeClient.streamCompletion([
                { role: 'user', content: userMessage }
            ], systemPrompt);
        }
        catch (error) {
            logger_1.Logger.error('AI streaming response generation failed:', error);
            // Return a simple fallback stream
            return this.getFallbackStream(context);
        }
    }
    async *getFallbackStream(context) {
        const fallbackMessage = this.getFallbackMessage(context);
        const words = fallbackMessage.split(' ');
        for (const word of words) {
            yield word + ' ';
            await new Promise(resolve => setTimeout(resolve, 100)); // Simulate typing
        }
    }
}
exports.AIStreamingService = AIStreamingService;
//# sourceMappingURL=ai-streaming-service.js.map