import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { VerdictsController } from './verdicts.controller';
import { VerdictsService } from './verdicts.service';

@Module({
  imports: [AuthModule, RealtimeModule],
  controllers: [VerdictsController],
  providers: [VerdictsService],
  exports: [VerdictsService],
})
export class VerdictsModule {}
