import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AppController } from './app.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from './prisma.service';
import { SyncController } from './sync.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dummy-jwt-secret-change-me',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as `${number}d` },
    }),
  ],
  controllers: [AppController, SyncController],
  providers: [PrismaService, JwtAuthGuard],
})
export class AppModule {}
