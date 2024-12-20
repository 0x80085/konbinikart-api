import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserDiscriminator } from 'src/users/user.entity';

@Injectable()
export class AdminOrStaffGuard implements CanActivate {
  private readonly logger = new Logger(AdminOrStaffGuard.name);
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.configService.get<string>('IS_PRODUCTION') !== 'true') {
      this.logger.debug(
        'Skipping JWT validation because it is not production.',
      );
      return true; // Skip authentication if not production
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not found in request.');
    }

    // Check if the user isAdmin or discriminator is 'Staff'
    if (user.isAdmin || user.discriminator === UserDiscriminator.Staff) {
      return true;
    }

    throw new UnauthorizedException('Access denied');
  }
}
