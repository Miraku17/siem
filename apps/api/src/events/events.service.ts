import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DetectionService } from '../detection/detection.service';
import { IngestEventDto } from './dto/ingest-event.dto';
import { lookupGeo } from './geoip';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly detection: DetectionService,
  ) {}

  // Normalize + persist an incoming event, then hand it to the detection engine.
  async ingest(dto: IngestEventDto, applicationId: string) {
    // GeoIP enrichment — resolve country + coords from the IP. Source-provided
    // metadata wins, so a sender that already knows the country isn't clobbered.
    const geo = await lookupGeo(dto.ip);
    const metadata = { ...geo, ...(dto.metadata ?? {}) };

    const event = await this.prisma.securityEvent.create({
      data: {
        applicationId,
        eventType: dto.event,
        severity: dto.severity ?? 'LOW',
        userId: dto.userId,
        email: dto.email,
        ipAddress: dto.ip,
        endpoint: dto.endpoint,
        method: dto.method,
        statusCode: dto.statusCode,
        userAgent: dto.userAgent,
        timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
        metadata: metadata as object,
      },
    });

    // TODO: move to a BullMQ queue for async processing at scale.
    await this.detection.evaluate(event);

    return event;
  }

  // TODO: implement the search DSL (event:, ip:, user:, severity:, application:)
  async search(_query: Record<string, string>) {
    return this.prisma.securityEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 200,
      include: {
        application: { select: { name: true, slug: true } },
      },
    });
  }
}
