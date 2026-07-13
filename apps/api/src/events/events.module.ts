import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { DetectionModule } from '../detection/detection.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DetectionModule, AuthModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
