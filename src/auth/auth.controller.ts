import { Controller, Post, Request } from '@nestjs/common';
import { AuthService } from './auth.service';

export interface JwtPayload {
  username: string;
  sub: number;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }
}
