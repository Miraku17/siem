import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.application.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // Registers a new application and issues an API key.
  register(name: string, slug: string) {
    const apiKey = `sk_live_${randomBytes(24).toString('hex')}`;
    return this.prisma.application.create({ data: { name, slug, apiKey } });
  }
}
