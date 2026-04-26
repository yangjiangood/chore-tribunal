import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskRuleStatus, TaskType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskRuleDto } from './dto/create-task-rule.dto';
import { DisableTaskRuleDto } from './dto/disable-task-rule.dto';
import { ListTaskRulesQueryDto } from './dto/list-task-rules.query';
import { ReorderTaskRulesDto } from './dto/reorder-task-rules.dto';
import { UpdateTaskRuleDto } from './dto/update-task-rule.dto';

@Injectable()
export class TaskRulesService {
  constructor(private readonly prisma: PrismaService) {}

  getModuleInfo() {
    return {
      module: 'task-rules',
      status: 'crud-implemented',
    };
  }

  async listTaskRules(familyId: string, query: ListTaskRulesQueryDto) {
    return this.prisma.taskRule.findMany({
      where: {
        familyId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.taskType ? { taskType: query.taskType } : {}),
      },
      orderBy: [
        { taskType: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async createTaskRule(familyId: string, dto: CreateTaskRuleDto) {
    await this.ensureUniqueRuleLabel(familyId, dto.label);

    try {
      return await this.prisma.taskRule.create({
        data: {
          familyId,
          taskType: dto.taskType,
          label: dto.label,
          scoreDelta: this.getScoreDeltaByTaskType(dto.taskType),
          sortOrder: dto.sortOrder ?? 0,
          isPinned: false,
        },
      });
    } catch (error) {
      this.rethrowConflict(error, '相同分值档位下已存在同名规则标签。');
      throw error;
    }
  }

  async updateTaskRule(
    familyId: string,
    ruleId: string,
    dto: UpdateTaskRuleDto,
  ) {
    const taskRule = await this.findTaskRuleOrThrow(familyId, ruleId);
    const nextLabel = dto.label?.trim() ?? taskRule.label;

    const nextTaskType = dto.taskType;
    const wantsTierChange = nextTaskType && nextTaskType !== taskRule.taskType;

    if (taskRule.isPinned && wantsTierChange) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: '固定家务标签的档位不可修改。',
      });
    }

    if (dto.label !== undefined || nextTaskType) {
      await this.ensureUniqueRuleLabel(familyId, nextLabel, ruleId);
    }

    try {
      return await this.prisma.taskRule.update({
        where: {
          id: ruleId,
        },
        data: {
          ...(dto.status ? { status: dto.status } : {}),
          ...(nextTaskType
            ? {
                taskType: nextTaskType,
                scoreDelta: this.getScoreDeltaByTaskType(nextTaskType),
              }
            : {}),
          ...(dto.label !== undefined ? { label: nextLabel } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
    } catch (error) {
      this.rethrowConflict(error, '相同分值档位下已存在同名规则标签。');
      throw error;
    }
  }

  async disableTaskRule(
    familyId: string,
    ruleId: string,
    dto: DisableTaskRuleDto,
  ) {
    void dto;
    const taskRule = await this.findTaskRuleOrThrow(familyId, ruleId);

    if (taskRule.isPinned) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: '固定家务标签不可停用。',
      });
    }

    return this.prisma.taskRule.update({
      where: {
        id: ruleId,
      },
      data: {
        status: TaskRuleStatus.DISABLED,
      },
    });
  }

  async reorderTaskRules(familyId: string, dto: ReorderTaskRulesDto) {
    const ids = dto.items.map((item) => item.id);
    const existingCount = await this.prisma.taskRule.count({
      where: {
        familyId,
        id: {
          in: ids,
        },
      },
    });

    if (existingCount !== ids.length) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: '存在未找到的规则，无法重排。',
      });
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.taskRule.update({
          where: {
            id: item.id,
          },
          data: {
            sortOrder: item.sortOrder,
          },
        }),
      ),
    );

    return this.listTaskRules(familyId, {});
  }

  private async findTaskRuleOrThrow(familyId: string, ruleId: string) {
    const taskRule = await this.prisma.taskRule.findFirst({
      where: {
        id: ruleId,
        familyId,
      },
    });

    if (!taskRule) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: '规则不存在。',
      });
    }

    return taskRule;
  }

  private async ensureUniqueRuleLabel(
    familyId: string,
    label: string,
    excludeRuleId?: string,
  ) {
    const duplicate = await this.prisma.taskRule.findFirst({
      where: {
        familyId,
        label,
        ...(excludeRuleId ? { id: { not: excludeRuleId } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: '当前家庭中已存在同名家务标签，请先修改原标签或更换名称。',
      });
    }
  }

  private rethrowConflict(error: unknown, message: string) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: 'CONFLICT',
        message,
      });
    }
  }

  private getScoreDeltaByTaskType(taskType: TaskType) {
    if (taskType === TaskType.LIGHT) {
      return 1;
    }

    if (taskType === TaskType.CORE) {
      return 3;
    }

    return 5;
  }
}
