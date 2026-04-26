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

type FairnessInsight = {
  score: number;
  level: 'excellent' | 'good' | 'watch' | 'risky';
  label: string;
  summary: string;
  dimensions: {
    participation: number;
    balance: number;
    rotation: number;
  };
};

type ActionSuggestion = {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  focusMemberNickname: string | null;
  focusTaskType: TaskType | null;
};

type WeeklyReport = {
  title: string;
  headline: string;
  summary: string;
  highlights: string[];
  closing: string;
};

type AchievementTone = 'gold' | 'violet' | 'teal' | 'rose';

type WeeklyTitle = {
  id: string;
  title: string;
  description: string;
  memberId: string | null;
  memberNickname: string | null;
  tone: AchievementTone;
};

type MemberBadge = {
  id: string;
  label: string;
  description: string;
  tone: AchievementTone;
};

type MemberBadgeGroup = {
  memberId: string;
  memberNickname: string;
  badges: MemberBadge[];
};

type Achievements = {
  weeklyTitles: WeeklyTitle[];
  memberBadges: MemberBadgeGroup[];
};

type WeeklyHonorRoll = {
  weekId: string;
  totalScore: number;
  totalEvents: number;
  fairnessScore: number;
  leaderNickname: string | null;
  weeklyTitles: WeeklyTitle[];
  memberBadges: MemberBadgeGroup[];
};

type HonorCountItem = {
  id: string;
  label: string;
  tone: AchievementTone;
  count: number;
  lastEarnedWeekId: string | null;
};

type MemberHonorHallItem = {
  memberId: string;
  memberNickname: string;
  totalBadgeEarned: number;
  totalTitleEarned: number;
  badgeCounts: HonorCountItem[];
  titleCounts: HonorCountItem[];
};

type HonorsHallPayload = {
  referenceWeekId: string;
  trackedWeekIds: string[];
  weeklyHonorRolls: WeeklyHonorRoll[];
  memberHall: MemberHonorHallItem[];
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
  fairnessInsight: FairnessInsight;
  actionSuggestions: ActionSuggestion[];
  weeklyReport: WeeklyReport;
  achievements: Achievements;
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

type MemberSeed = {
  id: string;
  nickname: string;
  sortOrder: number;
};

type ConfirmedEventRecord = {
  weekId: string;
  memberId: string;
  memberNicknameSnapshot: string;
  taskTypeSnapshot: TaskType;
  scoreDeltaSnapshot: number;
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

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getTaskTypeLabel(taskType: TaskType | null) {
  if (taskType === TaskType.LIGHT) {
    return '+1 随手活';
  }

  if (taskType === TaskType.CORE) {
    return '+3 主力活';
  }

  if (taskType === TaskType.EPIC) {
    return '+5 硬仗';
  }

  return '当前任务';
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
    return '当前时间范围内还没有已确认打卡，系统暂时无法形成稳定结论。';
  }

  if (overviewMetrics.participatingMembers <= 1 && leader) {
    return `当前这段时间主要由${leader.nickname}承担家务，已确认贡献 ${leader.totalScore} 分。`;
  }

  if (
    leader &&
    overviewMetrics.totalScore > 0 &&
    leader.totalScore / overviewMetrics.totalScore >= 0.5
  ) {
    return `当前共记录 ${overviewMetrics.totalEvents} 次已确认打卡，${leader.nickname}的贡献已经超过总积分的一半。`;
  }

  if (overviewMetrics.totalEvents < weeks * 2) {
    return `当前共记录 ${overviewMetrics.totalEvents} 次已确认打卡，但样本还偏少，建议继续观察后续几周的变化。`;
  }

  return `当前共记录 ${overviewMetrics.totalEvents} 次已确认打卡，已有 ${overviewMetrics.participatingMembers} 位成员参与，家务分工情况已经可以较清晰地衡量。`;
}

function buildFairnessSummary(memberStats: MemberAccumulator[]) {
  if (memberStats.length === 0) {
    return '当前没有可参与统计的活跃成员，暂时无法进行公平性评估。';
  }

  if (memberStats.every((member) => member.eventCount === 0)) {
    return '目前还没有成员形成已确认记录，暂时无法判断家务分配是否均衡。';
  }

  if (memberStats.length === 1) {
    return '当前只有 1 位活跃成员，暂时不具备有效的公平性对比条件。';
  }

  const leader = memberStats[0];
  const trailer = memberStats[memberStats.length - 1];
  const spread = leader.totalScore - trailer.totalScore;

  if (spread <= 2) {
    return `当前成员间积分差只有 ${spread} 分，整体家务分配相对均衡。`;
  }

  if (trailer.eventCount === 0) {
    return `${trailer.nickname} 目前还没有已确认打卡，当前家务参与度存在比较明显的差距。`;
  }

  if (leader.totalScore >= trailer.totalScore + 5) {
    return `${leader.nickname} 目前领先 ${trailer.nickname} ${spread} 分，后续可以适当引导低参与成员多承担一些随手活。`;
  }

  return `当前成员之间已有 ${spread} 分差距，虽然还不算严重失衡，但差异已经开始显现。`;
}

function buildTrendSummary(weeklyTotals: WeeklyTotal[]) {
  const nonZeroWeeks = weeklyTotals.filter((item) => item.totalEvents > 0);

  if (nonZeroWeeks.length === 0) {
    return '当前时间范围内还没有已确认打卡，暂时看不到有效的趋势变化。';
  }

  if (nonZeroWeeks.length === 1) {
    return '目前只有 1 个自然周存在已确认记录，趋势还不够稳定，建议继续观察。';
  }

  const first = weeklyTotals[0];
  const last = weeklyTotals[weeklyTotals.length - 1];
  const delta = last.totalScore - first.totalScore;

  if (delta >= 3) {
    return `最近一周比起始周提升了 ${delta} 分，整体完成度正在走高。`;
  }

  if (delta <= -3) {
    return `最近一周比起始周下降了 ${Math.abs(delta)} 分，最近的完成热度有回落趋势。`;
  }

  const peakWeek = weeklyTotals.reduce((best, current) =>
    current.totalScore > best.totalScore ? current : best,
  );

  return `最近几周整体比较平稳，其中 ${peakWeek.weekId} 表现最好，单周达到 ${peakWeek.totalScore} 分。`;
}

function buildFairnessInsight(
  memberStats: MemberAccumulator[],
  overviewMetrics: OverviewMetrics,
): FairnessInsight {
  if (
    memberStats.length === 0 ||
    overviewMetrics.activeMembers === 0 ||
    overviewMetrics.totalEvents === 0
  ) {
    return {
      score: 0,
      level: 'risky',
      label: '等待数据',
      summary: '当前还没有足够的打卡数据，公平度将在产生记录后自动计算。',
      dimensions: {
        participation: 0,
        balance: 0,
        rotation: 0,
      },
    };
  }

  const participation = clampScore(
    (overviewMetrics.participatingMembers / overviewMetrics.activeMembers) * 100,
  );

  const participatingMembers = memberStats.filter((member) => member.eventCount > 0);
  const balance =
    participatingMembers.length <= 1 || overviewMetrics.totalScore <= 0
      ? 100
      : (() => {
          const targetScore =
            overviewMetrics.totalScore / participatingMembers.length;
          const averageGap =
            participatingMembers.reduce(
              (sum, member) => sum + Math.abs(member.totalScore - targetScore),
              0,
            ) / participatingMembers.length;

          return clampScore(100 - (averageGap / Math.max(targetScore, 1)) * 55);
        })();

  const maxEventCount = Math.max(
    ...participatingMembers.map((member) => member.eventCount),
    0,
  );
  const rotation =
    participatingMembers.length <= 1 || overviewMetrics.totalEvents <= 0
      ? 100
      : (() => {
          const busiestShare = maxEventCount / overviewMetrics.totalEvents;
          const idealShare = 1 / participatingMembers.length;
          const overload = Math.max(0, busiestShare - idealShare);

          return clampScore(100 - overload * 180);
        })();

  const score = clampScore(
    participation * 0.4 + balance * 0.35 + rotation * 0.25,
  );

  if (score >= 85) {
    return {
      score,
      level: 'excellent',
      label: '分工很稳',
      summary: '当前家庭成员参与度和分工平衡都比较理想，已经形成较健康的家务协作节奏。',
      dimensions: {
        participation,
        balance,
        rotation,
      },
    };
  }

  if (score >= 70) {
    return {
      score,
      level: 'good',
      label: '整体良好',
      summary: '当前分工整体还不错，但个别成员或任务类型已经开始出现轻微集中，可以提前做轮换。',
      dimensions: {
        participation,
        balance,
        rotation,
      },
    };
  }

  if (score >= 50) {
    return {
      score,
      level: 'watch',
      label: '需要关注',
      summary: '当前存在一定程度的分工失衡，建议优先提升低参与成员的随手活占比，并减少核心任务过度集中。',
      dimensions: {
        participation,
        balance,
        rotation,
      },
    };
  }

  return {
    score,
    level: 'risky',
    label: '失衡明显',
    summary: '当前家务分工集中度偏高，已经影响整体公平性，建议尽快重新分配高频任务和主力任务。',
    dimensions: {
      participation,
      balance,
      rotation,
    },
  };
}

function buildActionSuggestions(input: {
  memberStats: MemberAccumulator[];
  overviewMetrics: OverviewMetrics;
  taskTypeDistribution: TaskTypeDistributionItem[];
  fairnessInsight: FairnessInsight;
}): ActionSuggestion[] {
  const { memberStats, overviewMetrics, taskTypeDistribution, fairnessInsight } =
    input;

  if (overviewMetrics.totalEvents === 0) {
    return [
      {
        id: 'warmup-light-tasks',
        title: '先把全员打卡节奏建立起来',
        description:
          '建议先给每位成员安排 1 到 2 个 +1 随手活，让本周参与率先跑起来，再逐步增加更高分任务。',
        priority: 'high',
        focusMemberNickname: null,
        focusTaskType: TaskType.LIGHT,
      },
      {
        id: 'rotate-small-jobs',
        title: '从高频小任务开始轮换',
        description:
          '优先轮换倒垃圾、收拾桌面、整理鞋子这类高频任务，更容易让每位成员快速进入状态。',
        priority: 'medium',
        focusMemberNickname: null,
        focusTaskType: TaskType.LIGHT,
      },
      {
        id: 'reserve-core-task',
        title: '本周至少安排一次主力活分配',
        description:
          '建议在本周预留至少 1 个 +3 主力活，避免家务记录长期只停留在轻任务，影响后续分析。',
        priority: 'low',
        focusMemberNickname: null,
        focusTaskType: TaskType.CORE,
      },
    ];
  }

  const suggestions: ActionSuggestion[] = [];
  const inactiveMembers = memberStats.filter((member) => member.eventCount === 0);
  const leader = memberStats[0] ?? null;
  const trailer = memberStats.at(-1) ?? null;
  const dominantTaskType =
    [...taskTypeDistribution].sort((left, right) => right.count - left.count)[0] ??
    null;

  if (inactiveMembers.length > 0) {
    const targets = inactiveMembers.slice(0, 2).map((member) => member.nickname).join('、');
    suggestions.push({
      id: 'activate-members',
      title: '优先拉动低参与成员',
      description: `${targets} 目前还没有形成有效记录，建议先分配几个 +1 随手活，优先把参与率补齐。`,
      priority: 'high',
      focusMemberNickname: inactiveMembers[0]?.nickname ?? null,
      focusTaskType: TaskType.LIGHT,
    });
  }

  if (
    leader &&
    trailer &&
    leader.memberId !== trailer.memberId &&
    leader.totalScore - trailer.totalScore >= 5
  ) {
    suggestions.push({
      id: 'rebalance-core-jobs',
      title: '把主力任务适当转给低贡献成员',
      description: `${leader.nickname} 当前领先 ${trailer.nickname} ${leader.totalScore - trailer.totalScore} 分，建议下周把部分 +3 主力活或固定任务轮给 ${trailer.nickname}。`,
      priority: fairnessInsight.score < 60 ? 'high' : 'medium',
      focusMemberNickname: trailer.nickname,
      focusTaskType: TaskType.CORE,
    });
  }

  if (
    dominantTaskType &&
    overviewMetrics.totalEvents > 0 &&
    dominantTaskType.count / overviewMetrics.totalEvents >= 0.55
  ) {
    suggestions.push({
      id: 'balance-task-types',
      title: '当前任务结构有些单一',
      description: `${getTaskTypeLabel(dominantTaskType.taskType)} 占当前打卡的大头，建议下周补充其他档位任务，避免记录长期集中在单一类型。`,
      priority: 'medium',
      focusMemberNickname: null,
      focusTaskType: dominantTaskType.taskType,
    });
  }

  if (fairnessInsight.score >= 70) {
    suggestions.push({
      id: 'keep-rotation',
      title: '保持现有节奏并增加一点轮换',
      description:
        '当前整体分工已经比较稳定，可以在保持现有节奏的基础上，为高频任务增加轮换规则，继续降低集中度。',
      priority: 'low',
      focusMemberNickname: null,
      focusTaskType: TaskType.CORE,
    });
  } else {
    suggestions.push({
      id: 'set-weekly-goal',
      title: '给下周设置一个共同目标',
      description:
        '建议给家庭设置一个可见的周目标，比如“全员至少完成 2 次打卡”，这样比单纯排名更容易拉动持续参与。',
      priority: 'medium',
      focusMemberNickname: null,
      focusTaskType: null,
    });
  }

  return suggestions.slice(0, 3);
}

function buildWeeklyReport(input: {
  referenceWeekId: string;
  overviewMetrics: OverviewMetrics;
  fairnessInsight: FairnessInsight;
  memberStats: MemberAccumulator[];
  taskTypeDistribution: TaskTypeDistributionItem[];
  actionSuggestions: ActionSuggestion[];
}): WeeklyReport {
  const {
    referenceWeekId,
    overviewMetrics,
    fairnessInsight,
    memberStats,
    taskTypeDistribution,
    actionSuggestions,
  } = input;

  if (overviewMetrics.totalEvents === 0) {
    return {
      title: `${referenceWeekId} 家庭周报`,
      headline: '本周还没有形成有效记录',
      summary:
        '当前尚未产生已确认打卡，周报会在出现正式记录后自动总结本周的分工情况、参与状态和优化建议。',
      highlights: [
        '本周暂无已确认打卡记录',
        '建议先从 +1 随手活建立全员参与节奏',
        '完成几次真实打卡后，系统会自动生成公平度评分和分工建议',
      ],
      closing: '先把记录跑起来，下周这张周报就会更有内容。',
    };
  }

  const leader = memberStats[0] ?? null;
  const trailer = memberStats.at(-1) ?? null;
  const dominantTaskType =
    [...taskTypeDistribution].sort((left, right) => right.count - left.count)[0] ??
    null;
  const topSuggestion = actionSuggestions[0] ?? null;

  const highlights = [
    `本周累计 ${overviewMetrics.totalEvents} 次打卡，合计 ${overviewMetrics.totalScore} 分。`,
    leader
      ? `${leader.nickname} 暂时领先，个人贡献 ${leader.totalScore} 分。`
      : '本周暂无明确领先成员。',
    dominantTaskType
      ? `${getTaskTypeLabel(dominantTaskType.taskType)} 是本周最主要的任务类型，占比最高。`
      : '本周暂无明显集中的任务类型。',
  ];

  if (
    trailer &&
    leader &&
    trailer.memberId !== leader.memberId &&
    trailer.eventCount === 0
  ) {
    highlights.push(`${trailer.nickname} 本周还没有形成有效记录，后续参与度需要重点关注。`);
  } else if (
    trailer &&
    leader &&
    trailer.memberId !== leader.memberId &&
    leader.totalScore - trailer.totalScore >= 5
  ) {
    highlights.push(
      `${leader.nickname} 与 ${trailer.nickname} 已拉开 ${leader.totalScore - trailer.totalScore} 分差距，分工开始出现集中现象。`,
    );
  }

  return {
    title: `${referenceWeekId} 家庭周报`,
    headline: `${fairnessInsight.label} · 公平度 ${fairnessInsight.score} 分`,
    summary:
      `本周共有 ${overviewMetrics.participatingMembers} 位成员参与家务记录，系统判断当前分工状态为「${fairnessInsight.label}」。` +
      ` ${fairnessInsight.summary}`,
    highlights: highlights.slice(0, 4),
    closing: topSuggestion
      ? `下周最值得优先推进的是：${topSuggestion.title}。`
      : '下周可以继续保持当前节奏，并逐步增加任务轮换。',
  };
}

function buildAchievements(input: {
  referenceWeekId: string;
  memberStats: MemberAccumulator[];
  fairnessInsight: FairnessInsight;
}): Achievements {
  const { referenceWeekId, memberStats, fairnessInsight } = input;
  const participatingMembers = memberStats.filter((member) => member.eventCount > 0);
  const badgeMap = new Map<string, MemberBadge[]>(
    memberStats.map((member) => [member.memberId, []]),
  );

  const addBadge = (memberId: string, badge: MemberBadge) => {
    const current = badgeMap.get(memberId);

    if (!current || current.some((item) => item.id === badge.id) || current.length >= 3) {
      return;
    }

    current.push(badge);
  };

  if (participatingMembers.length === 0) {
    return {
      weeklyTitles: [
        {
          id: 'waiting-for-records',
          title: '待开赛',
          description: `${referenceWeekId} 还没有形成有效打卡，本周称号会在首批记录出现后自动生成。`,
          memberId: null,
          memberNickname: null,
          tone: 'teal',
        },
      ],
      memberBadges: memberStats.map((member) => ({
        memberId: member.memberId,
        memberNickname: member.nickname,
        badges: [],
      })),
    };
  }

  const leader = [...participatingMembers].sort(sortMemberStats)[0] ?? null;
  const attendanceLeader =
    [...participatingMembers].sort((left, right) => {
      if (right.eventCount !== left.eventCount) {
        return right.eventCount - left.eventCount;
      }

      return sortMemberStats(left, right);
    })[0] ?? null;
  const lightLeader =
    [...participatingMembers]
      .filter((member) => member.lightCount > 0)
      .sort((left, right) => {
        if (right.lightCount !== left.lightCount) {
          return right.lightCount - left.lightCount;
        }

        return sortMemberStats(left, right);
      })[0] ?? null;
  const coreLeader =
    [...participatingMembers]
      .filter((member) => member.coreCount + member.epicCount > 0)
      .sort((left, right) => {
        const leftHeavy = left.coreCount + left.epicCount;
        const rightHeavy = right.coreCount + right.epicCount;

        if (rightHeavy !== leftHeavy) {
          return rightHeavy - leftHeavy;
        }

        return sortMemberStats(left, right);
      })[0] ?? null;
  const efficiencyLeader =
    [...participatingMembers].sort((left, right) => {
      const leftAverage = left.eventCount ? left.totalScore / left.eventCount : 0;
      const rightAverage = right.eventCount ? right.totalScore / right.eventCount : 0;

      if (rightAverage !== leftAverage) {
        return rightAverage - leftAverage;
      }

      return sortMemberStats(left, right);
    })[0] ?? null;

  const weeklyTitles: WeeklyTitle[] = [];

  if (leader) {
    weeklyTitles.push({
      id: 'weekly-champion',
      title: '本周冠军',
      description: `${leader.nickname} 以 ${leader.totalScore} 分暂居第一，是这周家务赛场上的头号输出。`,
      memberId: leader.memberId,
      memberNickname: leader.nickname,
      tone: 'gold',
    });
    addBadge(leader.memberId, {
      id: 'weekly-champion',
      label: '本周冠军',
      description: `累计 ${leader.totalScore} 分，当前周综合贡献最高。`,
      tone: 'gold',
    });
  }

  if (attendanceLeader) {
    weeklyTitles.push({
      id: 'attendance-leader',
      title: '打卡劳模',
      description: `${attendanceLeader.nickname} 本周完成 ${attendanceLeader.eventCount} 次打卡，出勤频率最高。`,
      memberId: attendanceLeader.memberId,
      memberNickname: attendanceLeader.nickname,
      tone: 'teal',
    });
    addBadge(attendanceLeader.memberId, {
      id: 'attendance-leader',
      label: '打卡劳模',
      description: `本周完成 ${attendanceLeader.eventCount} 次打卡，节奏最稳定。`,
      tone: 'teal',
    });
  }

  if (lightLeader) {
    weeklyTitles.push({
      id: 'light-task-king',
      title: '随手活之王',
      description: `${lightLeader.nickname} 拿下 ${lightLeader.lightCount} 次 +1 随手活，把零碎家务收得最稳。`,
      memberId: lightLeader.memberId,
      memberNickname: lightLeader.nickname,
      tone: 'violet',
    });
    addBadge(lightLeader.memberId, {
      id: 'light-task-king',
      label: '随手活之王',
      description: `本周完成 ${lightLeader.lightCount} 次随手活，是零碎事务清理专家。`,
      tone: 'violet',
    });
  }

  if (coreLeader) {
    const heavyCount = coreLeader.coreCount + coreLeader.epicCount;
    weeklyTitles.push({
      id: 'core-task-ace',
      title: '主力担当',
      description: `${coreLeader.nickname} 本周扛下 ${heavyCount} 次主力任务，是高分家务的核心承担者。`,
      memberId: coreLeader.memberId,
      memberNickname: coreLeader.nickname,
      tone: 'rose',
    });
    addBadge(coreLeader.memberId, {
      id: 'core-task-ace',
      label: '主力担当',
      description: `本周完成 ${heavyCount} 次主力或硬仗任务，关键活最敢接。`,
      tone: 'rose',
    });
  }

  weeklyTitles.push({
    id: 'team-balance-status',
    title: fairnessInsight.score >= 80 ? '分工协作在线' : fairnessInsight.score >= 60 ? '还算平衡' : '需要再平衡',
    description:
      fairnessInsight.score >= 80
        ? `本周公平度 ${fairnessInsight.score} 分，整体协作节奏比较稳，已经有团队配合感了。`
        : fairnessInsight.score >= 60
          ? `本周公平度 ${fairnessInsight.score} 分，整体还不错，但部分任务已经开始向少数成员集中。`
          : `本周公平度 ${fairnessInsight.score} 分，建议下周尽快调整分工，避免继续由少数成员长期扛活。`,
    memberId: null,
    memberNickname: null,
    tone: fairnessInsight.score >= 80 ? 'teal' : fairnessInsight.score >= 60 ? 'violet' : 'rose',
  });

  for (const member of participatingMembers) {
    if (member.eventCount >= 2) {
      addBadge(member.memberId, {
        id: 'steady-participant',
        label: '稳定出勤',
        description: `本周已完成 ${member.eventCount} 次打卡，参与节奏保持在线。`,
        tone: 'teal',
      });
    }

    if (member.lightCount > 0 && member.coreCount + member.epicCount > 0) {
      addBadge(member.memberId, {
        id: 'all-round-helper',
        label: '全能协作',
        description: '既能处理随手活，也能接住主力活，分工覆盖比较全面。',
        tone: 'violet',
      });
    }

    if (
      efficiencyLeader &&
      efficiencyLeader.memberId === member.memberId &&
      member.eventCount > 0 &&
      member.totalScore / member.eventCount >= 3
    ) {
      addBadge(member.memberId, {
        id: 'high-efficiency',
        label: '高能输出',
        description: `平均每次打卡约 ${roundToOneDecimal(member.totalScore / member.eventCount)} 分，单次效率很高。`,
        tone: 'gold',
      });
    }
  }

  return {
    weeklyTitles: weeklyTitles.slice(0, 5),
    memberBadges: memberStats.map((member) => ({
      memberId: member.memberId,
      memberNickname: member.nickname,
      badges: badgeMap.get(member.memberId) ?? [],
    })),
  };
}

function createSeededMemberMap(members: MemberSeed[]) {
  return new Map<string, MemberAccumulator>(
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
}

function applyEventToMemberMap(
  memberMap: Map<string, MemberAccumulator>,
  event: ConfirmedEventRecord,
) {
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
    return;
  }

  if (event.taskTypeSnapshot === TaskType.CORE) {
    member.coreCount += 1;
    return;
  }

  member.epicCount += 1;
}

function buildWeeklyHonorRoll(
  weekId: string,
  members: MemberSeed[],
  events: ConfirmedEventRecord[],
): WeeklyHonorRoll {
  const memberMap = createSeededMemberMap(members);

  for (const event of events) {
    applyEventToMemberMap(memberMap, event);
  }

  const memberStats = Array.from(memberMap.values()).sort(sortMemberStats);
  const totalScore = memberStats.reduce((sum, member) => sum + member.totalScore, 0);
  const totalEvents = events.length;
  const participatingMembers = memberStats.filter((member) => member.eventCount > 0).length;
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

  const fairnessInsight = buildFairnessInsight(memberStats, overviewMetrics);
  const achievements = buildAchievements({
    referenceWeekId: weekId,
    memberStats,
    fairnessInsight,
  });

  return {
    weekId,
    totalScore,
    totalEvents,
    fairnessScore: fairnessInsight.score,
    leaderNickname: overviewMetrics.leaderNickname,
    weeklyTitles: achievements.weeklyTitles,
    memberBadges: achievements.memberBadges.filter((item) => item.badges.length > 0),
  };
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

  async getHonorsHall(familyId: string): Promise<HonorsHallPayload> {
    await this.boardService.confirmExpiredPendingEvents(familyId);

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

    const [members, events] = await Promise.all([
      this.prisma.member.findMany({
        where: {
          familyId,
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
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          weekId: true,
          memberId: true,
          memberNicknameSnapshot: true,
          taskTypeSnapshot: true,
          scoreDeltaSnapshot: true,
        },
      }),
    ]);

    const allWeekIds = Array.from(new Set(events.map((event) => event.weekId))).sort(
      (left, right) => getWeekSortKey(right) - getWeekSortKey(left),
    );
    const trackedWeekIds = allWeekIds.slice(0, 16);
    const eventsByWeek = new Map<string, ConfirmedEventRecord[]>();

    for (const event of events) {
      const current = eventsByWeek.get(event.weekId) ?? [];
      current.push(event);
      eventsByWeek.set(event.weekId, current);
    }

    const weeklyHonorRolls = trackedWeekIds.map((weekId) =>
      buildWeeklyHonorRoll(weekId, members, eventsByWeek.get(weekId) ?? []),
    );

    const titleHistoryMap = new Map<string, Map<string, HonorCountItem>>();
    const badgeHistoryMap = new Map<string, Map<string, HonorCountItem>>();

    const upsertCountItem = (
      target: Map<string, Map<string, HonorCountItem>>,
      memberId: string,
      item: { id: string; label: string; tone: AchievementTone },
      weekId: string,
    ) => {
      const memberMap = target.get(memberId) ?? new Map<string, HonorCountItem>();
      const current = memberMap.get(item.id);

      if (current) {
        current.count += 1;
        if (!current.lastEarnedWeekId || getWeekSortKey(weekId) > getWeekSortKey(current.lastEarnedWeekId)) {
          current.lastEarnedWeekId = weekId;
        }
      } else {
        memberMap.set(item.id, {
          id: item.id,
          label: item.label,
          tone: item.tone,
          count: 1,
          lastEarnedWeekId: weekId,
        });
      }

      target.set(memberId, memberMap);
    };

    for (const weekId of allWeekIds) {
      const honorRoll = buildWeeklyHonorRoll(weekId, members, eventsByWeek.get(weekId) ?? []);

      for (const title of honorRoll.weeklyTitles) {
        if (!title.memberId) {
          continue;
        }

        upsertCountItem(
          titleHistoryMap,
          title.memberId,
          {
            id: title.id,
            label: title.title,
            tone: title.tone,
          },
          weekId,
        );
      }

      for (const group of honorRoll.memberBadges) {
        for (const badge of group.badges) {
          upsertCountItem(
            badgeHistoryMap,
            group.memberId,
            {
              id: badge.id,
              label: badge.label,
              tone: badge.tone,
            },
            weekId,
          );
        }
      }
    }

    const hallMemberIds = new Set<string>([
      ...members.map((member) => member.id),
      ...titleHistoryMap.keys(),
      ...badgeHistoryMap.keys(),
    ]);

    const memberNameMap = new Map<string, string>(
      members.map((member) => [member.id, member.nickname]),
    );

    const memberHall = Array.from(hallMemberIds)
      .map((memberId) => {
        const titleCounts = Array.from(titleHistoryMap.get(memberId)?.values() ?? []).sort(
          (left, right) => {
            if (right.count !== left.count) {
              return right.count - left.count;
            }

            return left.label.localeCompare(right.label, 'zh-CN');
          },
        );
        const badgeCounts = Array.from(badgeHistoryMap.get(memberId)?.values() ?? []).sort(
          (left, right) => {
            if (right.count !== left.count) {
              return right.count - left.count;
            }

            return left.label.localeCompare(right.label, 'zh-CN');
          },
        );

        return {
          memberId,
          memberNickname: memberNameMap.get(memberId) ?? '未知成员',
          totalBadgeEarned: badgeCounts.reduce((sum, item) => sum + item.count, 0),
          totalTitleEarned: titleCounts.reduce((sum, item) => sum + item.count, 0),
          badgeCounts,
          titleCounts,
        };
      })
      .sort((left, right) => {
        if (right.totalBadgeEarned !== left.totalBadgeEarned) {
          return right.totalBadgeEarned - left.totalBadgeEarned;
        }

        if (right.totalTitleEarned !== left.totalTitleEarned) {
          return right.totalTitleEarned - left.totalTitleEarned;
        }

        return left.memberNickname.localeCompare(right.memberNickname, 'zh-CN');
      });

    return {
      referenceWeekId,
      trackedWeekIds,
      weeklyHonorRolls,
      memberHall,
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
    const defaultReferenceWeekId =
      getWeekSortKey(family.currentWeekId) >
      getWeekSortKey(calculatedCurrentWeekId)
        ? family.currentWeekId
        : calculatedCurrentWeekId;
    const referenceWeekId =
      query.referenceWeekId &&
      getWeekSortKey(query.referenceWeekId) <= getWeekSortKey(defaultReferenceWeekId)
        ? query.referenceWeekId
        : defaultReferenceWeekId;
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

    const taskTypeDistribution = [TaskType.LIGHT, TaskType.CORE, TaskType.EPIC]
      .map((taskType) => taskTypeDistributionMap.get(taskType))
      .filter((item): item is TaskTypeDistributionItem => Boolean(item));

    const fairnessInsight = buildFairnessInsight(memberStats, overviewMetrics);
    const actionSuggestions = buildActionSuggestions({
      memberStats,
      overviewMetrics,
      taskTypeDistribution,
      fairnessInsight,
    });
    const weeklyReport = buildWeeklyReport({
      referenceWeekId,
      overviewMetrics,
      fairnessInsight,
      memberStats,
      taskTypeDistribution,
      actionSuggestions,
    });
    const achievements = buildAchievements({
      referenceWeekId,
      memberStats,
      fairnessInsight,
    });

    return {
      range,
      referenceWeekId,
      includedWeekIds,
      overviewMetrics,
      trendCharts: {
        weeklyTotals,
        taskTypeDistribution,
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
      fairnessInsight,
      actionSuggestions,
      weeklyReport,
      achievements,
      systemSummary: {
        overall: buildOverallSummary(overviewMetrics, leader, weekCount),
        fairness: buildFairnessSummary(memberStats),
        trend: buildTrendSummary(weeklyTotals),
      },
    };
  }
}
