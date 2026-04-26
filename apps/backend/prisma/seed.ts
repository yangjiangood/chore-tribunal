import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  EventStatus,
  FamilyMode,
  PrismaClient,
} from '@prisma/client';
import { buildDefaultPreferences } from '../src/preferences/preferences.defaults';
import { hashPassword } from '../src/common/utils/password.util';
import { getWeekIdForTimezone } from '../src/common/utils/week.util';
import { getDefaultTaskRuleTemplates } from '../src/task-rules/task-rules.defaults';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://root:password123@localhost:5432/tribunal';

const prisma = new PrismaClient({
  adapter: new PrismaPg(connectionString),
});

async function main() {
  const accountName = 'tribunal-demo';
  const familyName = '周末裁判所';
  const timezone = 'Asia/Shanghai';
  const now = new Date();
  const currentWeekId = getWeekIdForTimezone(now, timezone);
  const password = await hashPassword('123456');

  const account = await prisma.familyAccount.upsert({
    where: {
      accountName,
    },
    update: {
      passwordHash: password.passwordHash,
      passwordAlgo: password.passwordAlgo,
    },
    create: {
      accountName,
      passwordHash: password.passwordHash,
      passwordAlgo: password.passwordAlgo,
    },
  });

  const family = await prisma.family.upsert({
    where: {
      accountId: account.id,
    },
    update: {
      name: familyName,
      mode: FamilyMode.CLOUD,
      timezone,
      currentWeekId,
    },
    create: {
      accountId: account.id,
      name: familyName,
      mode: FamilyMode.CLOUD,
      timezone,
      currentWeekId,
    },
  });

  await prisma.preference.upsert({
    where: {
      familyId: family.id,
    },
    update: {},
    create: buildDefaultPreferences(family.id),
  });

  const memberSeeds = [
    {
      nickname: '妈妈',
      avatarType: 'emoji',
      avatarValue: 'M',
      cardColor: 'gold-amber',
      sortOrder: 10,
    },
    {
      nickname: '爸爸',
      avatarType: 'emoji',
      avatarValue: 'D',
      cardColor: 'ink-red',
      sortOrder: 20,
    },
    {
      nickname: '孩子',
      avatarType: 'emoji',
      avatarValue: 'K',
      cardColor: 'sky-cyan',
      sortOrder: 30,
    },
  ];

  for (const member of memberSeeds) {
    await prisma.member.upsert({
      where: {
        familyId_nickname: {
          familyId: family.id,
          nickname: member.nickname,
        },
      },
      update: {
        avatarType: member.avatarType,
        avatarValue: member.avatarValue,
        cardColor: member.cardColor,
        sortOrder: member.sortOrder,
        joinedWeekId: currentWeekId,
      },
      create: {
        familyId: family.id,
        nickname: member.nickname,
        avatarType: member.avatarType,
        avatarValue: member.avatarValue,
        cardColor: member.cardColor,
        sortOrder: member.sortOrder,
        joinedWeekId: currentWeekId,
      },
    });
  }

  for (const rule of getDefaultTaskRuleTemplates()) {
    await prisma.taskRule.upsert({
      where: {
        familyId_label: {
          familyId: family.id,
          label: rule.label,
        },
      },
      update: {
        scoreDelta: rule.scoreDelta,
        sortOrder: rule.sortOrder,
        isPinned: rule.isPinned,
        status: 'ACTIVE',
      },
      create: {
        familyId: family.id,
        taskType: rule.taskType,
        label: rule.label,
        scoreDelta: rule.scoreDelta,
        sortOrder: rule.sortOrder,
        isPinned: rule.isPinned,
      },
    });
  }

  const existingEvents = await prisma.taskEvent.count({
    where: {
      familyId: family.id,
      weekId: currentWeekId,
    },
  });

  if (existingEvents === 0) {
    const [mom, dad] = await Promise.all([
      prisma.member.findFirstOrThrow({
        where: {
          familyId: family.id,
          nickname: '妈妈',
        },
      }),
      prisma.member.findFirstOrThrow({
        where: {
          familyId: family.id,
          nickname: '爸爸',
        },
      }),
    ]);

    const [washDish, mopFloor] = await Promise.all([
      prisma.taskRule.findFirstOrThrow({
        where: {
          familyId: family.id,
          label: '洗碗',
        },
      }),
      prisma.taskRule.findFirstOrThrow({
        where: {
          familyId: family.id,
          label: '拖地',
        },
      }),
    ]);

    await prisma.taskEvent.createMany({
      data: [
        {
          familyId: family.id,
          memberId: mom.id,
          taskRuleId: washDish.id,
          weekId: currentWeekId,
          taskTypeSnapshot: washDish.taskType,
          taskLabelSnapshot: washDish.label,
          scoreDeltaSnapshot: washDish.scoreDelta,
          memberNicknameSnapshot: mom.nickname,
          clientEventId: 'seed-event-mom-wash-dish',
          undoToken: 'seed-undo-mom-wash-dish',
          undoExpiresAt: new Date(now.getTime() - 60_000),
          status: EventStatus.CONFIRMED,
          createdAt: new Date(now.getTime() - 30 * 60_000),
          confirmedAt: new Date(now.getTime() - 25 * 60_000),
        },
        {
          familyId: family.id,
          memberId: dad.id,
          taskRuleId: mopFloor.id,
          weekId: currentWeekId,
          taskTypeSnapshot: mopFloor.taskType,
          taskLabelSnapshot: mopFloor.label,
          scoreDeltaSnapshot: mopFloor.scoreDelta,
          memberNicknameSnapshot: dad.nickname,
          clientEventId: 'seed-event-dad-mop-floor',
          undoToken: 'seed-undo-dad-mop-floor',
          undoExpiresAt: new Date(now.getTime() - 60_000),
          status: EventStatus.CONFIRMED,
          createdAt: new Date(now.getTime() - 10 * 60_000),
          confirmedAt: new Date(now.getTime() - 5 * 60_000),
        },
      ],
    });
  }

  console.log(
    JSON.stringify(
      {
        seeded: true,
        accountName,
        password: '123456',
        familyId: family.id,
        currentWeekId,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
