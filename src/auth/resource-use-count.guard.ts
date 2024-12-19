import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { JwtPayload } from './auth.controller';
import { UserDiscriminator } from 'src/users/user.entity';
import { ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class ResourceUseCountGuard implements CanActivate {
  private readonly logger = new Logger(ResourceUseCountGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.configService.get<string>('IS_PRODUCTION').toLowerCase() !== 'true'
    ) {
      this.logger.debug(
        'Skipping JWT validation because it is not production.',
      );
      return true; // Skip authentication if not production
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user; // Assuming the JwtAuthGuard adds the user to the request object.

    if (!user) {
      throw new ForbiddenException('User is not authenticated.');
    }

    const resourceLimit = this.configService.get<number>('RESOURCE_USE_LIMIT');

    if (!resourceLimit) {
      throw new Error(
        'RESOURCE_USE_LIMIT is not defined in the environment variables.',
      );
    }

    const userRecord = await this.usersService.findOne(user.username);
    if (!userRecord) {
      throw new ForbiddenException('User not found.');
    }

    const isStaffOrAdmin =
      userRecord.isAdmin ||
      userRecord.discriminator === UserDiscriminator.Staff;

    if (isStaffOrAdmin) {
      return true;
    }

    this.logger.log(
      `resourceUseCount: ${user.resourceUseCount} / ${resourceLimit} for ${user.username}`,
    );

    if (userRecord.resourceUseCount >= resourceLimit) {
      throw new ThrottlerException('Resource usage limit exceeded.');
    }

    return true;
  }
}
