import { Module } from '@nestjs/common';
import { AiService } from './services/ai.service';
import { AiController } from './controllers/ai.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  providers: [AiService],
  imports: [UsersModule, AuthModule],
  controllers: [AiController],
})
export class AiModule {}
