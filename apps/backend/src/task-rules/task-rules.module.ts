import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TaskRulesController } from './task-rules.controller';
import { TaskRulesService } from './task-rules.service';

@Module({
  imports: [AuthModule],
  controllers: [TaskRulesController],
  providers: [TaskRulesService],
  exports: [TaskRulesService],
})
export class TaskRulesModule {}
