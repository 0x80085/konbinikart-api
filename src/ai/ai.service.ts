import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

export interface GroceryItem {
  id: string;
  emoji: string;
  nameEnglish: string;
  nameKatakana: string;
  nameHiragana: string;
  nameRomaji: string;
}

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
    model: string = 'phi',
  ): Promise<string> {
    try {
      const command = {
        model,
        prompt: prompt,
        stream: false,
      };

      this.logger.log(`Sending request to Ollama API with prompt: "${prompt}"`);
      const response = await this.ollamaInstance.post('/generate', command);

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

  async generateChatGptResponseWithFunctionCall(
    prompt: string,
  ): Promise<GroceryItem[]> {
    try {
      this.logger.log(
        `Sending request to ChatGPT API with prompt: "${prompt}"`,
      );

      const functions = [
        {
          name: 'generateGroceryItems',
          description: 'Generate a list of grocery items in JSON format.',
          parameters: {
            type: 'object',
            properties: {
              count: { type: 'integer' }, // The number of items to generate
            },
            required: ['count'], // Ensure `count` is passed
          },
        },
      ];

      const response = await this.chatGptInstance.post(
        '',
        {
          model: 'gpt-4', // Ensure you're using GPT-4 with function calling support
          messages: [{ role: 'user', content: prompt }],
          functions: functions, // Here, we specify the functions that GPT can invoke
          function_call: 'auto', // Allow GPT to choose when to invoke the function
        },
        {
          headers: {
            Authorization: `Bearer ${this.chatGptApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.status === 200) {
        this.logger.log('ChatGPT API response received successfully');

        // Parse the response, which should contain the function_call arguments
        const functionResponse =
          response.data.choices[0].message.function_call.arguments;

        // Ensure the response is a valid array of GroceryItem objects
        const groceryItems: GroceryItem[] = JSON.parse(functionResponse);

        return groceryItems;
      }

      this.logger.warn(`ChatGPT API responded with status: ${response.status}`);
      throw new Error(`ChatGPT API returned status: ${response.status}`);
    } catch (error) {
      this.logger.error(`Error calling ChatGPT API: ${error.message}`);
      throw error;
    }
  }
}
