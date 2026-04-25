import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { hashPassword, verifyPassword } from '../common/utils/password.util';
import type { RequestAuth } from '../common/auth/request-auth.interface';
import { PrismaService } from '../prisma/prisma.service';
import { buildDefaultPreferences } from '../preferences/preferences.defaults';
import { getWeekIdForTimezone } from '../common/utils/week.util';
import { ensureDefaultTaskRules } from '../task-rules/task-rules.defaults';
import { AccessTokenPayload } from './access-token-payload.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // 当前仅提供模块骨架说明，后续再逐步填充注册、登录、刷新令牌等能力。
  getModuleInfo() {
    return {
      module: 'auth',
      status: 'auth-lifecycle-implemented',
    };
  }

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '两次输入的密码不一致',
        details: {
          field: 'confirmPassword',
        },
      });
    }

    try {
      const password = await hashPassword(dto.password);
      const now = new Date();

      const created = await this.prisma.$transaction(async (tx) => {
        const account = await tx.familyAccount.create({
          data: {
            accountName: dto.accountName,
            passwordHash: password.passwordHash,
            passwordAlgo: password.passwordAlgo,
          },
        });

        const family = await tx.family.create({
          data: {
            accountId: account.id,
            name: dto.familyName,
            mode: 'CLOUD',
            timezone: dto.timezone,
            currentWeekId: getWeekIdForTimezone(now, dto.timezone),
          },
        });

        await tx.preference.create({
          data: buildDefaultPreferences(family.id),
        });

        await ensureDefaultTaskRules(tx, family.id);

        return {
          familyId: family.id,
          accountName: account.accountName,
        };
      });

      return created;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: '账号名已存在',
        });
      }

      throw error;
    }
  }

  async login(dto: LoginDto) {
    const account = await this.prisma.familyAccount.findUnique({
      where: {
        accountName: dto.accountName,
      },
      include: {
        family: true,
      },
    });

    if (!account?.family) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '账号或密码错误',
      });
    }

    const passwordMatched = await verifyPassword(
      dto.password,
      account.passwordHash,
    );

    if (!passwordMatched) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '账号或密码错误',
      });
    }

    return this.issueSessionTokens({
      accountId: account.id,
      accountName: account.accountName,
      familyId: account.family.id,
      familyName: account.family.name,
      currentWeekId: account.family.currentWeekId,
      deviceLabel: dto.deviceLabel,
    });
  }

  async refresh(dto: RefreshTokenDto) {
    const { sessionId, refreshSecret } = this.parseRefreshToken(
      dto.refreshToken,
    );

    const session = await this.prisma.familySession.findFirst({
      where: {
        id: sessionId,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        family: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!session?.family?.account) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '刷新令牌无效或已过期',
      });
    }

    const matched = await verifyPassword(
      refreshSecret,
      session.refreshTokenHash,
    );

    if (!matched) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '刷新令牌无效或已过期',
      });
    }

    return this.issueSessionTokens({
      accountId: session.family.account.id,
      accountName: session.family.account.accountName,
      familyId: session.family.id,
      familyName: session.family.name,
      currentWeekId: session.family.currentWeekId,
      sessionId: session.id,
      deviceLabel: session.deviceLabel ?? undefined,
    });
  }

  async logout(dto: RefreshTokenDto) {
    const parsed = this.tryParseRefreshToken(dto.refreshToken);

    if (!parsed) {
      return {
        loggedOut: true,
      };
    }

    const session = await this.prisma.familySession.findUnique({
      where: {
        id: parsed.sessionId,
      },
    });

    if (!session) {
      return {
        loggedOut: true,
      };
    }

    const matched = await verifyPassword(
      parsed.refreshSecret,
      session.refreshTokenHash,
    );

    if (!matched) {
      return {
        loggedOut: true,
      };
    }

    await this.prisma.familySession.delete({
      where: {
        id: session.id,
      },
    });

    return {
      loggedOut: true,
    };
  }

  async changePassword(auth: RequestAuth, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '两次输入的新密码不一致',
        details: {
          field: 'confirmPassword',
        },
      });
    }

    const account = await this.prisma.familyAccount.findUnique({
      where: {
        id: auth.accountId,
      },
    });

    if (!account) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: '账号不存在',
      });
    }

    const matched = await verifyPassword(
      dto.currentPassword,
      account.passwordHash,
    );

    if (!matched) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '当前密码错误',
      });
    }

    const password = await hashPassword(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.familyAccount.update({
        where: {
          id: auth.accountId,
        },
        data: {
          passwordHash: password.passwordHash,
          passwordAlgo: password.passwordAlgo,
        },
      }),
      this.prisma.familySession.deleteMany({
        where: {
          familyId: auth.familyId,
          id: {
            not: auth.sessionId,
          },
        },
      }),
    ]);

    return {
      changed: true,
    };
  }

  private async issueSessionTokens(input: {
    accountId: string;
    accountName: string;
    familyId: string;
    familyName: string;
    currentWeekId: string;
    deviceLabel?: string;
    sessionId?: string;
  }) {
    const refreshSecret = randomBytes(32).toString('base64url');
    const refreshTokenHash = (await hashPassword(refreshSecret)).passwordHash;
    const refreshTokenTtlDays = Number(
      this.configService.get<string>('REFRESH_TOKEN_TTL_DAYS') ?? 30,
    );
    const expiresAt = new Date(
      Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );
    const now = new Date();

    const session = input.sessionId
      ? await this.prisma.familySession.update({
          where: {
            id: input.sessionId,
          },
          data: {
            refreshTokenHash,
            deviceLabel: input.deviceLabel,
            expiresAt,
            lastUsedAt: now,
          },
        })
      : await this.prisma.familySession.create({
          data: {
            familyId: input.familyId,
            refreshTokenHash,
            deviceLabel: input.deviceLabel,
            userAgent: null,
            expiresAt,
            lastUsedAt: now,
          },
        });

    await this.prisma.familyAccount.update({
      where: {
        id: input.accountId,
      },
      data: {
        lastLoginAt: now,
      },
    });

    const payload: AccessTokenPayload = {
      sub: input.accountId,
      familyId: input.familyId,
      sessionId: session.id,
      accountName: input.accountName,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = `${session.id}.${refreshSecret}`;

    return {
      accessToken,
      refreshToken,
      expiresIn: Number(
        this.configService.get<string>('JWT_ACCESS_EXPIRES_IN_SECONDS') ?? 3600,
      ),
      family: {
        id: input.familyId,
        name: input.familyName,
        currentWeekId: input.currentWeekId,
      },
    };
  }

  private parseRefreshToken(refreshToken: string) {
    const parsed = this.tryParseRefreshToken(refreshToken);

    if (!parsed) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '刷新令牌格式不合法',
      });
    }

    return parsed;
  }

  private tryParseRefreshToken(refreshToken: string) {
    const delimiterIndex = refreshToken.indexOf('.');

    if (delimiterIndex <= 0 || delimiterIndex >= refreshToken.length - 1) {
      return null;
    }

    return {
      sessionId: refreshToken.slice(0, delimiterIndex),
      refreshSecret: refreshToken.slice(delimiterIndex + 1),
    };
  }
}
