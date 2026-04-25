import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  defaultFullscreen?: boolean;

  @IsOptional()
  @IsBoolean()
  soundEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  motionEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  fontScale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  themeStyle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  logSpeed?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cardDensity?: string;

  @IsOptional()
  @IsBoolean()
  idleReminderEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  verdictPersona?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  verdictToxicityLevel?: number;

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
