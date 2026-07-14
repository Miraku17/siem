import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.alert.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.alert.findUnique({
      where: { id },
      include: {
        event: {
          include: { application: { select: { name: true, slug: true } } },
        },
        incident: true,
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  // Update workflow status and/or the analyst's triage verdict.
  update(id: string, data: { status?: string; disposition?: string }) {
    return this.prisma.alert.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status as any } : {}),
        ...(data.disposition
          ? { disposition: data.disposition as any }
          : {}),
      },
    });
  }

  addComment(id: string, author: string, body: string) {
    return this.prisma.alertComment.create({
      data: { alertId: id, author, body },
    });
  }

  // TODO: promote to incident.
}
