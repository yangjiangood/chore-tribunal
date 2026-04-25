import { EventStatus, MemberStatus, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BoardSnapshot {
  rankings: Array<{
    memberId: string;
    nickname: string;
    avatarType: string;
    avatarUrl: string | null;
    avatarValue: string | null;
    cardColor: string;
    sortOrder: number;
    score: number;
    confirmedCount: number;
    pendingCount: number;
  }>;
  recentLogs: Array<{
    eventId: string;
    memberId: string;
    memberNickname: string;
    taskLabel: string;
    taskType: string;
    scoreDelta: number;
    status: EventStatus;
    createdAt: Date;
  }>;
  scoreSummary: {
    totalScore: number;
    totalEvents: number;
    confirmedEvents: number;
    pendingEvents: number;
    revertedEvents: number;
  };
}

const boardMemberSelect = {
  id: true,
  nickname: true,
  avatarType: true,
  avatarUrl: true,
  avatarValue: true,
  cardColor: true,
  sortOrder: true,
} satisfies Prisma.MemberSelect;

const boardEventSelect = {
  id: true,
  memberId: true,
  memberNicknameSnapshot: true,
  taskLabelSnapshot: true,
  taskTypeSnapshot: true,
  scoreDeltaSnapshot: true,
  status: true,
  createdAt: true,
} satisfies Prisma.TaskEventSelect;

@Injectable()
export class BoardService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentBoardSnapshot(familyId: string): Promise<BoardSnapshot> {
    await this.confirmExpiredPendingEvents(familyId);

    const family = await this.prisma.family.findUniqueOrThrow({
      where: { id: familyId },
      select: {
        currentWeekId: true,
      },
    });

    const [members, events] = await Promise.all([
      this.prisma.member.findMany({
        where: {
          familyId,
          status: MemberStatus.ACTIVE,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: boardMemberSelect,
      }),
      this.prisma.taskEvent.findMany({
        where: {
          familyId,
          weekId: family.currentWeekId,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: boardEventSelect,
      }),
    ]);

    const rankingMap = new Map<string, BoardSnapshot['rankings'][number]>(
      members.map((member) => [
        member.id,
        {
          memberId: member.id,
          nickname: member.nickname,
          avatarType: member.avatarType,
          avatarUrl: member.avatarUrl,
          avatarValue: member.avatarValue,
          cardColor: member.cardColor,
          sortOrder: member.sortOrder,
          score: 0,
          confirmedCount: 0,
          pendingCount: 0,
        },
      ]),
    );

    let confirmedEvents = 0;
    let pendingEvents = 0;
    let revertedEvents = 0;

    for (const event of events) {
      if (event.status === EventStatus.REVERTED) {
        revertedEvents += 1;
        continue;
      }

      const ranking = rankingMap.get(event.memberId);

      if (ranking) {
        ranking.score += event.scoreDeltaSnapshot;

        if (event.status === EventStatus.CONFIRMED) {
          ranking.confirmedCount += 1;
          confirmedEvents += 1;
        }

        if (event.status === EventStatus.PENDING) {
          ranking.pendingCount += 1;
          pendingEvents += 1;
        }
      }
    }

    return {
      rankings: Array.from(rankingMap.values()).sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }

        return left.nickname.localeCompare(right.nickname, 'zh-CN');
      }),
      recentLogs: events
        .filter((event) => event.status !== EventStatus.REVERTED)
        .slice(0, 10)
        .map((event) => ({
          eventId: event.id,
          memberId: event.memberId,
          memberNickname: event.memberNicknameSnapshot,
          taskLabel: event.taskLabelSnapshot,
          taskType: event.taskTypeSnapshot,
          scoreDelta: event.scoreDeltaSnapshot,
          status: event.status,
          createdAt: event.createdAt,
        })),
      scoreSummary: {
        totalScore: Array.from(rankingMap.values()).reduce(
          (sum, item) => sum + item.score,
          0,
        ),
        totalEvents: confirmedEvents + pendingEvents,
        confirmedEvents,
        pendingEvents,
        revertedEvents,
      },
    };
  }

  async confirmExpiredPendingEvents(familyId: string) {
    const now = new Date();

    await this.prisma.taskEvent.updateMany({
      where: {
        familyId,
        status: EventStatus.PENDING,
        undoExpiresAt: {
          lte: now,
        },
      },
      data: {
        status: EventStatus.CONFIRMED,
        confirmedAt: now,
      },
    });
  }
}
