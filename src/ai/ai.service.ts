import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { HfInference, TranslationOutput } from '@huggingface/inference';

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
  private readonly ollamaApiUrl: string;

  private readonly chatGptInstance: AxiosInstance;
  private readonly chatGptApiUrl: string;
  private readonly chatGptApiKey: string;

  private readonly huggingfaceModel: string;
  private readonly huggingfaceInference: HfInference;

  constructor(private readonly configService: ConfigService) {
    // Ollama
    this.ollamaApiUrl = this.configService.get<string>(
      'OLLAMA_API_URL',
      'https://api.ollama.ai',
    );

    // OpenAI
    this.chatGptApiUrl = this.configService.get<string>(
      'CHATGPT_API_URL',
      'https://api.openai.com/v1/chat/completions',
    );
    this.chatGptApiKey = this.configService.get<string>('CHATGPT_API_KEY');
    if (!this.chatGptApiKey) {
      this.logger.error('CHATGPT_API_KEY is missing in environment variables.');
      throw new Error('CHATGPT_API_KEY not set');
    }

    // Huggingface
    this.huggingfaceModel = this.configService.get<string>(
      'HUGGINGFACE_MODEL',
      'EleutherAI/gpt-neo-2.7B',
    );
    const huggingFaceApiKey = this.configService.get<string>(
      'HUGGINGFACE_API_KEY',
      '',
    );

    this.huggingfaceInference = new HfInference(huggingFaceApiKey);

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
   * Translate text using huggingface model.
   * @param text The text to translate.
   */
  async translateWithHuggingface(text: string): Promise<string> {
    try {
      this.logger.log(
        `Translating text with [${this.huggingfaceModel}]: "${text}"`,
      );

      const result = await this.huggingfaceInference.translation({
        model: this.huggingfaceModel,
        inputs: text,
      });
      return this.extractTranslation(result);
    } catch (error) {
      console.log(error);

      this.logger.error(
        `Error during translation with [${this.huggingfaceModel}]: ${error.message}`,
      );
      throw error;
    }
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
      this.logger.warn(`ChatGPT API responded with status: ${response.data}`);
      throw new Error(`ChatGPT API returned status: ${response.status}`);
    } catch (error) {
      this.logger.error(`Error calling ChatGPT API: ${error.message}`);
      console.log(error);

      throw error;
    }
  }

  /**
   * Extract the translated text from the response.
   * Handles both single and array cases.
   */
  private extractTranslation(result: TranslationOutput): string {
    console.log(result);

    if (Array.isArray(result)) {
      // If the result is an array, return the translation_text from the first object
      return result[0]?.translation_text || 'Translation failed';
    }

    // If the result is a single object, return its translation_text
    return result.translation_text || 'Translation failed';
  }
}
