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

      const converted = (await this.convertKanji(aiTranslation)) as string;
      response.nameHiragana = toHiragana(converted);

      const katakana = toKatakana(converted);
      response.nameKatakana = katakana;

      const romaji = toRomaji(converted);
      response.nameRomaji = romaji;

      this.logger.debug('Generating explanation for ', aiTranslation);

      const explanation = await this.getExplanation(aiTranslation);
      response.explanation = explanation;

      const isValidExplanation = function name(value: string) {
        return (
          !value.includes('[') &&
          !value.includes(']') &&
          value.trim().length != 0
        );
      };

      if (!isValidExplanation(explanation)) {
        response.explanation = await this.getExplanation(aiTranslation);

        if (!isValidExplanation(response.explanation)) {
          const errorBody = {
            ...response,
            error: 'Explanation generation failed',
          };
          throw new InternalServerErrorException(errorBody);
        }
      }

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

  private async convertKanji(reply: string) {
    return await convertKanjiToHiragana(reply);
  }

  private async getExplanation(inputText: string) {
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
        
        New explain this text in detail, give the definition of the word or words:
        "${inputText}"
    `,
        this.huggingfaceTextGenModel,
      );

    const explanation = extractTextResponse(explanationReponse, this.logger);
    return explanation;
  }
}
