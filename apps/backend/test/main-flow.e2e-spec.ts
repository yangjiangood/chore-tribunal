import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  MemberStatus,
  PrismaClient,
  TaskRuleStatus,
  TaskType,
} from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { configureTestApp } from './test-app.helper';

describe('Main flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now().toString();
  const accountName = `e2e-${suffix}`;
  const password = '123456';
  const familyName = `联调家庭-${suffix}`;
  let familyId = '';
  let accessToken = '';
  let currentWeekId = '';
  let memberId = '';
  let taskRuleId = '';

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

  it('registers, logs in, loads bootstrap, updates preferences, creates and reverts an event', async () => {
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

    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data.accountName).toBe(accountName);
    familyId = registerResponse.body.data.familyId;

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        accountName,
        password,
        deviceLabel: 'e2e-runner',
      })
      .expect(201);

    expect(loginResponse.body.success).toBe(true);
    accessToken = loginResponse.body.data.accessToken;
    expect(accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.data.family.id).toBe(familyId);

    const family = await prisma.family.findUniqueOrThrow({
      where: {
        id: familyId,
      },
      select: {
        currentWeekId: true,
      },
    });
    currentWeekId = family.currentWeekId;

    const [member, taskRule] = await Promise.all([
      prisma.member.create({
        data: {
          familyId,
          nickname: `成员-${suffix}`,
          avatarType: 'emoji',
          avatarValue: 'E',
          cardColor: 'gold-amber',
          sortOrder: 10,
          status: MemberStatus.ACTIVE,
          joinedWeekId: currentWeekId,
        },
      }),
      prisma.taskRule.create({
        data: {
          familyId,
          taskType: TaskType.CORE,
          label: `规则-${suffix}`,
          scoreDelta: 3,
          sortOrder: 10,
          isPinned: true,
          status: TaskRuleStatus.ACTIVE,
        },
      }),
    ]);

    memberId = member.id;
    taskRuleId = taskRule.id;

    const bootstrapResponse = await request(app.getHttpServer())
      .get('/api/v1/families/me/bootstrap')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(bootstrapResponse.body.success).toBe(true);
    expect(bootstrapResponse.body.data.family.id).toBe(familyId);
    expect(bootstrapResponse.body.data.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: memberId,
          nickname: `成员-${suffix}`,
        }),
      ]),
    );
    expect(bootstrapResponse.body.data.taskRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: taskRuleId,
          label: `规则-${suffix}`,
        }),
      ]),
    );

    const getPreferencesResponse = await request(app.getHttpServer())
      .get('/api/v1/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getPreferencesResponse.body.success).toBe(true);
    expect(getPreferencesResponse.body.data.themeStyle).toBe('public-bulletin');

    const updatePreferencesResponse = await request(app.getHttpServer())
      .patch('/api/v1/preferences')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        soundEnabled: true,
        themeStyle: 'trial-room',
        verdictToxicityLevel: 7,
      })
      .expect(200);

    expect(updatePreferencesResponse.body.success).toBe(true);
    expect(updatePreferencesResponse.body.data.soundEnabled).toBe(true);
    expect(updatePreferencesResponse.body.data.themeStyle).toBe('trial-room');
    expect(updatePreferencesResponse.body.data.verdictToxicityLevel).toBe(7);

    const createEventResponse = await request(app.getHttpServer())
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        memberId,
        taskRuleId,
        clientEventId: `client-${suffix}`,
        timestamp: new Date().toISOString(),
      })
      .expect(201);

    expect(createEventResponse.body.success).toBe(true);
    expect(createEventResponse.body.data.event.status).toBe('PENDING');
    expect(createEventResponse.body.data.boardSnapshot.rankings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberId,
          score: 3,
          pendingCount: 1,
        }),
      ]),
    );

    const { serverEventId, undoToken } = createEventResponse.body.data
      .event as {
      serverEventId: string;
      undoToken: string;
    };

    const revertEventResponse = await request(app.getHttpServer())
      .post(`/api/v1/events/${serverEventId}/revert`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        undoToken,
      })
      .expect(201);

    expect(revertEventResponse.body.success).toBe(true);
    expect(revertEventResponse.body.data.reverted).toBe(true);
    expect(revertEventResponse.body.data.eventStatus).toBe('REVERTED');
    expect(revertEventResponse.body.data.boardSnapshot.rankings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberId,
          score: 0,
          pendingCount: 0,
          confirmedCount: 0,
        }),
      ]),
    );

    const revertedEvent = await prisma.taskEvent.findUniqueOrThrow({
      where: {
        id: serverEventId,
      },
      select: {
        status: true,
      },
    });

    expect(revertedEvent.status).toBe('REVERTED');

    const listEventsResponse = await request(app.getHttpServer())
      .get('/api/v1/events')
      .query({
        memberId,
        status: 'REVERTED',
        page: 1,
        pageSize: 10,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listEventsResponse.body.success).toBe(true);
    expect(listEventsResponse.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: serverEventId,
          memberId,
          taskType: 'CORE',
          status: 'REVERTED',
        }),
      ]),
    );
    expect(listEventsResponse.body.data.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 10,
      }),
    );
  });
});
