import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { InviteCode } from './entities/invite-code.entity';
import { UsersController } from './controllers/users.controller';
import { InviteCodeService } from './services/invite-code.service';
import { UsersService } from './services/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, InviteCode])],
  providers: [UsersService, InviteCodeService],
  controllers: [UsersController],
  exports: [UsersService, InviteCodeService],
})
export class UsersModule {}
