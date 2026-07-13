import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { ApplicationsService } from './applications.service';

@Controller('applications')
@UseGuards(JwtGuard)
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  findAll() {
    return this.applications.findAll();
  }

  @Post()
  register(@Body() body: { name: string; slug: string }) {
    return this.applications.register(body.name, body.slug);
  }
}
