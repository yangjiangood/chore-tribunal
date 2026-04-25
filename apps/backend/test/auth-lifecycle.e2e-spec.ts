import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './../src/prisma/prisma.service';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureTestApp } from './test-app.helper';

describe('Auth lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now().toString();
  const accountName = `auth-${suffix}`;
  const password = '123456';
  const newPassword = '654321';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureTestApp(moduleFixture.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        accountName,
        password,
        confirmPassword: password,
        familyName: `认证联调-${suffix}`,
        timezone: 'Asia/Shanghai',
      })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.familyAccount.deleteMany({
      where: {
        accountName,
      },
    });
    await app?.close();
  });

  it('refreshes and logs out a session', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        accountName,
        password,
        deviceLabel: 'auth-e2e',
      })
      .expect(201);

    const refreshToken = loginResponse.body.data.refreshToken as string;

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken,
      })
      .expect(201);

    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.data.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.data.refreshToken).toEqual(expect.any(String));
    expect(refreshResponse.body.data.refreshToken).not.toBe(refreshToken);

    const rotatedRefreshToken = refreshResponse.body.data
      .refreshToken as string;

    const logoutResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({
        refreshToken: rotatedRefreshToken,
      })
      .expect(201);

    expect(logoutResponse.body.success).toBe(true);
    expect(logoutResponse.body.data).toEqual({
      loggedOut: true,
    });

    const refreshAfterLogoutResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: rotatedRefreshToken,
      })
      .expect(401);

    expect(refreshAfterLogoutResponse.body.success).toBe(false);
    expect(refreshAfterLogoutResponse.body.error.code).toBe('UNAUTHORIZED');
  });

  it('changes password and rejects the old password afterwards', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        accountName,
        password,
        deviceLabel: 'change-password-e2e',
      })
      .expect(201);

    const accessToken = loginResponse.body.data.accessToken as string;

    const changePasswordResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: password,
        newPassword,
        confirmPassword: newPassword,
      })
      .expect(201);

    expect(changePasswordResponse.body.success).toBe(true);
    expect(changePasswordResponse.body.data).toEqual({
      changed: true,
    });

    const oldPasswordLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        accountName,
        password,
      })
      .expect(401);

    expect(oldPasswordLoginResponse.body.success).toBe(false);
    expect(oldPasswordLoginResponse.body.error.code).toBe('UNAUTHORIZED');

    const newPasswordLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        accountName,
        password: newPassword,
      })
      .expect(201);

    expect(newPasswordLoginResponse.body.success).toBe(true);
    expect(newPasswordLoginResponse.body.data.accessToken).toEqual(
      expect.any(String),
    );
  });
});
