import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentAuth } from '../common/auth/current-auth.decorator';
import { successResponse } from '../common/http/api-response';
import type { RequestAuth } from '../common/auth/request-auth.interface';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get('_meta')
  getModuleInfo() {
    return successResponse(this.preferencesService.getModuleInfo());
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  async getPreferences(@CurrentAuth() auth: RequestAuth) {
    return successResponse(
      await this.preferencesService.getPreferences(auth.familyId),
    );
  }

  @Patch()
  @UseGuards(AccessTokenGuard)
  async updatePreferences(
    @CurrentAuth() auth: RequestAuth,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return successResponse(
      await this.preferencesService.updatePreferences(auth.familyId, dto),
    );
  }
}
