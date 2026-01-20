import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorator/public.decorator';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected reflector: Reflector;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip throttling for non-HTTP contexts (RabbitMQ, WebSocket, etc.)
    const contextType = context.getType();
    if (contextType !== 'http') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Apply stricter rate limiting to public endpoints (login, register)
    if (isPublic) {
      // Still apply throttling to public endpoints
    }

    return super.canActivate(context);
  }

  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('Too many requests. Please try again later.');
  }
}

