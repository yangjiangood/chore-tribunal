import { Controller, Get, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentAuth } from '../common/auth/current-auth.decorator';
import { successResponse } from '../common/http/api-response';
import type { RequestAuth } from '../common/auth/request-auth.interface';
import { FamiliesService } from './families.service';

@Controller('families')
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Get('_meta')
  getModuleInfo() {
    return successResponse(this.familiesService.getModuleInfo());
  }

  @Get('me/bootstrap')
  @UseGuards(AccessTokenGuard)
  async getBootstrap(@CurrentAuth() auth: RequestAuth) {
    return successResponse(
      await this.familiesService.getBootstrap(auth.familyId),
    );
  }
}
