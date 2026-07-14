import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/jwt.guard';
import { AlertsService } from './alerts.service';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('alerts')
@UseGuards(JwtGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  findAll() {
    return this.alerts.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.alerts.findOne(id);
  }

  // Analyst updates workflow status and/or the triage disposition.
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAlertDto) {
    return this.alerts.update(id, dto);
  }

  // Analyst adds a comment; the author is taken from the JWT.
  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @Req() req: Request,
  ) {
    const author = (req as any).user?.email ?? 'unknown';
    return this.alerts.addComment(id, author, dto.body);
  }
}
