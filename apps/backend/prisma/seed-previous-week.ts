import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  EventStatus,
  MemberStatus,
  PrismaClient,
  TaskRuleStatus,
  TaskType,
} from '@prisma/client';
import { getWeekIdForTimezone } from '../src/common/utils/week.util';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://root:password123@localhost:5432/tribunal';

const prisma = new PrismaClient({
  adapter: new PrismaPg(connectionString),
});

const DEFAULT_ACCOUNT_NAME = 'tribunal-demo';
const SEED_PREFIX = 'seed-prev-week';
const SEED_FORCE = process.env.SEED_FORCE === '1';
const DRY_RUN = process.env.DRY_RUN === '1';

type TargetFamily = {
  id: string;
  name: string;
  timezone: string;
  currentWeekId: string;
  accountName: string;
};

type ActiveRule = {
  id: string;
  label: string;
  taskType: TaskType;
  scoreDelta: number;
};

type ActiveMember = {
  id: string;
  nickname: string;
};

type PlannedEvent = {
  familyId: string;
  memberId: string;
  taskRuleId: string;
  weekId: string;
  taskTypeSnapshot: TaskType;
  taskLabelSnapshot: string;
  scoreDeltaSnapshot: number;
  memberNicknameSnapshot: string;
  clientEventId: string;
  undoToken: string;
  undoExpiresAt: Date;
  status: EventStatus;
  createdAt: Date;
  confirmedAt: Date;
};

async function main() {
  const family = await resolveTargetFamily();
  const now = new Date();
  const actualCurrentWeekId = getWeekIdForTimezone(now, family.timezone);
  const referenceWeekId =
    compareWeekId(family.currentWeekId, actualCurrentWeekId) > 0
      ? family.currentWeekId
      : actualCurrentWeekId;
  const targetWeekId = shiftWeekId(referenceWeekId, -1);

  if (targetWeekId === referenceWeekId) {
    throw new Error('TARGET_WEEK_RESOLUTION_FAILED');
  }

  const [members, rules, existingEvents] = await Promise.all([
    prisma.member.findMany({
      where: {
        familyId: family.id,
        status: MemberStatus.ACTIVE,
      },
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
        nickname: true,
      },
    }),
    prisma.taskRule.findMany({
      where: {
        familyId: family.id,
        status: TaskRuleStatus.ACTIVE,
      },
      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
      select: {
        id: true,
        label: true,
        taskType: true,
        scoreDelta: true,
      },
    }),
    prisma.taskEvent.findMany({
      where: {
        familyId: family.id,
        weekId: targetWeekId,
      },
      select: {
        id: true,
        clientEventId: true,
      },
    }),
  ]);

  if (members.length === 0) {
    throw new Error(`家庭 ${family.name} 没有可用成员，无法生成上一周数据。`);
  }

  if (rules.length === 0) {
    throw new Error(`家庭 ${family.name} 没有启用中的规则，无法生成上一周数据。`);
  }

  const seededEvents = existingEvents.filter((event) =>
    event.clientEventId.startsWith(`${SEED_PREFIX}:${targetWeekId}:`),
  );
  const realEvents = existingEvents.filter(
    (event) => !event.clientEventId.startsWith(`${SEED_PREFIX}:${targetWeekId}:`),
  );

  if (realEvents.length > 0 && !SEED_FORCE) {
    throw new Error(
      `目标周 ${targetWeekId} 已存在 ${realEvents.length} 条真实事件。若你确认要覆盖当前周的演示数据，请带上 SEED_FORCE=1 重新执行。`,
    );
  }

  const plannedEvents = buildPlannedEvents({
    familyId: family.id,
    weekId: targetWeekId,
    members,
    rules,
  });

  const summary = summarizePlannedEvents(plannedEvents);
  const output = {
    dryRun: DRY_RUN,
    family: {
      id: family.id,
      name: family.name,
      accountName: family.accountName,
      timezone: family.timezone,
    },
    referenceWeekId,
    targetWeekId,
    removedSeededEvents: seededEvents.length,
    blockedRealEvents: realEvents.length,
    plannedEventCount: plannedEvents.length,
    summary,
  };

  if (DRY_RUN) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (seededEvents.length > 0) {
      await tx.taskEvent.deleteMany({
        where: {
          familyId: family.id,
          weekId: targetWeekId,
          clientEventId: {
            startsWith: `${SEED_PREFIX}:${targetWeekId}:`,
          },
        },
      });
    }

    if (realEvents.length > 0 && SEED_FORCE) {
      await tx.taskEvent.deleteMany({
        where: {
          familyId: family.id,
          weekId: targetWeekId,
          clientEventId: {
            not: {
              startsWith: `${SEED_PREFIX}:${targetWeekId}:`,
            },
          },
        },
      });
    }

    await tx.taskEvent.createMany({
      data: plannedEvents,
    });
  });

  console.log(
    JSON.stringify(
      {
        ...output,
        seeded: true,
      },
      null,
      2,
    ),
  );
}

async function resolveTargetFamily(): Promise<TargetFamily> {
  const familyId = process.env.SEED_FAMILY_ID?.trim();
  const accountName =
    process.env.SEED_ACCOUNT_NAME?.trim() || DEFAULT_ACCOUNT_NAME;

  if (familyId) {
    const family = await prisma.family.findUnique({
      where: {
        id: familyId,
      },
      select: {
        id: true,
        name: true,
        timezone: true,
        currentWeekId: true,
        account: {
          select: {
            accountName: true,
          },
        },
      },
    });

    if (!family) {
      throw new Error(`未找到 SEED_FAMILY_ID=${familyId} 对应的家庭。`);
    }

    return {
      id: family.id,
      name: family.name,
      timezone: family.timezone,
      currentWeekId: family.currentWeekId,
      accountName: family.account.accountName,
    };
  }

  const account = await prisma.familyAccount.findUnique({
    where: {
      accountName,
    },
    select: {
      family: {
        select: {
          id: true,
          name: true,
          timezone: true,
          currentWeekId: true,
        },
      },
    },
  });

  if (!account?.family) {
    throw new Error(
      `未找到账号 ${accountName} 对应的家庭。你可以通过 SEED_ACCOUNT_NAME 或 SEED_FAMILY_ID 手动指定。`,
    );
  }

  return {
    id: account.family.id,
    name: account.family.name,
    timezone: account.family.timezone,
    currentWeekId: account.family.currentWeekId,
    accountName,
  };
}

function buildPlannedEvents(input: {
  familyId: string;
  weekId: string;
  members: ActiveMember[];
  rules: ActiveRule[];
}): PlannedEvent[] {
  const { familyId, weekId, members, rules } = input;
  const weekStart = getWeekStartUtc(weekId);
  const lightRule = pickRuleByType(rules, TaskType.LIGHT);
  const coreRule = pickRuleByType(rules, TaskType.CORE);
  const epicRule = pickRuleByType(rules, TaskType.EPIC);

  const schedules: Array<{
    member: ActiveMember;
    rule: ActiveRule;
    dayOffset: number;
    minuteOffset: number;
  }> = [];

  if (members[0]) {
    schedules.push(
      { member: members[0], rule: coreRule, dayOffset: 0, minuteOffset: 9 * 60 + 30 },
      { member: members[0], rule: coreRule, dayOffset: 2, minuteOffset: 20 * 60 + 10 },
      { member: members[0], rule: epicRule, dayOffset: 4, minuteOffset: 21 * 60 + 5 },
      { member: members[0], rule: lightRule, dayOffset: 6, minuteOffset: 8 * 60 + 25 },
    );
  }

  if (members[1]) {
    schedules.push(
      { member: members[1], rule: lightRule, dayOffset: 0, minuteOffset: 7 * 60 + 50 },
      { member: members[1], rule: lightRule, dayOffset: 1, minuteOffset: 19 * 60 + 15 },
      { member: members[1], rule: lightRule, dayOffset: 3, minuteOffset: 7 * 60 + 35 },
      { member: members[1], rule: lightRule, dayOffset: 5, minuteOffset: 21 * 60 + 35 },
      { member: members[1], rule: coreRule, dayOffset: 6, minuteOffset: 19 * 60 + 40 },
    );
  }

  if (members[2]) {
    schedules.push(
      { member: members[2], rule: lightRule, dayOffset: 1, minuteOffset: 18 * 60 + 40 },
      { member: members[2], rule: coreRule, dayOffset: 3, minuteOffset: 20 * 60 + 5 },
      { member: members[2], rule: lightRule, dayOffset: 5, minuteOffset: 10 * 60 + 20 },
    );
  }

  for (let index = 3; index < members.length; index += 1) {
    const member = members[index];
    schedules.push(
      {
        member,
        rule: index % 2 === 0 ? coreRule : lightRule,
        dayOffset: (index + 1) % 7,
        minuteOffset: 18 * 60 + index * 17,
      },
      {
        member,
        rule: index % 3 === 0 ? epicRule : lightRule,
        dayOffset: (index + 3) % 7,
        minuteOffset: 20 * 60 + index * 13,
      },
    );
  }

  if (members.length === 1) {
    schedules.push(
      { member: members[0], rule: lightRule, dayOffset: 1, minuteOffset: 18 * 60 + 12 },
      { member: members[0], rule: epicRule, dayOffset: 3, minuteOffset: 20 * 60 + 22 },
      { member: members[0], rule: coreRule, dayOffset: 5, minuteOffset: 9 * 60 + 18 },
    );
  }

  return schedules.map((item, index) => {
    const createdAt = new Date(
      weekStart.getTime() +
        item.dayOffset * 24 * 60 * 60 * 1000 +
        item.minuteOffset * 60 * 1000,
    );
    const confirmedAt = new Date(createdAt.getTime() + 4 * 60 * 1000);
    const undoExpiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000);
    const serial = String(index + 1).padStart(2, '0');

    return {
      familyId,
      memberId: item.member.id,
      taskRuleId: item.rule.id,
      weekId,
      taskTypeSnapshot: item.rule.taskType,
      taskLabelSnapshot: item.rule.label,
      scoreDeltaSnapshot: item.rule.scoreDelta,
      memberNicknameSnapshot: item.member.nickname,
      clientEventId: `${SEED_PREFIX}:${weekId}:${serial}:${item.member.nickname}`,
      undoToken: `${SEED_PREFIX}:undo:${weekId}:${serial}:${item.member.id}`,
      undoExpiresAt,
      status: EventStatus.CONFIRMED,
      createdAt,
      confirmedAt,
    };
  });
}

function pickRuleByType(rules: ActiveRule[], taskType: TaskType) {
  return (
    rules.find((rule) => rule.taskType === taskType) ??
    rules.find((rule) => rule.taskType === TaskType.CORE) ??
    rules.find((rule) => rule.taskType === TaskType.LIGHT) ??
    rules[0]
  );
}

function summarizePlannedEvents(events: PlannedEvent[]) {
  const summaryMap = new Map<
    string,
    {
      memberNickname: string;
      eventCount: number;
      totalScore: number;
      taskTypes: Set<TaskType>;
    }
  >();

  for (const event of events) {
    const current = summaryMap.get(event.memberId) ?? {
      memberNickname: event.memberNicknameSnapshot,
      eventCount: 0,
      totalScore: 0,
      taskTypes: new Set<TaskType>(),
    };
    current.eventCount += 1;
    current.totalScore += event.scoreDeltaSnapshot;
    current.taskTypes.add(event.taskTypeSnapshot);
    summaryMap.set(event.memberId, current);
  }

  return Array.from(summaryMap.values())
    .map((item) => ({
      memberNickname: item.memberNickname,
      eventCount: item.eventCount,
      totalScore: item.totalScore,
      taskTypes: Array.from(item.taskTypes.values()),
    }))
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }

      return right.eventCount - left.eventCount;
    });
}

function parseWeekId(weekId: string) {
  const match = /^(?<year>\d{4})-W(?<week>\d{2})$/i.exec(weekId);
  if (!match?.groups) {
    throw new Error(`非法 weekId: ${weekId}`);
  }

  return {
    year: Number(match.groups.year),
    week: Number(match.groups.week),
  };
}

function getWeekStartUtc(weekId: string) {
  const { year, week } = parseWeekId(weekId);
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const day = januaryFourth.getUTCDay() || 7;
  const monday = new Date(januaryFourth);
  monday.setUTCDate(januaryFourth.getUTCDate() - day + 1 + (week - 1) * 7);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function shiftWeekId(weekId: string, delta: number) {
  const start = getWeekStartUtc(weekId);
  start.setUTCDate(start.getUTCDate() + delta * 7);
  return getWeekIdForTimezone(start, 'UTC');
}

function compareWeekId(left: string, right: string) {
  const leftParts = parseWeekId(left);
  const rightParts = parseWeekId(right);

  if (leftParts.year !== rightParts.year) {
    return leftParts.year - rightParts.year;
  }

  return leftParts.week - rightParts.week;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
