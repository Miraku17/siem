import { Injectable, Logger } from '@nestjs/common';
import { SecurityEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DETECTION_RULES } from './rules';
import { DedupeKey } from './detection-rule.interface';

const DEFAULT_COOLDOWN_MS = 15 * 60_000; // 15 minutes

@Injectable()
export class DetectionService {
  private readonly logger = new Logger(DetectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Runs every registered rule against the event and raises alerts on matches,
  // suppressing duplicates per the rule's dedupe key.
  async evaluate(event: SecurityEvent): Promise<void> {
    for (const rule of DETECTION_RULES) {
      try {
        const match = await rule.evaluate(event, this.prisma);
        if (!match) continue;

        if (match.dedupe && (await this.isDuplicate(rule.id, match.dedupe))) {
          this.logger.debug(
            `Deduped ${rule.id} for ${match.dedupe.field}=${match.dedupe.value}`,
          );
          continue;
        }

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

  // A duplicate = a recent alert from the same rule whose triggering event
  // shares the dedupe entity (same IP / user / email).
  private async isDuplicate(ruleId: string, dedupe: DedupeKey): Promise<boolean> {
    const windowMs = dedupe.windowMs ?? DEFAULT_COOLDOWN_MS;
    const existing = await this.prisma.alert.findFirst({
      where: {
        ruleId,
        createdAt: { gte: new Date(Date.now() - windowMs) },
        event: { is: { [dedupe.field]: dedupe.value } as any },
      },
      select: { id: true },
    });
    return existing !== null;
  }
}
