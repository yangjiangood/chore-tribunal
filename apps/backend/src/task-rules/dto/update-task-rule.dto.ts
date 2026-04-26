import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { TaskRuleStatus, TaskType } from '@prisma/client';

export class UpdateTaskRuleDto {
  @IsOptional()
  @IsEnum(TaskRuleStatus)
  status?: TaskRuleStatus;

  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  scoreDelta?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
