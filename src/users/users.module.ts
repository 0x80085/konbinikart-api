import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { InviteCodeService } from './invite-code.service';
import { InviteCode } from './invite-code.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, InviteCode])],
  providers: [UsersService, InviteCodeService],
  controllers: [UsersController],
  exports: [UsersService, InviteCodeService],
})
export class UsersModule {}
