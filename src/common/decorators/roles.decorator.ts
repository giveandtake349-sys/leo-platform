import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['idempotency-key'] as string;
  },
);
