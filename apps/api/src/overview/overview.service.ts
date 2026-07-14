import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  // Aggregate everything the Overview dashboard renders.
  async summary() {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalEvents,
      events24h,
      failedLogins24h,
      applications,
      incidents,
      users,
      recentAlerts,
      alertsBySeverity,
      openBySeverity,
    ] = await Promise.all([
      this.prisma.securityEvent.count(),
      this.prisma.securityEvent.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.securityEvent.count({
        where: { eventType: 'LOGIN_FAILED', createdAt: { gte: since24h } },
      }),
      this.prisma.application.count(),
      this.prisma.incident.count(),
      this.prisma.user.count(),
      this.prisma.alert.findMany({ orderBy: { createdAt: 'desc' }, take: 6 }),
      this.prisma.alert.groupBy({ by: ['severity'], _count: { _all: true } }),
      this.prisma.alert.groupBy({
        by: ['severity'],
        where: { status: 'OPEN' },
        _count: { _all: true },
      }),
    ]);

    const bySev = (rows: { severity: Severity; _count: { _all: number } }[]) => {
      const m: Record<Severity, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
      rows.forEach((r) => (m[r.severity] = r._count._all));
      return m;
    };
    const sev = bySev(alertsBySeverity as any);
    const open = bySev(openBySeverity as any);
    const totalAlerts = sev.LOW + sev.MEDIUM + sev.HIGH + sev.CRITICAL;

    return {
      totals: {
        events: totalEvents,
        events24h,
        failedLogins24h,
        applications,
        incidents,
        users,
      },
      alerts: {
        total: totalAlerts,
        critical: sev.CRITICAL,
        high: sev.HIGH,
        medium: sev.MEDIUM,
        low: sev.LOW,
        criticalOpen: open.CRITICAL,
        highOpen: open.HIGH,
        mediumOpen: open.MEDIUM,
      },
      recentAlerts,
      eventTypes: await this.eventTypes(),
      logSources: await this.logSources(since24h),
      geo: await this.geo(),
    };
  }

  // Distribution of events by type (top 6, remainder folded into "Other").
  private async eventTypes() {
    const rows = await this.prisma.securityEvent.groupBy({
      by: ['eventType'],
      _count: { _all: true },
    });
    const sorted = rows
      .map((r) => ({ type: r.eventType, count: r._count._all }))
      .sort((a, b) => b.count - a.count);
    const top = sorted.slice(0, 6);
    const rest = sorted.slice(6).reduce((s, r) => s + r.count, 0);
    if (rest > 0) top.push({ type: 'Other', count: rest });
    return top;
  }

  // Per-application hourly event counts over the last 24h (stacked area).
  private async logSources(since: Date) {
    const rows = await this.prisma.securityEvent.findMany({
      where: { createdAt: { gte: since } },
      select: {
        createdAt: true,
        application: { select: { name: true, slug: true } },
      },
    });

    const hours: string[] = [];
    const starts: number[] = [];
    for (let i = 23; i >= 0; i--) {
      const start = new Date(Date.now() - i * 60 * 60 * 1000);
      start.setMinutes(0, 0, 0);
      hours.push(start.toISOString());
      starts.push(start.getTime());
    }

    const apps = new Map<string, string>();
    rows.forEach((r) => {
      if (r.application) apps.set(r.application.slug, r.application.name);
    });

    const series = [...apps.entries()].map(([slug, name]) => {
      const data = starts.map((s) => {
        const end = s + 60 * 60 * 1000;
        return rows.filter(
          (r) =>
            r.application?.slug === slug &&
            r.createdAt.getTime() >= s &&
            r.createdAt.getTime() < end,
        ).length;
      });
      return { name, data };
    });

    return { hours, series };
  }

  // Event counts grouped by country (with coordinates) from event metadata,
  // for the map. Coords come from GeoIP enrichment at ingestion.
  private async geo() {
    const rows = await this.prisma.securityEvent.findMany({
      select: { metadata: true },
    });
    const map = new Map<
      string,
      { count: number; lat?: number; lng?: number }
    >();
    rows.forEach((r) => {
      const m = r.metadata as Record<string, unknown> | null;
      const country = m?.country;
      if (typeof country !== 'string' || !country.trim()) return;
      const entry = map.get(country) ?? { count: 0 };
      entry.count++;
      if (entry.lat == null && typeof m?.lat === 'number') {
        entry.lat = m.lat as number;
        entry.lng = m.lng as number;
      }
      map.set(country, entry);
    });
    return [...map.entries()].map(([country, v]) => ({
      country,
      count: v.count,
      lat: v.lat,
      lng: v.lng,
    }));
  }
}
