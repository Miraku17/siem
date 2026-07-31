import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApplicationsService } from './applications.service';
import { RegisterApplicationDto } from './dto/register-application.dto';

@Controller('applications')
@UseGuards(JwtGuard, RolesGuard)
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  findAll() {
    return this.applications.findAll();
  }

  // Registering an application issues a live ingestion key, so it is an admin
  // action. The response carries the plaintext key — the only time it exists.
  @Post()
  @Roles('ADMIN')
  register(@Body() dto: RegisterApplicationDto) {
    return this.applications.register(dto.name, dto.slug);
  }
}
