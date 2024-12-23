import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { CsvFileHandler } from './csvFileHandler';
import { cwd } from 'node:process';
import * as path from 'path';

const toBeTranslated = [
  'a box of bananas',
  'a crate of bananas',
  'a box of chocolates',
  'a crop of lettuce',
  'a pack of cigarettes',
  'a bar of chocolate',
  'loaf of bread',
  'bag of tomatoes',
  'bag of onions',
  'bag of rice',
  'bag of potatoes',
  'a red bell pepper',
  'a clove of garlic',
];
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const processInBatches = async (
  items: string[],
  batchSize: number,
  delayMs: number,
  app,
) => {
  const timestamp = new Date().getTime();
  const pathToResultsFile = path.join(cwd(), `results_${timestamp}.csv`);
  const csvHandler = new CsvFileHandler(pathToResultsFile);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Process current batch
    await Promise.all(
      batch.map(async (word) => {
        const payload = { prompt: word };
        try {
          const response = await request(app.getHttpServer())
            .post('/ai/huggingface/translate')
            .send(payload);

          console.log(`Prompt: ${word}, response status:`, response.status);
          console.log(`Prompt: ${word}, Response Body:`, response.body);

          csvHandler.appendData({
            originalWord: word,
            translationResponse: response.body,
            statusCode: `${response.status}`,
          });
        } catch (error) {
          console.warn(`Prompt: ${word}, Error:`, error);
        }
      }),
    );

    // Wait before processing the next batch
    if (i + batchSize < items.length) {
      await delay(delayMs);
    }
  }
};

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .setLogger(new Logger())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('POST [/ai/huggingface/translate] Translate multiple prompts in batches', async () => {
    const batchSize = 5;
    const delayMs = 2000; // Wait 2 seconds between batches

    await processInBatches(toBeTranslated, batchSize, delayMs, app);
  });
});
