import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './analytics/analytics.module';
import { ArchivesModule } from './archives/archives.module';
import { AuthModule } from './auth/auth.module';
import { BoardModule } from './board/board.module';
import { EventsModule } from './events/events.module';
import { FamiliesModule } from './families/families.module';
import { MembersModule } from './members/members.module';
import { PreferencesModule } from './preferences/preferences.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { TaskRulesModule } from './task-rules/task-rules.module';
import { VerdictsModule } from './verdicts/verdicts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BoardModule,
    PrismaModule,
    AuthModule,
    FamiliesModule,
    MembersModule,
    TaskRulesModule,
    EventsModule,
    ArchivesModule,
    AnalyticsModule,
    VerdictsModule,
    PreferencesModule,
    RealtimeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
