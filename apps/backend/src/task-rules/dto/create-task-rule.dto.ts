import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TaskType } from '@prisma/client';

export class CreateTaskRuleDto {
  @IsEnum(TaskType)
  taskType!: TaskType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  label!: string;

  @Type(() => Number)
  @IsInt()
  scoreDelta!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
