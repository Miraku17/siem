import { Injectable, Logger } from '@nestjs/common';
import { SecurityEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DETECTION_RULES } from './rules';

@Injectable()
export class DetectionService {
  private readonly logger = new Logger(DetectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Runs every registered rule against the event and raises alerts on matches.
  async evaluate(event: SecurityEvent): Promise<void> {
    for (const rule of DETECTION_RULES) {
      try {
        const match = await rule.evaluate(event, this.prisma);
        if (!match) continue;

        await this.prisma.alert.create({
          data: {
            title: match.title,
            severity: match.severity,
            description: match.description,
            ruleId: rule.id,
            eventId: event.id,
          },
        });
        this.logger.warn(`Alert raised by ${rule.id}: ${match.title}`);
      } catch (err) {
        this.logger.error(`Rule ${rule.id} failed`, err as Error);
      }
    }
  }
}
