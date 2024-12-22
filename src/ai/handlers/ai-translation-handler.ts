import { InternalServerErrorException, Logger } from '@nestjs/common';
import {
  isHiragana,
  isKatakana,
  toHiragana,
  toKatakana,
  toRomaji,
} from 'wanakana';
import { AiService, GroceryItem } from '../services/ai.service';
import { ConfigService } from '@nestjs/config';
import { extractTextResponse } from './utils';

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

      const hiragana = await this.getHiragana(aiTranslation);
      response.nameHiragana = hiragana;

      const katakana = toKatakana(hiragana);
      response.nameKatakana = katakana;

      const romaji = toRomaji(hiragana);
      response.nameRomaji = romaji;

      this.logger.debug('Generating explanation for ', aiTranslation);

      const explanation = await this.getExplanation(aiTranslation);

      this.logger.debug('Successfully translated!');

      return {
        emoji: null,
        id: null,
        nameEnglish: inputText,
        nameHiragana: hiragana,
        nameKatakana: katakana,
        nameRomaji: romaji,
        explanation,
        originalAiTranslation: aiTranslation,
      };
    } catch (error) {
      console.log(error);
      const errorBody = { ...response, error: 'Translation failed' };
      throw new InternalServerErrorException(errorBody);
    }
  }

      throw new InternalServerErrorException('Could not translate');
    }
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

  private async getHiragana(inputText: string): Promise<string> {
    let convertedTranslation =
      await this.tryConvertToHiraganaUsingAi(inputText);

    this.logger.debug('Found possible hiragana: ' + convertedTranslation);
    this.logger.debug('Validating hiragana');

    if (isKatakana(convertedTranslation)) {
      this.logger.debug('Found katakana');
      return toHiragana(convertedTranslation);
    }
    if (isHiragana(convertedTranslation)) {
      this.logger.debug('Found hiragana');
      return convertedTranslation;
    }

    this.logger.debug(
      'Converted Translation has Kanji or is mixed syntax, will attempt hiragana conversion using AI',
    );

    const maxAttempts = 3;
    let attempts = 0;
    let answer = null;

    while (attempts <= maxAttempts) {
      this.logger.log(convertedTranslation);

      if (isHiragana(convertedTranslation)) {
        this.logger.log('Ok found hiragana run: ' + attempts);
        answer = convertedTranslation;
        break;
      } else {
        this.logger.warn('Hmm isnt hiragana, retrying.. run: ' + attempts);
        convertedTranslation =
          await this.tryConvertToHiraganaUsingAi(inputText);
      }

      if (attempts === maxAttempts) {
        throw new InternalServerErrorException('Cannot translate');
      }
      attempts++;
    }
    return answer;
  }

  private async tryConvertToHiraganaUsingAi(inputText: string) {
    const prompt = `you will receive a japanese text and must convert any katakana and kanji characters into hiragana.
    The response must only consist of valid hiragana characters.
    
    format the response in the following way:

    ##start response## 
    [input converted to hiragana]
    ##end response##
    
    New convert this text into hiragana-only characters:
    "${inputText}"
    `;

    this.logger.debug(
      'Trying to convert to hiragana using AI ' + this.huggingfaceTextGenModel,
    );
    const response = await this.aiService.generateTextWithWithHuggingface(
      prompt,
      this.huggingfaceTextGenModel,
    );

    const extractedReponse = extractTextResponse(response, this.logger);
    this.logger.debug(
      'Attempted to convert to hiragana using AI. Result: ',
      extractedReponse,
    );
    return extractedReponse;
  }
}
