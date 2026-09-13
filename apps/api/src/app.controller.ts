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
import { IsEmail, IsString, MinLength } from 'class-validator';

import { JwtAuthGuard, requireUserId, type AuthenticatedRequest } from './jwt-auth.guard';
import { PrismaService } from './prisma.service';

class AuthDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
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
  async register(@Body() body: AuthDto) {
    const passwordHash = await bcrypt.hash(body.password, 10);
    try {
      const user = await this.prismaService.user.create({
        data: { email: body.email.toLowerCase(), passwordHash },
      });
      return this.tokens(user.id, user.email);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account with that email already exists.');
      }
      throw error;
    }
  }

  @Post('/auth/login')
  async login(@Body() body: AuthDto) {
    const user = await this.prismaService.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    return this.tokens(user.id, user.email);
  }

  @Post('/auth/refresh')
  async refresh(@Body() body: { refreshToken?: string }) {
    const payload = this.jwtService.verify<{ sub: string; email: string }>(body.refreshToken ?? '');
    return this.tokens(payload.sub, payload.email);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/auth/me')
  me(@Req() request: AuthenticatedRequest) {
    const userId = requireUserId(request);
    return { userId, email: request.user?.email ?? '' };
  }

  private tokens(userId: string, email: string) {
    const accessToken = this.jwtService.sign({ sub: userId, email });
    const refreshToken = this.jwtService.sign(
      { sub: userId, email, typ: 'refresh' },
      { expiresIn: '30d' as const },
    );
    return { accessToken, refreshToken, userId, email };
  }
}
