import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { IncidentsService } from './incidents.service';

@Controller('incidents')
@UseGuards(JwtGuard)
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Get()
  findAll() {
    return this.incidents.findAll();
  }
}
