import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentAuth } from '../common/auth/current-auth.decorator';
import { successResponse } from '../common/http/api-response';
import type { RequestAuth } from '../common/auth/request-auth.interface';
import { CreateTaskRuleDto } from './dto/create-task-rule.dto';
import { DisableTaskRuleDto } from './dto/disable-task-rule.dto';
import { ListTaskRulesQueryDto } from './dto/list-task-rules.query';
import { ReorderTaskRulesDto } from './dto/reorder-task-rules.dto';
import { UpdateTaskRuleDto } from './dto/update-task-rule.dto';
import { TaskRulesService } from './task-rules.service';

@Controller('task-rules')
export class TaskRulesController {
  constructor(private readonly taskRulesService: TaskRulesService) {}

  @Get('_meta')
  getModuleInfo() {
    return successResponse(this.taskRulesService.getModuleInfo());
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  async listTaskRules(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ListTaskRulesQueryDto,
  ) {
    return successResponse(
      await this.taskRulesService.listTaskRules(auth.familyId, query),
    );
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  async createTaskRule(
    @CurrentAuth() auth: RequestAuth,
    @Body() dto: CreateTaskRuleDto,
  ) {
    return successResponse(
      await this.taskRulesService.createTaskRule(auth.familyId, dto),
    );
  }

  @Patch(':ruleId')
  @UseGuards(AccessTokenGuard)
  async updateTaskRule(
    @CurrentAuth() auth: RequestAuth,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateTaskRuleDto,
  ) {
    return successResponse(
      await this.taskRulesService.updateTaskRule(auth.familyId, ruleId, dto),
    );
  }

  @Post(':ruleId/disable')
  @UseGuards(AccessTokenGuard)
  async disableTaskRule(
    @CurrentAuth() auth: RequestAuth,
    @Param('ruleId') ruleId: string,
    @Body() dto: DisableTaskRuleDto,
  ) {
    return successResponse(
      await this.taskRulesService.disableTaskRule(auth.familyId, ruleId, dto),
    );
  }

  @Post('reorder')
  @UseGuards(AccessTokenGuard)
  async reorderTaskRules(
    @CurrentAuth() auth: RequestAuth,
    @Body() dto: ReorderTaskRulesDto,
  ) {
    return successResponse(
      await this.taskRulesService.reorderTaskRules(auth.familyId, dto),
    );
  }
}
