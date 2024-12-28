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
import { UserDiscriminator } from '../../users/entities/user.entity';
import { AdminOrStaffGuard } from '../guards/admin-or-staff.guard';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { InviteCodeService } from '../../users/services/invite-code.service';

export interface JwtPayload {
  username: string;
  sub: string;
  isAdmin: boolean;
  discriminator: UserDiscriminator;
  resourceUseCount: number;
}

export class SignUpDto {
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

export class LoginDto {
  @ApiProperty({ example: 'johndoe', description: 'The username of the user' })
  username: string;

  @ApiProperty({
    example: 'securePassword123',
    description: 'The password of the user',
  })
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly inviteCodeService: InviteCodeService,
  ) {}

  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Successful login', type: String })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('login')
  async login(@Body() body: SignUpDto) {
    return this.authService.login(body);
  }

  @ApiBody({ type: SignUpDto })
  @ApiResponse({
    status: 201,
    description: 'Successful registration',
    type: String,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @Post('register')
  async register(@Body() body: SignUpDto) {
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
