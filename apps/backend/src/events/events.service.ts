import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EventStatus,
  MemberStatus,
  Prisma,
  TaskRuleStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { BoardService } from '../board/board.service';
import { getWeekIdForTimezone } from '../common/utils/week.util';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventsQueryDto } from './dto/list-events.query';
import { RevertEventDto } from './dto/revert-event.dto';

const UNDO_WINDOW_MS = 5000;

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardService: BoardService,
    private readonly realtimeService: RealtimeService,
  ) {}

  getModuleInfo() {
    return {
      module: 'events',
      status: 'event-read-write-implemented',
    };
  }

  async listEvents(familyId: string, query: ListEventsQueryDto) {
    await this.boardService.confirmExpiredPendingEvents(familyId);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.TaskEventWhereInput = {
      familyId,
      ...(query.weekId ? { weekId: query.weekId } : {}),
      ...(query.memberId ? { memberId: query.memberId } : {}),
      ...(query.taskType
        ? {
            taskTypeSnapshot: query.taskType,
          }
        : {}),
      ...(query.taskLabel
        ? {
            taskLabelSnapshot: {
              contains: query.taskLabel,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.scoreMin !== undefined || query.scoreMax !== undefined
        ? {
            scoreDeltaSnapshot: {
              ...(query.scoreMin !== undefined ? { gte: query.scoreMin } : {}),
              ...(query.scoreMax !== undefined ? { lte: query.scoreMax } : {}),
            },
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [totalCount, items] = await Promise.all([
      this.prisma.taskEvent.count({ where }),
      this.prisma.taskEvent.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          memberId: true,
          memberNicknameSnapshot: true,
          taskLabelSnapshot: true,
          taskTypeSnapshot: true,
          scoreDeltaSnapshot: true,
          status: true,
          weekId: true,
          createdAt: true,
          confirmedAt: true,
          revertedAt: true,
        },
      }),
    ]);

    return {
      items: items.map((item) => ({
        eventId: item.id,
        memberId: item.memberId,
        memberNickname: item.memberNicknameSnapshot,
        taskLabel: item.taskLabelSnapshot,
        taskType: item.taskTypeSnapshot,
        scoreDelta: item.scoreDeltaSnapshot,
        status: item.status,
        weekId: item.weekId,
        createdAt: item.createdAt,
        confirmedAt: item.confirmedAt,
        revertedAt: item.revertedAt,
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.max(Math.ceil(totalCount / pageSize), 1),
      },
    };
  }

  async createEvent(familyId: string, dto: CreateEventDto) {
    const family = await this.prisma.family.findUniqueOrThrow({
      where: {
        id: familyId,
      },
      select: {
        id: true,
        timezone: true,
        currentWeekId: true,
      },
    });

    const [member, rule] = await Promise.all([
      this.prisma.member.findFirst({
        where: {
          id: dto.memberId,
          familyId,
        },
      }),
      this.prisma.taskRule.findFirst({
        where: {
          id: dto.taskRuleId,
          familyId,
        },
      }),
    ]);

    if (!member) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: '成员不存在',
      });
    }

    if (member.status !== MemberStatus.ACTIVE) {
      throw new ConflictException({
        code: 'MEMBER_DISABLED',
        message: '当前成员不可用，无法打卡',
      });
    }

    if (!rule) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: '任务规则不存在',
      });
    }

    if (rule.status !== TaskRuleStatus.ACTIVE) {
      throw new ConflictException({
        code: 'RULE_DISABLED',
        message: '当前规则不可用，无法打卡',
      });
    }

    const createdAt = dto.timestamp ? new Date(dto.timestamp) : new Date();

    if (Number.isNaN(createdAt.getTime())) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '时间戳格式不合法',
      });
    }

    const weekId = getWeekIdForTimezone(createdAt, family.timezone);
    const undoToken = randomBytes(24).toString('base64url');
    const undoExpiresAt = new Date(createdAt.getTime() + UNDO_WINDOW_MS);

    try {
      const event = await this.prisma.$transaction(async (tx) => {
        if (family.currentWeekId !== weekId) {
          await tx.family.update({
            where: {
              id: familyId,
            },
            data: {
              currentWeekId: weekId,
            },
          });
        }

        return tx.taskEvent.create({
          data: {
            familyId,
            memberId: member.id,
            taskRuleId: rule.id,
            weekId,
            taskTypeSnapshot: rule.taskType,
            taskLabelSnapshot: rule.label,
            scoreDeltaSnapshot: rule.scoreDelta,
            memberNicknameSnapshot: member.nickname,
            clientEventId: dto.clientEventId,
            undoToken,
            undoExpiresAt,
            status: EventStatus.PENDING,
            createdAt,
          },
        });
      });

      const boardSnapshot =
        await this.boardService.getCurrentBoardSnapshot(familyId);

      await this.realtimeService.publishEventCreated(familyId, {
        eventId: event.id,
        memberId: event.memberId,
        status: event.status,
      });

      return {
        event: {
          serverEventId: event.id,
          clientEventId: event.clientEventId,
          status: event.status,
          undoToken: event.undoToken,
          undoExpiresAt: event.undoExpiresAt,
        },
        boardSnapshot,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: '客户端事件 ID 已存在，请勿重复提交',
        });
      }

      throw error;
    }
  }

  async revertEvent(familyId: string, eventId: string, dto: RevertEventDto) {
    await this.boardService.confirmExpiredPendingEvents(familyId);

    const event = await this.prisma.taskEvent.findFirst({
      where: {
        id: eventId,
        familyId,
      },
    });

    if (!event) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: '事件不存在',
      });
    }

    if (event.status === EventStatus.REVERTED) {
      throw new ConflictException({
        code: 'EVENT_ALREADY_REVERTED',
        message: '事件已撤销',
      });
    }

    if (event.undoToken !== dto.undoToken) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '撤销凭证不匹配',
      });
    }

    if (
      event.status !== EventStatus.PENDING ||
      event.undoExpiresAt <= new Date()
    ) {
      throw new ConflictException({
        code: 'UNDO_WINDOW_EXPIRED',
        message: '撤销窗口已过期',
      });
    }

    const reverted = await this.prisma.taskEvent.update({
      where: {
        id: event.id,
      },
      data: {
        status: EventStatus.REVERTED,
        revertedAt: new Date(),
      },
    });

    const boardSnapshot =
      await this.boardService.getCurrentBoardSnapshot(familyId);

    await this.realtimeService.publishEventReverted(familyId, {
      eventId: reverted.id,
      status: reverted.status,
    });

    return {
      reverted: true,
      eventStatus: reverted.status,
      boardSnapshot,
    };
  }
}
