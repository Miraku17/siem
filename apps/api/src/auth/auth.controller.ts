import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Exchange email + password for a JWT.
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  // Resolve the current user from the JWT (used by the dashboard on load).
  @Get('me')
  @UseGuards(JwtGuard)
  me(@Req() req: Request) {
    return (req as any).user;
  }
}
