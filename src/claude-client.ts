import Anthropic from '@anthropic-ai/sdk';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { VertexAI } from '@google-cloud/vertexai';

export interface ClaudeClientConfig {
  anthropicApiKey?: string;
  useBedrock?: boolean;
  useVertex?: boolean;
  bedrockRegion?: string;
  vertexProjectId?: string;
  vertexRegion?: string;
  model: string;
}

export interface ClaudeResponse {
  content: string;
}

export abstract class ClaudeClient {
  protected model: string;

  constructor(model: string) {
    this.model = model;
  }

  abstract generateResponse(prompt: string): Promise<ClaudeResponse>;
}

class AnthropicClaudeClient extends ClaudeClient {
  private client: Anthropic;

  constructor(apiKey: string, model: string) {
    super(model);
    this.client = new Anthropic({
      apiKey
    });
  }

  async generateResponse(prompt: string): Promise<ClaudeResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return { content: content.text };
      }
      
      throw new Error('Unexpected response type from Claude');
    } catch (error) {
      throw new Error(`Failed to generate Claude response: ${error}`);
    }
  }
}

class BedrockClaudeClient extends ClaudeClient {
  private client: BedrockRuntimeClient;

  constructor(region: string, model: string) {
    super(model);
    this.client = new BedrockRuntimeClient({ region });
  }

  async generateResponse(prompt: string): Promise<ClaudeResponse> {
    try {
      const command = new InvokeModelCommand({
        modelId: this.model,
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      if (responseBody.content && responseBody.content[0] && responseBody.content[0].text) {
        return { content: responseBody.content[0].text };
      }
      
      throw new Error('Unexpected response format from Bedrock');
    } catch (error) {
      throw new Error(`Failed to generate Bedrock response: ${error}`);
    }
  }
}

class VertexClaudeClient extends ClaudeClient {
  private vertexAI: VertexAI;

  constructor(projectId: string, region: string, model: string) {
    super(model);
    this.vertexAI = new VertexAI({
      project: projectId,
      location: region
    });
  }

  async generateResponse(prompt: string): Promise<ClaudeResponse> {
    try {
      const generativeModel = this.vertexAI.getGenerativeModel({
        model: this.model
      });

      const response = await generativeModel.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }]
      });

      const content = response.response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        return { content };
      }
      
      throw new Error('No content in Vertex AI response');
    } catch (error) {
      throw new Error(`Failed to generate Vertex AI response: ${error}`);
    }
  }
}

export async function createClaudeClient(config: ClaudeClientConfig): Promise<ClaudeClient> {
  if (config.useBedrock) {
    return new BedrockClaudeClient(config.bedrockRegion || 'us-east-1', config.model);
  }
  
  if (config.useVertex) {
    if (!config.vertexProjectId) {
      throw new Error('Vertex AI project ID is required when using Vertex AI');
    }
    return new VertexClaudeClient(
      config.vertexProjectId, 
      config.vertexRegion || 'us-central1', 
      config.model
    );
  }
  
  if (!config.anthropicApiKey) {
    throw new Error('Anthropic API key is required when not using Bedrock or Vertex AI');
  }
  
  return new AnthropicClaudeClient(config.anthropicApiKey, config.model);
}