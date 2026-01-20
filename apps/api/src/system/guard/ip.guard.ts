import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ContextHelper } from '../helper/context.helper';

@Injectable()
export class IpGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Skip for non-HTTP contexts (RabbitMQ, WebSocket, etc.)
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const ip =
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.ip ||
      'unknown';

    ContextHelper.setIp(ip);

    return true;
  }
}

