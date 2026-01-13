import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { User, UserStatus } from '../entity/user.entity';
import { UserRepository } from '../repository/user.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    return this.userRepository.createUser({
      ...dto,
      status: UserStatus.PENDING,
      emailVerified: false,
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    
    Object.assign(user, dto);
    
    return this.userRepository.save(user);
  }

  async verifyEmail(id: string): Promise<User> {
    await this.userRepository.verifyEmail(id);
    return this.findById(id);
  }

  async changePassword(id: string, newPassword: string): Promise<void> {
    const user = await this.findById(id);
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.hashPassword();
    await this.userRepository.save(user);
  }

  async deactivate(id: string): Promise<void> {
    await this.userRepository.updateUser(id, {
      status: UserStatus.DEACTIVATED,
    });
  }

  async suspend(id: string): Promise<void> {
    await this.userRepository.updateUser(id, {
      status: UserStatus.SUSPENDED,
    });
  }

  async reactivate(id: string): Promise<void> {
    await this.userRepository.updateUser(id, {
      status: UserStatus.ACTIVE,
    });
  }

  async updateLastLogin(id: string, ip?: string): Promise<void> {
    await this.userRepository.updateLastLogin(id, ip);
  }

  async getPreferences(id: string): Promise<User['preferences']> {
    const user = await this.findById(id);
    return user.preferences || {
      notifications: {
        email: true,
        push: true,
        sms: false,
        emergencyOnly: false,
      },
      display: {
        theme: 'system',
        language: 'en',
      },
    };
  }

  async updatePreferences(
    id: string,
    preferences: User['preferences'],
  ): Promise<User['preferences']> {
    const user = await this.findById(id);
    user.preferences = { ...user.preferences, ...preferences };
    await this.userRepository.save(user);
    return user.preferences;
  }
}

