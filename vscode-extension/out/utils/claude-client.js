"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeClient = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const logger_1 = require("./logger");
const config_1 = require("./config");
class ClaudeClient {
    constructor() {
        this.anthropic = new sdk_1.default({
            apiKey: config_1.Config.getInstance().getClaudeApiKey(),
        });
    }
    static getInstance() {
        if (!ClaudeClient.instance) {
            ClaudeClient.instance = new ClaudeClient();
        }
        return ClaudeClient.instance;
    }
    async chatCompletion(messages, systemPrompt, model = 'claude-sonnet-4-20250514') {
        try {
            logger_1.Logger.info(`Sending request to Claude ${model} with ${messages.length} messages (using streaming mode for large responses)`);
            // Convert messages to Anthropic format
            const anthropicMessages = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            // Use streaming mode to avoid timeout issues with large responses
            const stream = await this.anthropic.messages.create({
                model,
                max_tokens: 32000,
                system: systemPrompt,
                messages: anthropicMessages,
                temperature: 0.7,
                stream: true
            });
            // Collect the full response from stream
            let fullContent = '';
            let inputTokens = 0;
            let outputTokens = 0;
            for await (const chunk of stream) {
                if (chunk.type === 'message_start') {
                    inputTokens = chunk.message.usage.input_tokens;
                }
                else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                    fullContent += chunk.delta.text;
                }
                else if (chunk.type === 'message_delta') {
                    outputTokens = chunk.usage.output_tokens;
                }
            }
            logger_1.Logger.info(`Received response from Claude: ${fullContent.length} characters`);
            return {
                content: fullContent,
                usage: {
                    input_tokens: inputTokens,
                    output_tokens: outputTokens
                }
            };
        }
        catch (error) {
            logger_1.Logger.error('Claude API error:', error);
            throw new Error(`Claude API error: ${error.message}`);
        }
    }
    async streamCompletion(messages, systemPrompt, model = 'claude-sonnet-4-20250514') {
        try {
            logger_1.Logger.info(`Starting stream with Claude ${model}`);
            const anthropicMessages = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            const stream = await this.anthropic.messages.create({
                model,
                max_tokens: 4000,
                system: systemPrompt,
                messages: anthropicMessages,
                temperature: 0.7,
                stream: true
            });
            return this.processStream(stream);
        }
        catch (error) {
            logger_1.Logger.error('Claude streaming error:', error);
            throw new Error(`Claude streaming error: ${error.message}`);
        }
    }
    async *processStream(stream) {
        for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                yield chunk.delta.text;
            }
        }
    }
}
exports.ClaudeClient = ClaudeClient;
//# sourceMappingURL=claude-client.js.map