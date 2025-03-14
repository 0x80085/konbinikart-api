import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/services/users.service';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from '../controllers/auth.controller';
import { UserDiscriminator } from '../../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    throw new InternalServerErrorException('Something went wrong');
  }

  async login(_user: { username: string; password: string }) {
    await this.validateUser(_user.username, _user.password);
    const user = await this.usersService.findOne(_user.username);

    const payload: JwtPayload = {
      username: user.username,
      sub: user.id,
      discriminator: user.discriminator as UserDiscriminator,
      isAdmin: user.isAdmin,
      resourceUseCount: user.resourceUseCount,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(username: string, password: string, inviteCode: string) {
    const pw = await bcrypt.hash(password, 10);

    await this.usersService.create(username, pw, inviteCode);
  }
}
