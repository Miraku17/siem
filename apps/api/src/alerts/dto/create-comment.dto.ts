import { IsString, MaxLength, MinLength } from 'class-validator';

// POST /api/v1/alerts/:id/comments — an analyst note on an alert.
export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}
