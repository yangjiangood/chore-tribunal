import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  memberId!: string;

  @IsString()
  @IsNotEmpty()
  taskRuleId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  clientEventId!: string;

  @IsOptional()
  @IsISO8601()
  timestamp?: string;
}
