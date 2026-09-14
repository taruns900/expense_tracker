import {
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { JwtAuthGuard, requireUserId, type AuthenticatedRequest, type JwtPayload } from './jwt-auth.guard';
import { isPhoneNumber, normalizePhone } from './phone';
import { PrismaService } from './prisma.service';

class RegisterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? normalizePhone(value) : value))
  @Matches(/^\d{10,15}$/, { message: 'Enter a valid phone number.' })
  phone!: string;

  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  recoveryEmail!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

class LoginDto {
  @IsString()
  @MinLength(1)
  phone!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

class RefreshDto {
  @IsString()
  refreshToken!: string;
}

@Controller()
export class AppController {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) {}

  @Get('/health')
  health() {
    return {
      status: 'ok',
      cloudMode: process.env.CLOUD_MODE ?? 'dummy',
      renderService: process.env.RENDER_SERVICE,
      attachments: 'v2-deferred',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('/health/protected')
  protectedHealth() {
    return { status: 'ok', authenticated: true };
  }

  @Post('/auth/register')
  async register(@Body() body: RegisterDto) {
    const passwordHash = await bcrypt.hash(body.password, 10);
    try {
      const user = await this.prismaService.user.create({
        data: {
          name: body.name,
          phone: body.phone,
          recoveryEmail: body.recoveryEmail,
          passwordHash,
        },
      });
      return this.tokens(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = error.meta?.target;
        const fields = Array.isArray(target) ? target.join(' ') : String(target ?? '');
        if (fields.includes('recoveryEmail')) {
          throw new ConflictException('An account with that recovery email already exists.');
        }
        throw new ConflictException('An account with that phone number already exists.');
      }
      throw error;
    }
  }

  @Post('/auth/login')
  async login(@Body() body: LoginDto) {
    const user = await this.findLoginUser(body.phone);
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid phone number or password.');
    }
    return this.tokens(user);
  }

  @Post('/auth/refresh')
  async refresh(@Body() body: RefreshDto) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(body.refreshToken);
    } catch {
      throw new UnauthorizedException('Sign in required.');
    }
    if (payload.typ !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Sign in required.');
    }
    const user = await this.prismaService.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Sign in required.');
    }
    return this.tokens(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/auth/me')
  me(@Req() request: AuthenticatedRequest) {
    const userId = requireUserId(request);
    return {
      userId,
      phone: request.user?.phone ?? '',
      name: request.user?.name ?? '',
      recoveryEmail: request.user?.recoveryEmail ?? '',
    };
  }

  private async findLoginUser(identifier: string) {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      return this.prismaService.user.findUnique({
        where: { recoveryEmail: trimmed.toLowerCase() },
      });
    }
    const phone = normalizePhone(trimmed);
    if (!isPhoneNumber(phone)) {
      return null;
    }
    return this.prismaService.user.findUnique({ where: { phone } });
  }

  private tokens(user: { id: string; phone: string; name: string; recoveryEmail: string }) {
    const claims = {
      sub: user.id,
      phone: user.phone,
      name: user.name,
      recoveryEmail: user.recoveryEmail,
    };
    const accessToken = this.jwtService.sign({ ...claims, typ: 'access' });
    const refreshToken = this.jwtService.sign({ ...claims, typ: 'refresh' }, { expiresIn: '30d' as const });
    return {
      accessToken,
      refreshToken,
      userId: user.id,
      phone: user.phone,
      name: user.name,
      recoveryEmail: user.recoveryEmail,
    };
  }
}
