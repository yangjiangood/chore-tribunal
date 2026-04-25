import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RequestAuth } from './request-auth.interface';

type RequestWithAuth = Request & {
  auth?: RequestAuth;
};

export const CurrentAuth = createParamDecorator(
  (data: keyof RequestAuth | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
    const auth = request.auth;

    if (!auth) {
      return undefined;
    }

    return data ? auth[data] : auth;
  },
);
