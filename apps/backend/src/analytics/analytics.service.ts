import { EventStatus, MemberStatus, TaskType } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { BoardService } from '../board/board.service';
import { getWeekIdForTimezone } from '../common/utils/week.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnalyticsOverviewQueryDto,
  type AnalyticsRange,
} from './dto/analytics-overview.query';

type OverviewMetrics = {
  totalEvents: number;
  totalScore: number;
  activeMembers: number;
  participatingMembers: number;
  averageScorePerMember: number;
  leaderNickname: string | null;
  leaderScore: number;
  scoreSpread: number;
};

type WeeklyTotal = {
  weekId: string;
  totalScore: number;
  totalEvents: number;
  confirmedEvents: number;
  lightCount: number;
  coreCount: number;
  epicCount: number;
};

type TaskTypeDistributionItem = {
  taskType: TaskType;
  count: number;
  totalScore: number;
};

type MemberScoreComparisonItem = {
  memberId: string;
  nickname: string;
  totalScore: number;
  eventCount: number;
  sharePercent: number;
  averageScorePerEvent: number;
};

type MemberTaskTypeBreakdownItem = {
  memberId: string;
  nickname: string;
  lightCount: number;
  coreCount: number;
  epicCount: number;
};

type AnalyticsOverviewPayload = {
  range: AnalyticsRange;
  referenceWeekId: string;
  includedWeekIds: string[];
  overviewMetrics: OverviewMetrics;
  trendCharts: {
    weeklyTotals: WeeklyTotal[];
    taskTypeDistribution: TaskTypeDistributionItem[];
  };
  fairnessCharts: {
    memberScoreComparison: MemberScoreComparisonItem[];
    memberTaskTypeBreakdown: MemberTaskTypeBreakdownItem[];
  };
  systemSummary: {
    overall: string;
    fairness: string;
    trend: string;
  };
};

type MemberAccumulator = {
  memberId: string;
  nickname: string;
  sortOrder: number;
  totalScore: number;
  eventCount: number;
  lightCount: number;
  coreCount: number;
  epicCount: number;
};

const rangeWeekCountMap: Record<AnalyticsRange, number> = {
  '1w': 1,
  '4w': 4,
  '8w': 8,
  '12w': 12,
};

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function parseWeekId(weekId: string) {
  const match = /^(?<year>\d{4})-W(?<week>\d{2})$/.exec(weekId);

  if (!match?.groups) {
    return null;
  }

  return {
    year: Number(match.groups.year),
    week: Number(match.groups.week),
  };
}

function getWeekSortKey(weekId: string) {
  const parsed = parseWeekId(weekId);

  if (!parsed) {
    return Number.NEGATIVE_INFINITY;
  }

  return parsed.year * 100 + parsed.week;
}

function getWeekStartDate(weekId: string) {
  const parsed = parseWeekId(weekId);

  if (!parsed) {
    return null;
  }

  const januaryFourth = new Date(Date.UTC(parsed.year, 0, 4));
  const day = januaryFourth.getUTCDay() || 7;
  const monday = new Date(januaryFourth);

  monday.setUTCDate(
    januaryFourth.getUTCDate() - day + 1 + (parsed.week - 1) * 7,
  );

  return monday;
}

function getWeekIdFromUtcDate(date: Date) {
  const normalized = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = normalized.getUTCDay() || 7;

  normalized.setUTCDate(normalized.getUTCDate() + 4 - day);

  const isoYear = normalized.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(
    ((normalized.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

function shiftWeekId(weekId: string, deltaWeeks: number) {
  const weekStart = getWeekStartDate(weekId);

  if (!weekStart) {
    return weekId;
  }

  weekStart.setUTCDate(weekStart.getUTCDate() + deltaWeeks * 7);
  return getWeekIdFromUtcDate(weekStart);
}

function buildRecentWeekIds(referenceWeekId: string, count: number) {
  return Array.from({ length: count }, (_, index) =>
    shiftWeekId(referenceWeekId, index - (count - 1)),
  );
}

function sortMemberStats(left: MemberAccumulator, right: MemberAccumulator) {
  if (right.totalScore !== left.totalScore) {
    return right.totalScore - left.totalScore;
  }

  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  return left.nickname.localeCompare(right.nickname, 'zh-CN');
}

function buildOverallSummary(
  overviewMetrics: OverviewMetrics,
  leader: MemberAccumulator | undefined,
  weeks: number,
) {
  if (overviewMetrics.totalEvents === 0) {
    return 'No confirmed events in the selected range yet, so the system cannot form a stable conclusion.';
  }

  if (overviewMetrics.participatingMembers <= 1 && leader) {
    return `${leader.nickname} carried all confirmed work in this range with ${leader.totalScore} points.`;
  }

  if (
    leader &&
    overviewMetrics.totalScore > 0 &&
    leader.totalScore / overviewMetrics.totalScore >= 0.5
  ) {
    return `${overviewMetrics.totalEvents} confirmed events were recorded, and ${leader.nickname} contributed more than half of the total score.`;
  }

  if (overviewMetrics.totalEvents < weeks * 2) {
    return `${overviewMetrics.totalEvents} confirmed events were recorded, but the sample is still small and should be observed for a few more weeks.`;
  }

  return `${overviewMetrics.totalEvents} confirmed events were recorded and ${overviewMetrics.participatingMembers} members contributed, so the workload is now measurable.`;
}

function buildFairnessSummary(memberStats: MemberAccumulator[]) {
  if (memberStats.length === 0) {
    return 'There are no active members available for fairness analysis.';
  }

  if (memberStats.every((member) => member.eventCount === 0)) {
    return 'No member has a confirmed record yet, so fairness cannot be judged.';
  }

  if (memberStats.length === 1) {
    return 'Only one active member is available, so a fairness comparison is not meaningful yet.';
  }

  const leader = memberStats[0];
  const trailer = memberStats[memberStats.length - 1];
  const spread = leader.totalScore - trailer.totalScore;

  if (spread <= 2) {
    return `The score spread is only ${spread}, so workload distribution is relatively balanced.`;
  }

  if (trailer.eventCount === 0) {
    return `${trailer.nickname} still has no confirmed record, so the workload is clearly imbalanced right now.`;
  }

  if (leader.totalScore >= trailer.totalScore + 5) {
    return `${leader.nickname} leads ${trailer.nickname} by ${spread} points, so the next step should be to rebalance toward lower-participation members.`;
  }

  return `Members currently differ by ${spread} points, so the workload is not fully imbalanced but the gap is already visible.`;
}

function buildTrendSummary(weeklyTotals: WeeklyTotal[]) {
  const nonZeroWeeks = weeklyTotals.filter((item) => item.totalEvents > 0);

  if (nonZeroWeeks.length === 0) {
    return 'There are no confirmed events in this range, so the trend line is still empty.';
  }

  if (nonZeroWeeks.length === 1) {
    return 'Only one week contains confirmed records so far, so the trend is not stable yet.';
  }

  const first = weeklyTotals[0];
  const last = weeklyTotals[weeklyTotals.length - 1];
  const delta = last.totalScore - first.totalScore;

  if (delta >= 3) {
    return `The latest week is up ${delta} points versus the start of the range, so completion is trending upward.`;
  }

  if (delta <= -3) {
    return `The latest week is down ${Math.abs(delta)} points versus the start of the range, so completion is cooling off.`;
  }

  const peakWeek = weeklyTotals.reduce((best, current) =>
    current.totalScore > best.totalScore ? current : best,
  );

  return `Recent weeks are relatively steady, with the peak landing in ${peakWeek.weekId} at ${peakWeek.totalScore} points.`;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardService: BoardService,
  ) {}

  getModuleInfo() {
    return {
      module: 'analytics',
      status: 'overview-query-implemented',
    };
  }

  async getOverview(
    familyId: string,
    query: AnalyticsOverviewQueryDto,
  ): Promise<AnalyticsOverviewPayload> {
    await this.boardService.confirmExpiredPendingEvents(familyId);

    const range = query.range ?? '4w';
    const weekCount = rangeWeekCountMap[range];

    const family = await this.prisma.family.findUniqueOrThrow({
      where: {
        id: familyId,
      },
      select: {
        currentWeekId: true,
        timezone: true,
      },
    });

    const calculatedCurrentWeekId = getWeekIdForTimezone(
      new Date(),
      family.timezone,
    );
    const referenceWeekId =
      getWeekSortKey(family.currentWeekId) >
      getWeekSortKey(calculatedCurrentWeekId)
        ? family.currentWeekId
        : calculatedCurrentWeekId;
    const includedWeekIds = buildRecentWeekIds(referenceWeekId, weekCount);

    const [members, events] = await Promise.all([
      this.prisma.member.findMany({
        where: {
          familyId,
          status: MemberStatus.ACTIVE,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          nickname: true,
          sortOrder: true,
        },
      }),
      this.prisma.taskEvent.findMany({
        where: {
          familyId,
          status: EventStatus.CONFIRMED,
          weekId: {
            in: includedWeekIds,
          },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          weekId: true,
          memberId: true,
          memberNicknameSnapshot: true,
          taskTypeSnapshot: true,
          scoreDeltaSnapshot: true,
        },
      }),
    ]);

    const weeklyMap = new Map<string, WeeklyTotal>(
      includedWeekIds.map((weekId) => [
        weekId,
        {
          weekId,
          totalScore: 0,
          totalEvents: 0,
          confirmedEvents: 0,
          lightCount: 0,
          coreCount: 0,
          epicCount: 0,
        },
      ]),
    );

    const memberMap = new Map<string, MemberAccumulator>(
      members.map((member) => [
        member.id,
        {
          memberId: member.id,
          nickname: member.nickname,
          sortOrder: member.sortOrder,
          totalScore: 0,
          eventCount: 0,
          lightCount: 0,
          coreCount: 0,
          epicCount: 0,
        },
      ]),
    );

    const taskTypeDistributionMap = new Map<TaskType, TaskTypeDistributionItem>(
      [TaskType.LIGHT, TaskType.CORE, TaskType.EPIC].map((taskType) => [
        taskType,
        {
          taskType,
          count: 0,
          totalScore: 0,
        },
      ]),
    );

    for (const event of events) {
      const week = weeklyMap.get(event.weekId);
      let member = memberMap.get(event.memberId);

      if (!member) {
        member = {
          memberId: event.memberId,
          nickname: event.memberNicknameSnapshot,
          sortOrder: Number.MAX_SAFE_INTEGER,
          totalScore: 0,
          eventCount: 0,
          lightCount: 0,
          coreCount: 0,
          epicCount: 0,
        };
        memberMap.set(event.memberId, member);
      }

      member.totalScore += event.scoreDeltaSnapshot;
      member.eventCount += 1;

      if (event.taskTypeSnapshot === TaskType.LIGHT) {
        member.lightCount += 1;
      } else if (event.taskTypeSnapshot === TaskType.CORE) {
        member.coreCount += 1;
      } else {
        member.epicCount += 1;
      }

      if (week) {
        week.totalScore += event.scoreDeltaSnapshot;
        week.totalEvents += 1;
        week.confirmedEvents += 1;

        if (event.taskTypeSnapshot === TaskType.LIGHT) {
          week.lightCount += 1;
        } else if (event.taskTypeSnapshot === TaskType.CORE) {
          week.coreCount += 1;
        } else {
          week.epicCount += 1;
        }
      }

      const taskTypeDistribution = taskTypeDistributionMap.get(
        event.taskTypeSnapshot,
      );

      if (taskTypeDistribution) {
        taskTypeDistribution.count += 1;
        taskTypeDistribution.totalScore += event.scoreDeltaSnapshot;
      }
    }

    const memberStats = Array.from(memberMap.values()).sort(sortMemberStats);
    const totalScore = memberStats.reduce(
      (sum, member) => sum + member.totalScore,
      0,
    );
    const totalEvents = events.length;
    const participatingMembers = memberStats.filter(
      (member) => member.eventCount > 0,
    ).length;
    const leader = memberStats[0];
    const trailer = memberStats[memberStats.length - 1];
    const overviewMetrics: OverviewMetrics = {
      totalEvents,
      totalScore,
      activeMembers: memberStats.length,
      participatingMembers,
      averageScorePerMember: memberStats.length
        ? roundToOneDecimal(totalScore / memberStats.length)
        : 0,
      leaderNickname: leader?.nickname ?? null,
      leaderScore: leader?.totalScore ?? 0,
      scoreSpread:
        leader && trailer ? leader.totalScore - trailer.totalScore : 0,
    };

    const weeklyTotals = includedWeekIds
      .map((weekId) => weeklyMap.get(weekId))
      .filter((item): item is WeeklyTotal => Boolean(item));

    return {
      range,
      referenceWeekId,
      includedWeekIds,
      overviewMetrics,
      trendCharts: {
        weeklyTotals,
        taskTypeDistribution: [TaskType.LIGHT, TaskType.CORE, TaskType.EPIC]
          .map((taskType) => taskTypeDistributionMap.get(taskType))
          .filter((item): item is TaskTypeDistributionItem => Boolean(item)),
      },
      fairnessCharts: {
        memberScoreComparison: memberStats.map((member) => ({
          memberId: member.memberId,
          nickname: member.nickname,
          totalScore: member.totalScore,
          eventCount: member.eventCount,
          sharePercent:
            totalScore > 0
              ? roundToOneDecimal((member.totalScore / totalScore) * 100)
              : 0,
          averageScorePerEvent: member.eventCount
            ? roundToOneDecimal(member.totalScore / member.eventCount)
            : 0,
        })),
        memberTaskTypeBreakdown: memberStats.map((member) => ({
          memberId: member.memberId,
          nickname: member.nickname,
          lightCount: member.lightCount,
          coreCount: member.coreCount,
          epicCount: member.epicCount,
        })),
      },
      systemSummary: {
        overall: buildOverallSummary(overviewMetrics, leader, weekCount),
        fairness: buildFairnessSummary(memberStats),
        trend: buildTrendSummary(weeklyTotals),
      },
    };
  }
}
