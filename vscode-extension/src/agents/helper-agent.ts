import { ClaudeClient, ClaudeMessage } from '../utils/claude-client';
import { Logger } from '../utils/logger';

/**
 * Helper Agent - Provides AI-powered assistance with project structure, file finding, and assignment clarification
 * This agent uses Claude AI to provide intelligent responses while staying within scope
 */

export class HelperAgent {
    private static claudeClient: ClaudeClient;
    private static systemPrompt: string = `You are a helpful assistant for candidates working on coding assessments. Your role is STRICTLY LIMITED to helping with:

1. **Project Structure Understanding**: Help candidates understand folder organization, file structure, and project layout
2. **File Finding**: Assist in locating specific files, components, or resources within the project
3. **Assignment Clarification**: Help candidates understand assignment requirements, objectives, and deliverables
4. **Navigation Help**: Guide candidates through the codebase and explain how different parts connect

**IMPORTANT LIMITATIONS:**
- You MUST NOT write code or solve technical problems
- You MUST NOT provide solutions to coding challenges
- You MUST NOT debug or fix errors
- You MUST NOT implement features or functionality
- You MUST NOT provide direct answers to assessment questions

**Your responses should:**
- Be helpful and encouraging
- Focus on understanding and navigation
- Provide guidance on where to look for information
- Explain concepts without giving away solutions
- Stay within the scope of project structure, file finding, and assignment clarification

If asked about anything outside your scope, politely redirect to project structure, file finding, or assignment questions.`;

    /**
     * Initialize the Claude client
     */
    private static initializeClaude(): void {
        if (!HelperAgent.claudeClient) {
            HelperAgent.claudeClient = ClaudeClient.getInstance();
        }
    }

    /**
     * Get a response from the helper agent using Claude AI
     * @param userMessage The user's message
     * @returns A helpful response focused on project structure, file finding, or assignment clarification
     */
    static async getResponse(userMessage: string): Promise<string> {
        try {
            HelperAgent.initializeClaude();
            
            const messages: ClaudeMessage[] = [
                {
                    role: 'user',
                    content: userMessage
                }
            ];

            Logger.info(`Helper Agent: Processing user message: ${userMessage.substring(0, 100)}...`);
            
            const response = await HelperAgent.claudeClient.chatCompletion(
                messages, 
                HelperAgent.systemPrompt,
                'claude-3-5-sonnet-20241022' // Use a faster model for helper responses
            );

            Logger.info(`Helper Agent: Generated response (${response.content.length} characters)`);
            return response.content;
            
        } catch (error) {
            Logger.error('Helper Agent Claude error:', error);
            // Fallback to a simple response if Claude fails
            return 'I apologize, but I\'m having trouble connecting to my AI assistant right now. Please try asking about project structure, file locations, or assignment requirements in a different way.';
        }
    }

    /**
     * Get a welcome message for the helper agent
     * @returns A welcome message explaining the agent's capabilities
     */
    static getWelcomeMessage(): string {
        return 'Welcome! I\'m your AI assistant here to help you understand the project structure, find files, and clarify questions about your assignment. What would you like to know?';
    }

    /**
     * Check if a message is asking for help within the agent's scope
     * @param message The user's message
     * @returns True if the message is within the agent's scope
     */
    static isWithinScope(message: string): boolean {
        const lowerMessage = message.toLowerCase();
        return lowerMessage.includes('project') || 
               lowerMessage.includes('structure') || 
               lowerMessage.includes('file') || 
               lowerMessage.includes('folder') || 
               lowerMessage.includes('directory') || 
               lowerMessage.includes('find') || 
               lowerMessage.includes('where') || 
               lowerMessage.includes('locate') || 
               lowerMessage.includes('assignment') || 
               lowerMessage.includes('task') || 
               lowerMessage.includes('requirement') || 
               lowerMessage.includes('help') || 
               lowerMessage.includes('understand') || 
               lowerMessage.includes('explain') ||
               lowerMessage.includes('navigate') ||
               lowerMessage.includes('codebase');
    }
}
