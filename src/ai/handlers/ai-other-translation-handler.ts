import { InternalServerErrorException, Logger } from '@nestjs/common';
import { AiService } from '../services/ai.service';
import { extractTextResponse } from './utils';
import { ApiProperty } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

export class TranslatedItemWithDetails {
  @ApiProperty({ example: '🤷‍♂️', description: 'A visual hint' })
  emoji: string;

  @ApiProperty({ example: 'Fish sauce', description: 'The prompt' })
  nameEnglish: string;

  @ApiProperty({
    example: 'Fish sauce is sauce made of fish things',
    description: 'The explanation of the translation',
  })
  explanation: string;

  @ApiProperty({
    example: 'Sauce de poisson',
    description: 'The translation for the prompt',
  })
  originalAiTranslation: string;
}

export class AiOtherTranslationCommand {
  inputText: string;
  targetLang: string;

  constructor(input: string, targetLang: string) {
    this.inputText = input;
    this.targetLang = targetLang;
  }
}

export class AiOtherTranslationHandler {
  private readonly logger = new Logger(AiOtherTranslationHandler.name);

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
    targetLang,
  }: AiOtherTranslationCommand): Promise<TranslatedItemWithDetails> {
    this.logger.debug('Translation requested for: ' + inputText);

    const response: TranslatedItemWithDetails = {
      emoji: null,
      nameEnglish: inputText,
      explanation: null,
      originalAiTranslation: null,
    };

    try {
      const aiTranslation =
        await this.aiService.translateToOtherWithHuggingfaceHelsinkiNLP(
          inputText,
          'en',
          targetLang,
        );

      response.originalAiTranslation = aiTranslation;

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
        `you will receive a text and must explain the definition of teh word.
        You must reply in the English language.
        You must explain whether this is a traditional translation or more current. 
        You must explain whether the word is bastardized from other languages.
        In case there are more popular variants of the word, also mention it.
        
        Format the response in the following way:

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
        `You will receive a text and must return exactly one correspoding meoji.
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
