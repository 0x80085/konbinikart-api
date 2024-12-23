import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET [/] Greeting at root path', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('konnichiwa!');
  });

  it('POST [/ai/huggingface/translate] Translate "mother" with huggingface', async () => {
    jest.setTimeout(20000);

    const payload = {
      prompt: 'mother',
    };
    const result = await request(app.getHttpServer())
      .post('/ai/huggingface/translate')
      .send(payload)
      .expect(201);

    console.log(result.body);

    expect(result.body).toEqual(
      expect.objectContaining({
        nameEnglish: 'mother',
        originalAiTranslation: '母',
      }),
    );
  });
});
