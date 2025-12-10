import Anthropic from '@anthropic-ai/sdk';
import { Logger } from './logger';
import { Config } from './config';

export interface ClaudeMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ClaudeResponse {
    content: string;
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
}

export class ClaudeClient {
    private anthropic: Anthropic;
    private static instance: ClaudeClient;

    private constructor() {
        this.anthropic = new Anthropic({
            apiKey: Config.getInstance().getClaudeApiKey(),
        });
    }

    static getInstance(): ClaudeClient {
        if (!ClaudeClient.instance) {
            ClaudeClient.instance = new ClaudeClient();
        }
        return ClaudeClient.instance;
    }

    async chatCompletion(messages: ClaudeMessage[], systemPrompt?: string, model: string = 'claude-sonnet-4-20250514'): Promise<ClaudeResponse> {
        try {
            Logger.info(`Sending request to Claude ${model} with ${messages.length} messages (using streaming mode for large responses)`);

            // Convert messages to Anthropic format
            const anthropicMessages = messages.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
            }));

            // Use streaming mode to avoid timeout issues with large responses
            const stream = await this.anthropic.messages.create({
                model,
                max_tokens: 32000, // Increased for complete file generation with all test cases
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
                } else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                    fullContent += chunk.delta.text;
                } else if (chunk.type === 'message_delta') {
                    outputTokens = chunk.usage.output_tokens;
                }
            }

            Logger.info(`Received response from Claude: ${fullContent.length} characters`);

            return {
                content: fullContent,
                usage: {
                    input_tokens: inputTokens,
                    output_tokens: outputTokens
                }
            };
        } catch (error: any) {
            Logger.error('Claude API error:', error);
            throw new Error(`Claude API error: ${error.message}`);
        }
    }

    async streamCompletion(messages: ClaudeMessage[], systemPrompt?: string, model: string = 'claude-sonnet-4-20250514'): Promise<AsyncIterable<string>> {
        try {
            Logger.info(`Starting stream with Claude ${model}`);
            
            const anthropicMessages = messages.map(msg => ({
                role: msg.role as 'user' | 'assistant',
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
        } catch (error: any) {
            Logger.error('Claude streaming error:', error);
            throw new Error(`Claude streaming error: ${error.message}`);
        }
    }

    private async *processStream(stream: any): AsyncIterable<string> {
        for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                yield chunk.delta.text;
            }
        }
    }
}
