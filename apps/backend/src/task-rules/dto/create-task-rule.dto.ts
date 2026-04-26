import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { TaskType } from '@prisma/client';

export class CreateTaskRuleDto {
  @IsEnum(TaskType)
  taskType!: TaskType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  label!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
