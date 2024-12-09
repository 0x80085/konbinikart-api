import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiProperty, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserDiscriminator } from 'src/users/user.entity';

export interface JwtPayload {
  username: string;
  sub: number;
  isAdmin: boolean;
  discriminator: UserDiscriminator;
}

export class AuthDto {
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
  constructor(private authService: AuthService) {}

  @ApiBody({ type: AuthDto }) // Request body schema
  @ApiResponse({ status: 200, description: 'Successful login', type: String })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('login')
  async login(@Body() body: AuthDto) {
    return this.authService.login(body);
  }

  @ApiBody({ type: AuthDto }) // Request body schema
  @ApiResponse({
    status: 201,
    description: 'Successful registration',
    type: String,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @Post('register')
  async register(@Body() body: AuthDto) {
    return this.authService.register(body.username, body.password);
  }
}
