import {
  Body,
  Controller,
  Logger,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiProperty,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResourceUseCountGuard } from '../../auth/guards/resource-use-count.guard';
import {
  AiOtherTranslationCommand,
  AiOtherTranslationHandler,
  TranslatedItemWithDetails,
} from '../handlers/ai-other-translation-handler';
import {
  AiTranslationCommand,
  AiTranslationHandler,
  GroceryItemWithDetails,
} from '../handlers/ai-translation-handler';
import { AiService } from '../services/ai.service';
import { UsersService } from '../../users/services/users.service';

export class PromptDto {
  @ApiProperty({ example: 'Fish sauce', description: 'The prompt' })
  prompt: string;
}

export class HFPromptDto {
  @ApiProperty({ example: 'Fish sauce', description: 'The prompt' })
  prompt: string;

  @ApiProperty({
    example: 'fr',
    description: 'The targeted language to translate to',
  })
  targetLang: string;
}

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);
  constructor(
    private configService: ConfigService,
    private aiService: AiService,
    private usersService: UsersService,
  ) {}

  @ApiBearerAuth()
  @ApiBody({ type: PromptDto })
  @ApiResponse({ status: 200, description: 'Response from AI', type: String })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, ResourceUseCountGuard)
  @Post('gpt/prompt')
  async gpt(@Body() { prompt }: PromptDto, @Request() req) {
    const response = await this.aiService.generateChatGptResponse(prompt);
    await this.increaseResourceUseCount(req);
    return response;
  }

  @ApiBearerAuth()
  @ApiBody({ type: PromptDto })
  @ApiResponse({ status: 200, description: 'Response from AI', type: String })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, ResourceUseCountGuard)
  @Post('ollama/prompt')
  async ollama(@Body() { prompt }: PromptDto, @Request() req) {
    const response = this.aiService.generateOllamaResponse(prompt);
    await this.increaseResourceUseCount(req);
    return response;
  }

  @ApiBearerAuth()
  @ApiBody({ type: PromptDto })
  @ApiResponse({ status: 200, description: 'Response from AI', type: String })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, ResourceUseCountGuard)
  @Post('deepseek/prompt')
  async deepseek(@Body() { prompt }: PromptDto, @Request() req) {
    const response = this.aiService.generateTextWithDeepSeek(prompt);
    await this.increaseResourceUseCount(req);
    return response;
  }

  @ApiBearerAuth()
  @ApiBody({ type: PromptDto })
  @ApiResponse({
    status: 200,
    description: 'Response from AI',
    type: GroceryItemWithDetails,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, ResourceUseCountGuard)
  @Post('huggingface/translate')
  async huggingfaceTranslate(
    @Body() { prompt }: PromptDto,
    @Request() req,
  ): Promise<GroceryItemWithDetails> {
    const handler = new AiTranslationHandler(
      this.aiService,
      this.configService,
    );
    const response = handler.execute(new AiTranslationCommand(prompt));
    await this.increaseResourceUseCount(req);
    return response;
  }

  @ApiBearerAuth()
  @ApiBody({ type: HFPromptDto })
  @ApiResponse({
    status: 200,
    description: 'Response from AI',
    type: TranslatedItemWithDetails,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, ResourceUseCountGuard)
  @Post('huggingface/translate/other')
  async huggingfaceTextGen(
    @Body() { prompt, targetLang }: HFPromptDto,
    @Request() req,
  ): Promise<TranslatedItemWithDetails> {
    const handler = new AiOtherTranslationHandler(
      this.aiService,
      this.configService,
    );
    const response = handler.execute(
      new AiOtherTranslationCommand(prompt, targetLang),
    );
    await this.increaseResourceUseCount(req);
    return response;
  }

  /**
   * Increases the user.resourceUseCount
   *
   * Assumes request as authed and req.user.id is defined.
   * @param req NestJS Request obj to check which user it needs to update.
   */
  private async increaseResourceUseCount(req: any) {
    if (
      this.configService.get<string>('IS_PRODUCTION').toLocaleLowerCase() ===
      'true'
    ) {
      const userId = req.user.id;
      const user = await this.usersService.findOne(userId);
      this.logger.debug(
        'Updating count for ' + userId + ' Count=' + user.resourceUseCount,
      );
      await this.usersService.increaseResourceUseCountFor(user.id);
      this.logger.debug(
        'Updated count for ' + userId + ' Count=' + user.resourceUseCount,
      );
    }
  }
}
