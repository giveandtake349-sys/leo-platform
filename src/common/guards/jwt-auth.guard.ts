import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionEntity } from '../../modules/auth/entities/otp-request.entity';
import { PUBLIC_KEY, ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(SessionEntity)
    private readonly sessionRepo: Repository<SessionEntity>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const request = ctx.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.get('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const session = await this.sessionRepo.findOne({ where: { jwtId: payload.jti } });
    if (!session || session.revokedAt) throw new UnauthorizedException('Session revoked');

    request.user = payload;
    return true;
  }

  private extractToken(request: any): string | null {
    const auth = request.headers?.['authorization'] as string;
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!requiredRoles.includes(user?.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
