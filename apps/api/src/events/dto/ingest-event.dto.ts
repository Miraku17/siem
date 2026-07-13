import {
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

// Payload sent by applications to POST /api/v1/events
export class IngestEventDto {
  @IsString()
  application!: string; // slug, e.g. "velocity-pickleball"

  @IsString()
  event!: string; // event type, e.g. "LOGIN_FAILED"

  @IsOptional()
  @IsIn(SEVERITIES)
  severity?: (typeof SEVERITIES)[number];

  @IsOptional()
  @IsISO8601()
  timestamp?: string;

  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() ip?: string;
  @IsOptional() @IsString() endpoint?: string;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsInt() statusCode?: number;
  @IsOptional() @IsString() userAgent?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
