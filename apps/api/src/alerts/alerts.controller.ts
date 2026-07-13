import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { AlertsService } from './alerts.service';
import { UpdateAlertDto } from './dto/update-alert.dto';

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

  // Analyst changes the alert status (acknowledge / resolve / false-positive).
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAlertDto) {
    return this.alerts.updateStatus(id, dto.status);
  }
}
