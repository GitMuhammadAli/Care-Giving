import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Skip for non-HTTP contexts (RabbitMQ, WebSocket, etc.)
    if (context.getType() !== 'http') {
      return true;
    }

    // Extra safety: skip if request doesn't have headers (RabbitMQ edge case)
    const request = context.switchToHttp().getRequest();
    if (!request?.headers) {
      return true;
    }

    return super.canActivate(context);
  }
}

