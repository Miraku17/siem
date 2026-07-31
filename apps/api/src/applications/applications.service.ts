import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateApiKey, hashApiKey, keyPrefixOf } from '../auth/api-key.util';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Explicit select: the digest is a stored credential artefact and has no
  // reason to reach the browser.
  findAll() {
    return this.prisma.application.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        keyPrefix: true,
        status: true,
        createdAt: true,
      },
    });
  }

  // Registers a new application and issues an API key. The plaintext is
  // returned here and nowhere else — only its digest is persisted, so a lost
  // key cannot be recovered and must be rotated by issuing a new one.
  async register(name: string, slug: string) {
    const apiKey = generateApiKey();
    const application = await this.prisma.application.create({
      data: {
        name,
        slug,
        apiKeyHash: hashApiKey(apiKey),
        keyPrefix: keyPrefixOf(apiKey),
      },
    });

    return { ...application, apiKey };
  }
}
