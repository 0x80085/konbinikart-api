import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import {
  ApiProperty,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ResourceUseCountGuard } from '../../auth/resource-use-count.guard';
import { UsersService } from '../../users/users.service';
import { AiService, GroceryItem } from '../services/ai.service';
import {
  AiTranslationCommand,
  AiTranslationHandler,
} from '../handlers/ai-translation-handler';
import { ConfigService } from '@nestjs/config';

export class PromptDto {
  @ApiProperty({ example: 'johndoe', description: 'The username of the user' })
  prompt: string;
}

@Controller('ai')
export class AiController {
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
  @ApiResponse({ status: 200, description: 'Response from AI', type: String })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, ResourceUseCountGuard)
  @Post('huggingface/translate')
  async huggingfaceTranslate(
    @Body() { prompt }: PromptDto,
    @Request() req,
  ): Promise<GroceryItem> {
    const handler = new AiTranslationHandler(
      this.aiService,
      this.configService,
    );
    const response = handler.execute(new AiTranslationCommand(prompt));
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
      await this.usersService.increaseResourceUseCountFor(user.id);
    }
  }
}
