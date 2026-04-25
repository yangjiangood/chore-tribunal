import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/chore_tribunal';

    super({
      adapter: new PrismaPg(connectionString),
    });
  }

  // 模块启动时主动建立数据库连接，避免首个请求承担额外连接开销。
  async onModuleInit() {
    await this.$connect();
  }

  // 模块销毁时主动释放连接，避免开发态频繁重启造成连接残留。
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
