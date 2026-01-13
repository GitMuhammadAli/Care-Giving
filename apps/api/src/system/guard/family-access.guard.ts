import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FAMILY_ACCESS_KEY, FamilyAccessOptions } from '../decorator/family-access.decorator';
import { FamilyMember } from '../../family/entity/family-member.entity';

@Injectable()
export class FamilyAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(FamilyMember)
    private familyMemberRepository: Repository<FamilyMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<FamilyAccessOptions>(
      FAMILY_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const familyId = request.params[options.param || 'familyId'];

    if (!familyId) {
      return true;
    }

    const member = await this.familyMemberRepository.findOne({
      where: {
        familyId,
        userId: user.id,
      },
    });

    if (!member) {
      throw new NotFoundException('Family not found or access denied');
    }

    if (options.roles && options.roles.length > 0) {
      if (!options.roles.includes(member.role)) {
        throw new ForbiddenException(
          `Required role: ${options.roles.join(' or ')}`,
        );
      }
    }

    // Attach member to request for later use
    request.familyMember = member;

    return true;
  }
}

