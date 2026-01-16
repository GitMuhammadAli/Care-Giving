import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Transaction Interceptor for Prisma
 * 
 * For explicit transactions, use prisma.$transaction() in your service methods.
 * This interceptor provides a hook for transaction-like behavior but
 * individual operations are atomic in Prisma by default.
 * 
 * For complex transactions, use:
 * await prisma.$transaction([
 *   prisma.user.create(...),
 *   prisma.post.create(...),
 * ]);
 * 
 * Or interactive transactions:
 * await prisma.$transaction(async (tx) => {
 *   const user = await tx.user.create(...);
 *   await tx.post.create({ data: { authorId: user.id } });
 * });
 */
@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    // Prisma transactions are handled at the service level
    // This interceptor can be used for logging/metrics
    return next.handle().pipe(
      tap(() => {
        // Transaction committed (success path)
      }),
      catchError((error) => {
        // Transaction rolled back (error path)
        return throwError(() => error);
      }),
    );
  }
}
