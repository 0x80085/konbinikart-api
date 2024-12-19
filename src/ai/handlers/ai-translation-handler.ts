import { InternalServerErrorException, Logger } from '@nestjs/common';
import {
  isHiragana,
  isKanji,
  isKatakana,
  isMixed,
  isRomaji,
  toHiragana,
  toKatakana,
  toRomaji,
} from 'wanakana';
import { AiService, GroceryItem } from '../services/ai.service';
import { ConfigService } from '@nestjs/config';

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
    try {
      const aiTranslation =
        await this.aiService.translateWithHuggingface(inputText);

      const hiragana = await this.getHiragana(aiTranslation);

      const katakana = toKatakana(hiragana);
      const romaji = toRomaji(hiragana);

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
        <your explanation>
        ##end response##
        
        New explain this text in detail, give the definition of the word or words:
        "${inputText}"
    `,
        this.huggingfaceTextGenModel,
      );

    const explanation = this.extractTextResponse(explanationReponse);
    return explanation;
  }

  private async getHiragana(inputText: string): Promise<string> {
    let convertedTranslation =
      await this.tryConvertToHiraganaUsingAi(inputText);
    const hasKanji = convertedTranslation.split('').some((it) => isKanji(it));

    this.logger.debug('Found possible hiragana: ' + convertedTranslation);
    this.logger.debug('Validating hiragana');

    if (hasKanji || isMixed(convertedTranslation)) {
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

    if (isKatakana(convertedTranslation)) {
      this.logger.debug('Found katakana');
      return toHiragana(convertedTranslation);
    }
    if (isHiragana(convertedTranslation)) {
      this.logger.debug('Found hiragana');
      return convertedTranslation;
    }
    if (isRomaji(convertedTranslation)) {
      this.logger.debug('Found romaji', convertedTranslation);
      return toHiragana(convertedTranslation);
    }

    this.logger.error('#### Bothing matched !!! 🤷‍♂️');
    throw new InternalServerErrorException('Something went wrong');
  }

  private async tryConvertToHiraganaUsingAi(inputText: string) {
    const prompt = `you will receive a japanese text and must convert any katakana and kanji characters into hiragana.
        The response must only consist of valid hiragana characters.
        
        format the response in the following way:

        ##start response## 
        <input converted to hiragana>
        ##end response##
        
        New convert this text into hiragana-only characters:
        "${inputText}"
    `;

    const response = await this.aiService.generateTextWithWithHuggingface(
      prompt,
      this.huggingfaceTextGenModel,
    );

    const extractedReponse = this.extractTextResponse(response);
    this.logger.debug(
      'Attempted to convert to hiragana. Result: ',
      extractedReponse,
    );
    return extractedReponse;
  }

  private extractTextResponse(response: string) {
    this.logger.debug('Extracting text');

    const startTag = '##start response##';
    const endTag = '##end response##';

    // Find all occurrences of start and end tags
    const startIndices = [...response.matchAll(new RegExp(startTag, 'g'))].map(
      (match) => match.index,
    );
    const endIndices = [...response.matchAll(new RegExp(endTag, 'g'))].map(
      (match) => match.index,
    );

    if (startIndices.length > 0 && endIndices.length > 0) {
      // Get the last block's indices
      const lastStartIndex =
        startIndices[startIndices.length - 1] + startTag.length;
      const lastEndIndex = endIndices[endIndices.length - 1];

      // Extract the text between the last start and end tags
      const extracted = response.slice(lastStartIndex, lastEndIndex).trim();
      return extracted;
    }

    throw new Error('Could not find the last response block');
  }
}
