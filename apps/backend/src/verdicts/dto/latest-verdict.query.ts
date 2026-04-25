import { IsOptional, IsString, MaxLength } from 'class-validator';

export class LatestVerdictQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  weekId?: string;
}
