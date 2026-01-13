import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { Session } from './entity/session.entity';
import { PushToken } from './entity/push-token.entity';
import { UserRepository } from './repository/user.repository';
import { SessionRepository } from './repository/session.repository';
import { UserService } from './service/user.service';
import { UserController } from './controller/user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Session, PushToken])],
  providers: [UserRepository, SessionRepository, UserService],
  controllers: [UserController],
  exports: [UserService, UserRepository, SessionRepository],
})
export class UserModule {}

