import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiProperty,
  ApiResponse,
} from '@nestjs/swagger';
import { InviteCodeService } from 'src/users/invite-code.service';
import { UserDiscriminator } from 'src/users/user.entity';
import { AdminOrStaffGuard } from './admin-or-staff.guard';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

export interface JwtPayload {
  username: string;
  sub: string;
  isAdmin: boolean;
  discriminator: UserDiscriminator;
  resourceUseCount: number;
}

export class AuthDto {
  @ApiProperty({ example: 'johndoe', description: 'The username of the user' })
  username: string;

  @ApiProperty({
    example: 'securePassword123',
    description: 'The password of the user',
  })
  password: string;

  @ApiProperty({ example: 'xxx-...', description: 'Invite code to join' })
  inviteCode: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly inviteCodeService: InviteCodeService,
  ) {}

  @ApiBody({ type: AuthDto })
  @ApiResponse({ status: 200, description: 'Successful login', type: String })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('login')
  async login(@Body() body: AuthDto) {
    return this.authService.login(body);
  }

  @ApiBody({ type: AuthDto })
  @ApiResponse({
    status: 201,
    description: 'Successful registration',
    type: String,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @Post('register')
  async register(@Body() body: AuthDto) {
    return this.authService.register(
      body.username,
      body.password,
      body.inviteCode,
    );
  }

  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'Created code',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, AdminOrStaffGuard)
  @Post('invite')
  createInviteCode() {
    return this.inviteCodeService.createInviteCode();
  }

  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Revoked successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, AdminOrStaffGuard)
  @Delete('invite/:code')
  revokeInviteCode(@Param('code') code: string) {
    return this.inviteCodeService.revokeInviteCode(code);
  }

  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Revoked successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, AdminOrStaffGuard)
  @Get('invite')
  all() {
    return this.inviteCodeService.all();
  }
}
