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
        event: { include: { application: { select: { name: true, slug: true } } } },
        incident: true,
      },
    });
  }

  updateStatus(id: string, status: string) {
    return this.prisma.alert.update({
      where: { id },
      data: { status: status as any },
    });
  }

  // TODO: promote to incident.
}
