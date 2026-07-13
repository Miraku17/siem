import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.incident.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // TODO: create from alert(s), assign, change status/priority, case timeline.
}
