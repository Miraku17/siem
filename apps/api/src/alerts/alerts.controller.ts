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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AlertsService } from './alerts.service';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('alerts')
@UseGuards(JwtGuard, RolesGuard)
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

  // Analyst updates workflow status and/or the triage disposition. VIEWERs get
  // the dashboard read-only.
  @Patch(':id')
  @Roles('ADMIN', 'ANALYST')
  update(@Param('id') id: string, @Body() dto: UpdateAlertDto) {
    return this.alerts.update(id, dto);
  }

  // Analyst adds a comment; the author is taken from the JWT.
  @Post(':id/comments')
  @Roles('ADMIN', 'ANALYST')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @Req() req: Request,
  ) {
    const author = (req as any).user?.email ?? 'unknown';
    return this.alerts.addComment(id, author, dto.body);
  }
}
