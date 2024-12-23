import { Logger } from '@nestjs/common';

export function extractTextResponse(response: string, logger: Logger) {
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

    logger.debug('Extracted from AI response:');
    logger.debug(extracted);
    return extracted;
  }

  throw new Error('Could not find the last response block');
}

export async function convertKanjiToHiragana(text) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const kuromoji = require('kuromoji');
  return new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: 'node_modules/kuromoji/dict/' })
      .build((err, tokenizer) => {
        if (err) {
          console.error(err);
          reject(new Error('Error initializing tokenizer'));
          return;
        }

        // Tokenize the text
        const tokens = tokenizer.tokenize(text);

        // Convert Kanji to Hiragana
        const conversion = tokens
          .map((token) =>
            token.reading ? token.reading.toLowerCase() : token.surface_form,
          )
          .join('');

        resolve(conversion);
      });
  });
}

export function generateRandomInvisibleString(length = 10) {
  // Array of invisible or insignificant characters
  const invisibleChars = [
    '\u200B', // Zero-width space
    '\u200C', // Zero-width non-joiner
    '\u200D', // Zero-width joiner
    '\u2060', // Word joiner
    '\u3000', // Ideographic space
    '\u00A0', // Non-breaking space
    '\t', // Tab
    '\n', // Newline
    '\r', // Carriage return
    '\v', // Vertical tab
    '\f', // Form feed
    ' ', // Regular space
  ];

  let result = '';
  for (let i = 0; i < length; i++) {
    // Pick a random invisible character
    const randomChar =
      invisibleChars[Math.floor(Math.random() * invisibleChars.length)];
    result += randomChar;
  }

  return result;
}
