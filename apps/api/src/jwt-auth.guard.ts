import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export type JwtPayload = {
  sub: string;
  phone?: string;
  name?: string;
  recoveryEmail?: string;
  email?: string;
  typ?: string;
};

export type AuthenticatedRequest = {
  headers: { authorization?: string };
  user?: JwtPayload;
};

export function requireUserId(request: AuthenticatedRequest): string {
  const userId = request.user?.sub;
  if (!userId) {
    throw new UnauthorizedException('Sign in required.');
  }
  return userId;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(JwtService) private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException('Sign in required.');
    }
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      if (payload.typ === 'refresh') {
        throw new UnauthorizedException('Sign in required.');
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Sign in required.');
    }
  }
}
