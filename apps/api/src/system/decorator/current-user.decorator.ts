import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUser as CurrentUserType } from '../helper/context.helper';

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserType | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserType;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);

// Alias for backward compatibility
export const GetUser = CurrentUser;

// Re-export the type for convenience
export type { CurrentUserType };

