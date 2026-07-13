import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { JwtGuard } from '../auth/jwt.guard';
import { EventsService } from './events.service';
import { IngestEventDto } from './dto/ingest-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  // Applications push events here using their API key.
  @Post()
  @UseGuards(ApiKeyGuard)
  async ingest(@Body() dto: IngestEventDto, @Req() req: Request) {
    const applicationId = (req as any).applicationId as string;
    await this.events.ingest(dto, applicationId);
    return { success: true };
  }

  // Dashboard reads events (search / filter). Protected by JWT.
  @Get()
  @UseGuards(JwtGuard)
  async list(@Query() query: Record<string, string>) {
    return this.events.search(query);
  }
}
