import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import {
  ApiProperty,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ResourceUseCountGuard } from 'src/auth/resource-use-count.guard';
import { UsersService } from 'src/users/users.service';

export class PromptDto {
  @ApiProperty({ example: 'johndoe', description: 'The username of the user' })
  prompt: string;
}

@Controller('ai')
export class AiController {
  constructor(
    private aiService: AiService,
    private usersService: UsersService,
  ) {}

  @ApiBearerAuth()
  @ApiBody({ type: PromptDto }) // Request body schema
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
  @ApiBody({ type: PromptDto }) // Request body schema
  @ApiResponse({ status: 200, description: 'Response from AI', type: String })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, ResourceUseCountGuard)
  @Post('ollama/prompt')
  async ollama(@Body() { prompt }: PromptDto) {
    return this.aiService.generateOllamaResponse(prompt);
  }

  @ApiBearerAuth()
  @ApiBody({ type: PromptDto }) // Request body schema
  @ApiResponse({ status: 200, description: 'Response from AI', type: String })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  // @UseGuards(JwtAuthGuard, ResourceUseCountGuard)
  @Post('huggingface/translate')
  async huggingfaceTranslate(@Body() { prompt }: PromptDto) {
    return this.aiService.translateWithHuggingface(prompt);
  }

  private async increaseResourceUseCount(req: any) {
    const userId = req.user.id;
    const user = await this.usersService.findOne(userId);
    await this.usersService.increaseResourceUseCountFor(user.id);
  }
}
