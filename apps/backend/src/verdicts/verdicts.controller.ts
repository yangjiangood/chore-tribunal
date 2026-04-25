import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentAuth } from '../common/auth/current-auth.decorator';
import { successResponse } from '../common/http/api-response';
import type { RequestAuth } from '../common/auth/request-auth.interface';
import { GenerateVerdictDto } from './dto/generate-verdict.dto';
import { LatestVerdictQueryDto } from './dto/latest-verdict.query';
import { VerdictsService } from './verdicts.service';

@Controller('verdicts')
export class VerdictsController {
  constructor(private readonly verdictsService: VerdictsService) {}

  @Get('_meta')
  getModuleInfo() {
    return successResponse(this.verdictsService.getModuleInfo());
  }

  @Post('generate')
  @UseGuards(AccessTokenGuard)
  async generateVerdict(
    @CurrentAuth() auth: RequestAuth,
    @Body() dto: GenerateVerdictDto,
  ) {
    return successResponse(
      await this.verdictsService.generateVerdict(auth.familyId, dto),
    );
  }

  @Get('latest')
  @UseGuards(AccessTokenGuard)
  async getLatestVerdict(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: LatestVerdictQueryDto,
  ) {
    return successResponse(
      await this.verdictsService.getLatestVerdict(auth.familyId, query.weekId),
    );
  }
}
