import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RequestAuth } from '../common/auth/request-auth.interface';
import { AccessTokenPayload } from './access-token-payload.interface';

type RequestWithAuth = Request & {
  auth?: RequestAuth;
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '缺少访问令牌',
      });
    }

    const token = authorization.slice('Bearer '.length);
    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '访问令牌无效或已过期',
      });
    }

    const session = await this.prisma.familySession.findFirst({
      where: {
        id: payload.sessionId,
        familyId: payload.familyId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: '登录会话不存在或已失效',
      });
    }

    request.auth = {
      accountId: payload.sub,
      familyId: payload.familyId,
      sessionId: payload.sessionId,
    };

    return true;
  }
}
