import { INestApplication } from '@nestjs/common';
import { EventStatus, MemberStatus, TaskType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { getWeekIdForTimezone } from '../src/common/utils/week.util';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureTestApp } from './test-app.helper';

describe('Analytics overview (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now().toString();
  const accountName = `analytics-${suffix}`;
  const password = '123456';
  const familyName = `Analytics Family ${suffix}`;
  let familyId = '';
  let accessToken = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureTestApp(moduleFixture.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (familyId) {
      await prisma.familyAccount.deleteMany({
        where: {
          accountName,
        },
      });
    }

    await app?.close();
  });

  it('returns real overview analytics aggregated from confirmed events', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        accountName,
        password,
        confirmPassword: password,
        familyName,
        timezone: 'Asia/Shanghai',
      })
      .expect(201);

    familyId = registerResponse.body.data.familyId as string;

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        accountName,
        password,
        deviceLabel: 'analytics-e2e',
      })
      .expect(201);

    accessToken = loginResponse.body.data.accessToken as string;

    const family = await prisma.family.findUniqueOrThrow({
      where: {
        id: familyId,
      },
      select: {
        timezone: true,
      },
    });

    const [alice, bob] = await Promise.all([
      prisma.member.create({
        data: {
          familyId,
          nickname: `Alice-${suffix}`,
          avatarType: 'emoji',
          avatarValue: 'A',
          cardColor: 'gold-amber',
          sortOrder: 10,
          status: MemberStatus.ACTIVE,
          joinedWeekId: getWeekIdForTimezone(new Date(), family.timezone),
        },
      }),
      prisma.member.create({
        data: {
          familyId,
          nickname: `Bob-${suffix}`,
          avatarType: 'emoji',
          avatarValue: 'B',
          cardColor: 'ink-red',
          sortOrder: 20,
          status: MemberStatus.ACTIVE,
          joinedWeekId: getWeekIdForTimezone(new Date(), family.timezone),
        },
      }),
    ]);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const seventeenDaysAgo = new Date();
    seventeenDaysAgo.setDate(seventeenDaysAgo.getDate() - 17);

    await prisma.taskEvent.createMany({
      data: [
        {
          familyId,
          memberId: alice.id,
          weekId: getWeekIdForTimezone(threeDaysAgo, family.timezone),
          taskTypeSnapshot: TaskType.EPIC,
          taskLabelSnapshot: 'Cook dinner',
          scoreDeltaSnapshot: 5,
          memberNicknameSnapshot: alice.nickname,
          clientEventId: randomUUID(),
          undoToken: randomUUID(),
          undoExpiresAt: threeDaysAgo,
          status: EventStatus.CONFIRMED,
          createdAt: threeDaysAgo,
          confirmedAt: threeDaysAgo,
        },
        {
          familyId,
          memberId: bob.id,
          weekId: getWeekIdForTimezone(tenDaysAgo, family.timezone),
          taskTypeSnapshot: TaskType.CORE,
          taskLabelSnapshot: 'Clean kitchen',
          scoreDeltaSnapshot: 3,
          memberNicknameSnapshot: bob.nickname,
          clientEventId: randomUUID(),
          undoToken: randomUUID(),
          undoExpiresAt: tenDaysAgo,
          status: EventStatus.CONFIRMED,
          createdAt: tenDaysAgo,
          confirmedAt: tenDaysAgo,
        },
        {
          familyId,
          memberId: alice.id,
          weekId: getWeekIdForTimezone(seventeenDaysAgo, family.timezone),
          taskTypeSnapshot: TaskType.CORE,
          taskLabelSnapshot: 'Vacuum living room',
          scoreDeltaSnapshot: 3,
          memberNicknameSnapshot: alice.nickname,
          clientEventId: randomUUID(),
          undoToken: randomUUID(),
          undoExpiresAt: seventeenDaysAgo,
          status: EventStatus.CONFIRMED,
          createdAt: seventeenDaysAgo,
          confirmedAt: seventeenDaysAgo,
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/analytics/overview')
      .query({
        range: '4w',
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.range).toBe('4w');
    expect(response.body.data.overviewMetrics).toEqual(
      expect.objectContaining({
        totalEvents: 3,
        totalScore: 11,
        activeMembers: 2,
        participatingMembers: 2,
        leaderNickname: alice.nickname,
        leaderScore: 8,
      }),
    );
    expect(response.body.data.trendCharts.weeklyTotals).toHaveLength(4);
    expect(response.body.data.trendCharts.taskTypeDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskType: 'CORE',
          count: 2,
          totalScore: 6,
        }),
        expect.objectContaining({
          taskType: 'EPIC',
          count: 1,
          totalScore: 5,
        }),
      ]),
    );
    expect(response.body.data.fairnessCharts.memberScoreComparison).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberId: alice.id,
          totalScore: 8,
          eventCount: 2,
        }),
        expect.objectContaining({
          memberId: bob.id,
          totalScore: 3,
          eventCount: 1,
        }),
      ]),
    );
    expect(response.body.data.systemSummary).toEqual(
      expect.objectContaining({
        overall: expect.any(String),
        fairness: expect.any(String),
        trend: expect.any(String),
      }),
    );
  });
});
