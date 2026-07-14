import { IsIn, IsOptional } from 'class-validator';

const STATUSES = [
  'OPEN',
  'ACKNOWLEDGED',
  'RESOLVED',
  'FALSE_POSITIVE',
] as const;

const DISPOSITIONS = [
  'BENIGN',
  'FALSE_POSITIVE',
  'TRUE_POSITIVE_NO_IMPACT',
  'TRUE_POSITIVE',
] as const;

// PATCH /api/v1/alerts/:id — an analyst updating workflow status and/or the
// triage verdict. Both optional; send whichever changed.
export class UpdateAlertDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsIn(DISPOSITIONS)
  disposition?: (typeof DISPOSITIONS)[number];
}
