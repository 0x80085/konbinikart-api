import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ollamaInstance: AxiosInstance;
  private readonly chatGptInstance: AxiosInstance;
  private readonly ollamaApiUrl: string;
  private readonly chatGptApiUrl: string;
  private readonly chatGptApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.ollamaApiUrl = this.configService.get<string>(
      'OLLAMA_API_URL',
      'https://api.ollama.ai',
    );
    this.chatGptApiUrl = this.configService.get<string>(
      'CHATGPT_API_URL',
      'https://api.openai.com/v1/chat/completions',
    );
    this.chatGptApiKey = this.configService.get<string>('CHATGPT_API_KEY');

    if (!this.chatGptApiKey) {
      this.logger.error('CHATGPT_API_KEY is missing in environment variables.');
      throw new Error('CHATGPT_API_KEY not set');
    }

    // Axios instance for Ollama
    this.ollamaInstance = axios.create({
      baseURL: this.ollamaApiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Axios instance for ChatGPT
    this.chatGptInstance = axios.create({
      baseURL: this.chatGptApiUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.chatGptApiKey}`,
      },
    });
  }

  /**
   * Generate a response using Ollama API.
   * @param prompt The input prompt for the Ollama model.
   */
  async generateOllamaResponse(
    prompt: string,
    model: string = 'default',
  ): Promise<string> {
    try {
      this.logger.log(`Sending request to Ollama API with prompt: "${prompt}"`);
      const response = await this.ollamaInstance.post('/generate', {
        model,
        prompt,
      });

      if (response.status === 200) {
        this.logger.log('Ollama API response received successfully');
        return response.data.response; // Assuming the result is under `response.data.response`
      }

      this.logger.warn(`Ollama API responded with status: ${response.status}`);
      throw new Error(`Ollama API returned status: ${response.status}`);
    } catch (error) {
      this.logger.error(`Error calling Ollama API: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a response using ChatGPT API.
   * @param prompt The input prompt for ChatGPT.
   */
  async generateChatGptResponse(prompt: string): Promise<string> {
    try {
      this.logger.log(
        `Sending request to ChatGPT API with prompt: "${prompt}"`,
      );
      const response = await this.chatGptInstance.post('', {
        model: 'gpt-3.5-turbo', // Default model, adjust as needed
        messages: [{ role: 'user', content: prompt }],
      });

      if (response.status === 200) {
        this.logger.log('ChatGPT API response received successfully');
        return response.data.choices[0].message.content; // Adjust based on API's actual response
      }

      this.logger.warn(`ChatGPT API responded with status: ${response.status}`);
      throw new Error(`ChatGPT API returned status: ${response.status}`);
    } catch (error) {
      this.logger.error(`Error calling ChatGPT API: ${error.message}`);
      throw error;
    }
  }
}
