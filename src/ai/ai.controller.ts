import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiProperty, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ResourceUseCountGuard } from 'src/auth/resource-use-count/resource-use-count.guard';

export class PromptDto {
  @ApiProperty({ example: 'johndoe', description: 'The username of the user' })
  prompt: string;
}

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @ApiBody({ type: PromptDto }) // Request body schema
  @ApiResponse({ status: 200, description: 'Response from ai', type: String })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, ResourceUseCountGuard)
  @Post('gpt/prompt')
  async gpt(@Body() { prompt }: PromptDto) {
    return this.aiService.generateChatGptResponse(prompt);
  }

  @ApiBody({ type: PromptDto }) // Request body schema
  @ApiResponse({ status: 200, description: 'Response from ai', type: String })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, ResourceUseCountGuard)
  @Post('ollama/prompt')
  async ollama(@Body() { prompt }: PromptDto) {
    return this.aiService.generateOllamaResponse(prompt);
  }
}
