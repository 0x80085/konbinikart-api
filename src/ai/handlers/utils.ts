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
