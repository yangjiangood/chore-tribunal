import { Injectable } from '@nestjs/common';
import { MemberStatus, TaskRuleStatus } from '@prisma/client';
import { BoardService } from '../board/board.service';
import { getWeekIdForTimezone } from '../common/utils/week.util';
import { PrismaService } from '../prisma/prisma.service';
import { buildDefaultPreferences } from '../preferences/preferences.defaults';
import { ensureDefaultTaskRules } from '../task-rules/task-rules.defaults';

@Injectable()
export class FamiliesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardService: BoardService,
  ) {}

  getModuleInfo() {
    return {
      module: 'families',
      status: 'bootstrap-implemented',
    };
  }

  async getBootstrap(familyId: string) {
    await ensureDefaultTaskRules(this.prisma, familyId);

    const familyRecord = await this.prisma.family.findUniqueOrThrow({
      where: {
        id: familyId,
      },
      select: {
        id: true,
        name: true,
        timezone: true,
        currentWeekId: true,
      },
    });

    const calculatedCurrentWeekId = getWeekIdForTimezone(
      new Date(),
      familyRecord.timezone,
    );

    if (familyRecord.currentWeekId !== calculatedCurrentWeekId) {
      await this.prisma.family.update({
        where: {
          id: familyId,
        },
        data: {
          currentWeekId: calculatedCurrentWeekId,
        },
      });
    }

    const family = {
      ...familyRecord,
      currentWeekId: calculatedCurrentWeekId,
    };

    const [members, taskRules, preference, currentBoardSnapshot] =
      await Promise.all([
        this.prisma.member.findMany({
          where: {
            familyId,
            status: MemberStatus.ACTIVE,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        }),
        this.prisma.taskRule.findMany({
          where: {
            familyId,
            status: TaskRuleStatus.ACTIVE,
          },
          orderBy: [
            { taskType: 'asc' },
            { sortOrder: 'asc' },
            { createdAt: 'asc' },
          ],
        }),
        this.prisma.preference.findUnique({
          where: {
            familyId,
          },
        }),
        this.boardService.getCurrentBoardSnapshot(familyId),
      ]);

    return {
      family,
      members,
      taskRules,
      preferences: preference ?? buildDefaultPreferences(familyId),
      currentBoardSnapshot,
    };
  }
}
