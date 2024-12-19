import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Add your custom authentication logic here
    // for example, call super.logIn(request) to establish a session.
    if (this.configService.get<string>('IS_PRODUCTION') !== 'true') {
      this.logger.debug(
        'Skipping JWT validation because it is not production.',
      );
      return true; // Skip authentication if not production
    }

    // Proceed with regular authentication in production
    return super.canActivate(context);
  }

  handleRequest(err, user) {
    console.log('test');

    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
