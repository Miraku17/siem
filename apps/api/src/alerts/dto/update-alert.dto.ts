import { IsIn } from 'class-validator';

const STATUSES = [
  'OPEN',
  'ACKNOWLEDGED',
  'RESOLVED',
  'FALSE_POSITIVE',
] as const;

// Payload for PATCH /api/v1/alerts/:id — an analyst changing the alert status.
export class UpdateAlertDto {
  @IsIn(STATUSES)
  status!: (typeof STATUSES)[number];
}
