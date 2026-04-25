import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentAuth } from '../common/auth/current-auth.decorator';
import type { RequestAuth } from '../common/auth/request-auth.interface';
import { successResponse } from '../common/http/api-response';
import { AnalyticsService } from './analytics.service';
import { AnalyticsOverviewQueryDto } from './dto/analytics-overview.query';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('_meta')
  getModuleInfo() {
    return successResponse(this.analyticsService.getModuleInfo());
  }

  @Get('overview')
  @UseGuards(AccessTokenGuard)
  async getOverview(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: AnalyticsOverviewQueryDto,
  ) {
    return successResponse(
      await this.analyticsService.getOverview(auth.familyId, query),
    );
  }
}
