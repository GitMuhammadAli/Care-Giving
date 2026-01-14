import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserRepository } from '../../user/repository/user.repository';
import { SessionRepository } from '../../user/repository/session.repository';
import { MailService } from '../../system/module/mail/mail.service';
import { OtpHelper } from '../../system/helper/otp.helper';
import { UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { UserStatus } from '../../user/entity/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let mailService: jest.Mocked<MailService>;
  let otpHelper: jest.Mocked<OtpHelper>;

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    fullName: 'Test User',
    passwordHash: 'hashed_password',
    password: 'hashed_password',
    emailVerified: true,
    status: UserStatus.ACTIVE,
    failedLoginAttempts: 0,
    lockoutUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    validatePassword: jest.fn(),
    isLocked: jest.fn().mockReturnValue(false),
    hashPassword: jest.fn(),
  };

  const mockSession = {
    id: '456',
    userId: '123',
    user: mockUser,
    refreshToken: 'refresh_token',
    isActive: true,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUsedAt: new Date(),
    isExpired: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            createUser: jest.fn(),
            verifyEmail: jest.fn(),
            resetFailedAttempts: jest.fn(),
            updateLastLogin: jest.fn(),
            setPasswordResetToken: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: SessionRepository,
          useValue: {
            createSession: jest.fn(),
            findByRefreshToken: jest.fn(),
            updateRefreshToken: jest.fn(),
            updateLastUsed: jest.fn(),
            invalidateSession: jest.fn(),
            invalidateAllUserSessions: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'jwt.secret': 'test_secret',
                'jwt.refreshSecret': 'test_refresh_secret',
                'jwt.expiresIn': '15m',
                'jwt.refreshExpiresIn': '7d',
                'security.maxLoginAttempts': 5,
                'security.lockoutDuration': 1800,
              };
              return config[key];
            }),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendEmailVerification: jest.fn(),
            sendPasswordReset: jest.fn(),
          },
        },
        {
          provide: OtpHelper,
          useValue: {
            generate: jest.fn().mockResolvedValue('123456'),
            verify: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    sessionRepository = module.get(SessionRepository);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    mailService = module.get(MailService);
    otpHelper = module.get(OtpHelper);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'Password123!',
        fullName: 'New User',
      };

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.createUser.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
        fullName: registerDto.fullName,
      } as any);

      const result = await service.register(registerDto);

      expect(result).toBeDefined();
      expect(result.message).toContain('Registration successful');
      expect(userRepository.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(userRepository.createUser).toHaveBeenCalled();
      expect(mailService.sendEmailVerification).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'Password123!',
        fullName: 'Existing User',
      };

      userRepository.findByEmail.mockResolvedValue(mockUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'correct_password',
        rememberMe: false,
      };

      const mockUserWithMethods = {
        ...mockUser,
        validatePassword: jest.fn().mockResolvedValue(true),
        isLocked: jest.fn().mockReturnValue(false),
      };

      userRepository.findByEmail.mockResolvedValue(mockUserWithMethods as any);
      jwtService.sign.mockReturnValueOnce('access_token').mockReturnValueOnce('refresh_token');
      sessionRepository.createSession.mockResolvedValue(mockSession as any);
      userRepository.resetFailedAttempts.mockResolvedValue(undefined);
      userRepository.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBe('access_token');
      expect(result.tokens.refreshToken).toBe('refresh_token');
      expect(result.user).toBeDefined();
      expect(userRepository.resetFailedAttempts).toHaveBeenCalled();
      expect(userRepository.updateLastLogin).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrong_password',
      };

      const mockUserWithMethods = {
        ...mockUser,
        validatePassword: jest.fn().mockResolvedValue(false),
        isLocked: jest.fn().mockReturnValue(false),
      };

      userRepository.findByEmail.mockResolvedValue(mockUserWithMethods as any);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password',
      };

      userRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens', async () => {
      const mockSessionWithUser = {
        ...mockSession,
        user: mockUser,
        isExpired: jest.fn().mockReturnValue(false),
      };

      sessionRepository.findByRefreshToken.mockResolvedValue(mockSessionWithUser as any);
      jwtService.sign.mockReturnValueOnce('new_access_token').mockReturnValueOnce('new_refresh_token');
      sessionRepository.updateRefreshToken.mockResolvedValue(undefined);
      sessionRepository.updateLastUsed.mockResolvedValue(undefined);

      const result = await service.refreshToken('refresh_token');

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBe('new_refresh_token');
      expect(sessionRepository.updateRefreshToken).toHaveBeenCalled();
      expect(sessionRepository.updateLastUsed).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with invalid refresh token', async () => {
      sessionRepository.findByRefreshToken.mockResolvedValue(null);

      await expect(service.refreshToken('invalid_token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with expired refresh token', async () => {
      const expiredSession = {
        ...mockSession,
        isExpired: jest.fn().mockReturnValue(true),
      };

      sessionRepository.findByRefreshToken.mockResolvedValue(expiredSession as any);

      await expect(service.refreshToken('expired_token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      sessionRepository.invalidateSession.mockResolvedValue(undefined);

      await service.logout('refresh_token_123');

      expect(sessionRepository.invalidateSession).toHaveBeenCalledWith('refresh_token_123');
    });
  });
});
