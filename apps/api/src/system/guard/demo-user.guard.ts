import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { isDemoUser } from '../constants/demo.constant';

/**
 * DemoUserGuard
 * =============
 * Apply this guard to any endpoint that SHOULD be blocked for the demo
 * user (e.g. change-password, update-profile, delete-account, delete-family).
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, DemoUserGuard)
 *   @Patch('me')
 *   async updateProfile(…) { … }
 *
 * NOTE: The JWT payload must contain `email` for the check to work.
 *       Our JwtStrategy already includes it.
 */
@Injectable()
export class DemoUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && isDemoUser(user.email)) {
      throw new ForbiddenException(
        'The demo account cannot modify its profile, password, or settings. ' +
        'Please register your own account to access these features.',
      );
    }

    return true;
  }
}
