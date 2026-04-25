import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TaskRuleStatus } from '@prisma/client';
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
    try {
      return await this.prisma.taskRule.create({
        data: {
          familyId,
          taskType: dto.taskType,
          label: dto.label,
          scoreDelta: dto.scoreDelta,
          sortOrder: dto.sortOrder ?? 0,
          isPinned: dto.isPinned ?? false,
        },
      });
    } catch (error) {
      this.rethrowConflict(error, '相同分类下的规则标签已存在');
      throw error;
    }
  }

  async updateTaskRule(
    familyId: string,
    ruleId: string,
    dto: UpdateTaskRuleDto,
  ) {
    await this.findTaskRuleOrThrow(familyId, ruleId);

    try {
      return await this.prisma.taskRule.update({
        where: {
          id: ruleId,
        },
        data: dto,
      });
    } catch (error) {
      this.rethrowConflict(error, '相同分类下的规则标签已存在');
      throw error;
    }
  }

  async disableTaskRule(
    familyId: string,
    ruleId: string,
    dto: DisableTaskRuleDto,
  ) {
    void dto;
    await this.findTaskRuleOrThrow(familyId, ruleId);

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
        message: '存在未找到的规则，无法重排',
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
        message: '规则不存在',
      });
    }

    return taskRule;
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
}
