import { InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toHiragana, toKatakana, toRomaji } from 'wanakana';
import { AiService, GroceryItem } from '../services/ai.service';
import { convertKanjiToHiragana, extractTextResponse } from './utils';

export interface GroceryItemWithDetails extends GroceryItem {
  explanation: string;
  originalAiTranslation: string;
}

export class AiTranslationCommand {
  inputText: string;

  constructor(input: string) {
    this.inputText = input;
  }
}

export class AiTranslationHandler {
  private readonly logger = new Logger(AiTranslationHandler.name);

  private huggingfaceTextGenModel: string;

  constructor(
    private aiService: AiService,
    private config: ConfigService,
  ) {
    this.huggingfaceTextGenModel = this.config.get<string>(
      'HUGGINGFACE_TEXTGEN_MODEL',
      'mistralai/Mistral-Nemo-Instruct-2407',
    );
  }
  async execute({
    inputText,
  }: AiTranslationCommand): Promise<GroceryItemWithDetails> {
    this.logger.debug('Translation requested for: ' + inputText);

    const response: GroceryItemWithDetails = {
      emoji: null,
      id: null,
      nameEnglish: inputText,
      nameHiragana: null,
      nameKatakana: null,
      nameRomaji: null,
      explanation: null,
      originalAiTranslation: null,
    };

    try {
      const aiTranslation =
        await this.aiService.translateWithHuggingface(inputText);

      response.originalAiTranslation = aiTranslation;

      const converted = (await convertKanjiToHiragana(aiTranslation)) as string;

      response.nameHiragana = toHiragana(converted);
      response.nameKatakana = toKatakana(converted);
      response.nameRomaji = toRomaji(converted);

      const explanation = await this.getExplanation(aiTranslation);
      response.explanation = explanation;

      const isValidAIReply = function name(value: string) {
        return (
          !value.includes('[') &&
          !value.includes(']') &&
          value.trim().length != 0
        );
      };

      if (!isValidAIReply(explanation)) {
        this.logger.warn(
          `Unacceptable output try 1, retrying explanation gen: ${explanation} `,
        );

        response.explanation = await this.getExplanation(aiTranslation);

        if (!isValidAIReply(response.explanation)) {
          this.logger.error(
            `Unacceptable output try 2 : ${response.explanation} `,
          );
          const errorBody = {
            ...response,
            error: 'Explanation generation failed',
          };
          throw new InternalServerErrorException(errorBody);
        }
      }

      response.emoji = await this.getEmoji(aiTranslation);

      if (!isValidAIReply(response.emoji)) {
        this.logger.warn(
          `Unacceptable output, retrying emoji gen: ${response.emoji} `,
        );
        // allow 2 tries
        response.emoji = await this.getEmoji(aiTranslation);
      }
      this.logger.warn(`Settling on emoji: ${response.emoji} `);

      this.logger.debug('Successfully translated!');

      return response;
    } catch (error) {
      console.log(error);
      const errorBody = {
        ...response,
        error: error?.message || 'Unknown error',
      };
      throw new InternalServerErrorException(errorBody);
    }
  }

  private async getExplanation(inputText: string) {
    this.logger.debug('Generating explanation for ', inputText);
    const explanationReponse =
      await this.aiService.generateTextWithWithHuggingface(
        `you will receive a japanese text and must explain what the definition is.
        You must reply in the english language.
        You must explain whether this is a traditional translation or more current. 
        You must explain whether the word is bastardized from other languages.
        In case there are more popular japanese variants of the word, also mention them in japanese and preferably write them both in hiragana and romaji.
        
        format the response in the following way:

        ##start response## 
        [your explanation]
        ##end response##
        
        Now explain this text in detail, give the definition of the word or words:
        "${inputText}"
    `,
        this.huggingfaceTextGenModel,
      );

    const explanation = extractTextResponse(explanationReponse, this.logger);
    return explanation;
  }

  private async getEmoji(inputText: string) {
    this.logger.debug('Generating emoji for ', inputText);

    const explanationReponse =
      await this.aiService.generateTextWithWithHuggingface(
        `You will receive a japanese text and must return exactly one correspoding meoji.
        Format the response in the following way:

        ##start response## 
        [your emoji]
        ##end response##
        
        Now return the emoji relating to this text:
        "${inputText}"
    `,
        this.huggingfaceTextGenModel,
      );

    const explanation = extractTextResponse(explanationReponse, this.logger);
    return explanation;
  }
}
