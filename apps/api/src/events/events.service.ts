import { Injectable } from '@nestjs/common';
import { Prisma, Severity } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DetectionService } from '../detection/detection.service';
import { IngestEventDto } from './dto/ingest-event.dto';
import { lookupGeo } from './geoip';
import { lookupThreat } from './threat-intel';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly detection: DetectionService,
  ) {}

  // Normalize + persist an incoming event, then hand it to the detection engine.
  async ingest(dto: IngestEventDto, applicationId: string) {
    // Enrich from the IP: GeoIP (country + coords) and threat-intel reputation,
    // in parallel.
    //
    // Source metadata is UNTRUSTED for enrichment-owned fields, because those
    // fields drive detection: `metadata.country` gates auth.new_country and
    // `metadata.threat` gates intel.malicious_ip. A sender that could set them
    // could silence its own alerts. So `threat` is stripped from the payload
    // outright and only ever written by enrichment, and resolved geo overwrites
    // whatever the sender claimed. Everything else the application sends is
    // preserved untouched.
    const [geo, threat] = await Promise.all([
      lookupGeo(dto.ip),
      lookupThreat(dto.ip),
    ]);

    const { threat: _discarded, ...sourceMetadata } = dto.metadata ?? {};
    const metadata: Record<string, unknown> = { ...sourceMetadata };

    // Only overwrite with values enrichment actually resolved — an unresolvable
    // IP (private range, lookup failure) leaves a source-provided country in
    // place rather than blanking it.
    for (const [key, value] of Object.entries(geo)) {
      if (value !== undefined) metadata[key] = value;
    }
    if (threat.score != null || threat.listed != null) {
      metadata.threat = threat;
    }

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

  // Paginated search over the full event stream. Filtering happens in the
  // database so results aren't limited to a recently-loaded window.
  // Params: page, pageSize, q (free text), application (slug), severity, eventType.
  async search(query: Record<string, string>) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(query.pageSize, 10) || 25),
    );

    const where: Prisma.SecurityEventWhereInput = {};
    if (query.application) where.application = { slug: query.application };
    if (query.eventType) where.eventType = query.eventType;
    if (
      query.severity &&
      (Object.values(Severity) as string[]).includes(query.severity)
    ) {
      where.severity = query.severity as Severity;
    }
    const term = query.q?.trim();
    if (term) {
      where.OR = [
        { eventType: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { userId: { contains: term, mode: 'insensitive' } },
        { ipAddress: { contains: term, mode: 'insensitive' } },
        { application: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.securityEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          application: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.securityEvent.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  // Distinct values for the dashboard's filter dropdowns. Needed because the
  // paginated list no longer contains every event type / application.
  async facets() {
    const [types, applications] = await Promise.all([
      this.prisma.securityEvent.findMany({
        distinct: ['eventType'],
        select: { eventType: true },
        orderBy: { eventType: 'asc' },
      }),
      this.prisma.application.findMany({
        select: { name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return { eventTypes: types.map((t) => t.eventType), applications };
  }
}
