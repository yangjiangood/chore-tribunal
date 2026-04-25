import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class GenerateVerdictDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  weekId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  persona?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  toxicityLevel?: number;

  @IsOptional()
  @IsBoolean()
  allowAttack?: boolean;

  @IsOptional()
  @IsBoolean()
  allowHumiliation?: boolean;

  @IsOptional()
  @IsBoolean()
  allowLabeling?: boolean;
}
