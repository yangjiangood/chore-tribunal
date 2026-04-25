import { IsEnum, IsOptional } from 'class-validator';
import { TaskRuleStatus, TaskType } from '@prisma/client';

export class ListTaskRulesQueryDto {
  @IsOptional()
  @IsEnum(TaskRuleStatus)
  status?: TaskRuleStatus;

  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;
}
