import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

// Authenticates applications via "Authorization: Bearer sk_live_..." and
// attaches the resolved applicationId to the request.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers['authorization'] ?? '';
    const apiKey = header.replace(/^Bearer\s+/i, '').trim();

    if (!apiKey) throw new UnauthorizedException('Missing API key');

    const app = await this.prisma.application.findUnique({ where: { apiKey } });
    if (!app || app.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid API key');
    }

    (req as any).applicationId = app.id;
    return true;
  }
}
