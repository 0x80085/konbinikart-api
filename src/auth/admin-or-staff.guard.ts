import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserDiscriminator } from 'src/users/user.entity';

@Injectable()
export class AdminOrStaffGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not found in request.');
    }

    // Check if the user isAdmin or discriminator is 'Staff'
    if (user.isAdmin || user.discriminator === UserDiscriminator.Staff) {
      return true;
    }

    throw new UnauthorizedException(
      'Access denied: Admin or Staff role required.',
    );
  }
}
