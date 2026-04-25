import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './../src/prisma/prisma.service';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureTestApp } from './test-app.helper';

describe('Control center CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now().toString();
  const accountName = `control-${suffix}`;
  const password = '123456';
  let familyId = '';
  let accessToken = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureTestApp(moduleFixture.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        accountName,
        password,
        confirmPassword: password,
        familyName: `控制台联调-${suffix}`,
        timezone: 'Asia/Shanghai',
      })
      .expect(201);

    familyId = registerResponse.body.data.familyId as string;

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        accountName,
        password,
        deviceLabel: 'control-center-e2e',
      })
      .expect(201);

    accessToken = loginResponse.body.data.accessToken as string;
  });

  afterAll(async () => {
    await prisma.familyAccount.deleteMany({
      where: {
        accountName,
      },
    });
    await app?.close();
  });

  it('supports members CRUD operations', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        nickname: `成员甲-${suffix}`,
        avatarType: 'emoji',
        avatarValue: 'A',
        cardColor: 'gold-amber',
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    const createdMemberId = createResponse.body.data.id as string;

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/members?status=ACTIVE')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdMemberId,
          nickname: `成员甲-${suffix}`,
        }),
      ]),
    );

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/members/${createdMemberId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        nickname: `成员乙-${suffix}`,
        cardColor: 'ink-red',
      })
      .expect(200);

    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data.nickname).toBe(`成员乙-${suffix}`);
    expect(updateResponse.body.data.cardColor).toBe('ink-red');

    const disableResponse = await request(app.getHttpServer())
      .post(`/api/v1/members/${createdMemberId}/disable`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        confirm: true,
      })
      .expect(201);

    expect(disableResponse.body.success).toBe(true);
    expect(disableResponse.body.data.status).toBe('DISABLED');

    const disabledListResponse = await request(app.getHttpServer())
      .get('/api/v1/members?status=DISABLED')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(disabledListResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdMemberId,
          status: 'DISABLED',
        }),
      ]),
    );

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/v1/members/${createdMemberId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(deleteResponse.body.success).toBe(true);
    expect(deleteResponse.body.data).toEqual({
      deleted: true,
      memberId: createdMemberId,
    });

    const deletedMember = await prisma.member.findUnique({
      where: {
        id: createdMemberId,
      },
    });

    expect(deletedMember).toBeNull();
  });

  it('supports task-rules CRUD and reorder operations', async () => {
    const [createFirstRuleResponse, createSecondRuleResponse] =
      await Promise.all([
        request(app.getHttpServer())
          .post('/api/v1/task-rules')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            taskType: 'CORE',
            label: `规则一-${suffix}`,
            scoreDelta: 3,
            sortOrder: 10,
            isPinned: true,
          })
          .expect(201),
        request(app.getHttpServer())
          .post('/api/v1/task-rules')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            taskType: 'LIGHT',
            label: `规则二-${suffix}`,
            scoreDelta: 1,
            sortOrder: 20,
            isPinned: false,
          })
          .expect(201),
      ]);

    const firstRuleId = createFirstRuleResponse.body.data.id as string;
    const secondRuleId = createSecondRuleResponse.body.data.id as string;

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/task-rules?status=ACTIVE')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: firstRuleId,
          label: `规则一-${suffix}`,
        }),
        expect.objectContaining({
          id: secondRuleId,
          label: `规则二-${suffix}`,
        }),
      ]),
    );

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/task-rules/${firstRuleId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        label: `规则一改-${suffix}`,
        scoreDelta: 5,
      })
      .expect(200);

    expect(updateResponse.body.data.label).toBe(`规则一改-${suffix}`);
    expect(updateResponse.body.data.scoreDelta).toBe(5);

    const reorderResponse = await request(app.getHttpServer())
      .post('/api/v1/task-rules/reorder')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        items: [
          { id: firstRuleId, sortOrder: 30 },
          { id: secondRuleId, sortOrder: 5 },
        ],
      })
      .expect(201);

    expect(reorderResponse.body.success).toBe(true);
    const reorderedRules = reorderResponse.body.data as Array<{
      id: string;
      sortOrder: number;
    }>;
    const firstRule = reorderedRules.find((rule) => rule.id === firstRuleId);
    const secondRule = reorderedRules.find((rule) => rule.id === secondRuleId);
    expect(firstRule?.sortOrder).toBe(30);
    expect(secondRule?.sortOrder).toBe(5);

    const disableResponse = await request(app.getHttpServer())
      .post(`/api/v1/task-rules/${firstRuleId}/disable`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        confirm: true,
      })
      .expect(201);

    expect(disableResponse.body.success).toBe(true);
    expect(disableResponse.body.data.status).toBe('DISABLED');

    const disabledRulesResponse = await request(app.getHttpServer())
      .get('/api/v1/task-rules?status=DISABLED')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(disabledRulesResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: firstRuleId,
          status: 'DISABLED',
        }),
      ]),
    );
  });

  it('rejects deleting members that already have history', async () => {
    const currentWeekId = (
      await prisma.family.findUniqueOrThrow({
        where: {
          id: familyId,
        },
        select: {
          currentWeekId: true,
        },
      })
    ).currentWeekId;

    const member = await prisma.member.create({
      data: {
        familyId,
        nickname: `成员历史-${suffix}`,
        avatarType: 'emoji',
        avatarValue: 'H',
        cardColor: 'sky-cyan',
        joinedWeekId: currentWeekId,
      },
    });

    const taskRule = await prisma.taskRule.create({
      data: {
        familyId,
        taskType: 'CORE',
        label: `历史规则-${suffix}`,
        scoreDelta: 2,
      },
    });

    await prisma.taskEvent.create({
      data: {
        familyId,
        memberId: member.id,
        taskRuleId: taskRule.id,
        weekId: currentWeekId,
        taskTypeSnapshot: taskRule.taskType,
        taskLabelSnapshot: taskRule.label,
        scoreDeltaSnapshot: taskRule.scoreDelta,
        memberNicknameSnapshot: member.nickname,
        clientEventId: `history-event-${suffix}`,
        undoToken: `history-undo-${suffix}`,
        undoExpiresAt: new Date(Date.now() - 60_000),
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/members/${member.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe('成员已有历史事件，不能直接删除');
  });
});
