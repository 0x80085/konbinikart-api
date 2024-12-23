import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

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

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('POST [/ai/huggingface/translate] Translate "mother" with huggingface', async () => {
    const promises = toBeTranslated.map((word) => {
      const payload = {
        prompt: word,
      };
      return request(app.getHttpServer())
        .post('/ai/huggingface/translate')
        .send(payload)
        .then((response) => {
          console.log(`Prompt: ${word}, response status:`, response.status);
          console.log(
            `Prompt: ${word}, response statuscode:`,
            response.statusCode,
          );
          console.log(`Prompt: ${word}, Response:`, response.body);
        })
        .catch((error) => {
          console.warn(`Prompt: ${word}, Error:`, error);
        });
    });

    await Promise.all(promises);
  });
});
