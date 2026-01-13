import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FamilyAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const familyId = request.params.familyId;

    if (!userId || !familyId) {
      throw new ForbiddenException('Access denied');
    }

    const membership = await this.prisma.familyMember.findUnique({
      where: {
        familyId_userId: { familyId, userId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this family');
    }

    // Attach membership to request for role checks
    request.familyMembership = membership;

    return true;
  }
}

