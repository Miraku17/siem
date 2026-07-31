import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ApiKeyGuard } from './api-key.guard';
import { JwtGuard } from './jwt.guard';
import { RolesGuard } from './roles.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { requireJwtSecret } from './jwt-secret';

@Module({
  imports: [
    JwtModule.registerAsync({
      // Async so the secret is resolved at module init rather than at import
      // time — a bad/missing JWT_SECRET then surfaces as a clean startup error.
      useFactory: () => ({
        secret: requireJwtSecret(),
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [ApiKeyGuard, JwtGuard, RolesGuard, AuthService],
  exports: [ApiKeyGuard, JwtGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
