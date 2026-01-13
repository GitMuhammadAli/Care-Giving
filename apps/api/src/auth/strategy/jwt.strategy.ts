import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../../user/repository/user.repository';
import { ContextHelper, CurrentUser } from '../../system/helper/context.helper';
import { UserStatus } from '../../user/entity/user.entity';

interface JwtPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req?.cookies?.['access_token'],
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    if (user.isLocked()) {
      throw new UnauthorizedException('Account is locked');
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt) {
      const tokenIssuedAt = new Date(payload.iat * 1000);
      if (user.passwordChangedAt > tokenIssuedAt) {
        throw new UnauthorizedException('Password was changed. Please login again.');
      }
    }

    const currentUser: CurrentUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      permissions: user.getPermissions(),
      familyIds: [], // Will be populated by FamilyAccessGuard
    };

    // Set user in context for helpers
    ContextHelper.setUser(currentUser);
    ContextHelper.setPermissions(currentUser.permissions);

    return currentUser;
  }
}

