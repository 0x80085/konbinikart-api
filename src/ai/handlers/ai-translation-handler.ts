import { AiService, GroceryItem } from '../services/ai.service';

export class AiTranslationCommand {
  inputText: string;

  constructor(input: string) {
    this.inputText = input;
  }
}

export class AiTranslationHandler {
  constructor(private aiService: AiService) {}
  async execute({ inputText }: AiTranslationCommand): Promise<GroceryItem> {
    const translation =
      await this.aiService.translateWithHuggingface(inputText);
    const hiragana = await this.getHiragana(translation);

    return {
      emoji: null,
      id: null,
      nameEnglish: inputText,
      nameHiragana: hiragana,
      nameKatakana: translation,
      nameRomaji: 'todo',
    };
  }

  private async getHiragana(inputText: string): Promise<string> {
    const prompt = `

        you will receive a japanese text and must convert any katakana and kanji characters into hiragana.
        
        format the resonse in the following way:

        ##start response## 
        <input converted to hiragana>
        ##end response##
        
        New convert this text into hiragana-only characters:
        "${inputText}"
    `;

    const response = await this.aiService.translateWithHuggingfaceByModel(
      prompt,
      'mistralai/Mistral-Nemo-Instruct-2407',
    );

    const hiragana = this.extractLastHiragana(response);

    return hiragana;
  }

  extractLastHiragana(response) {
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
