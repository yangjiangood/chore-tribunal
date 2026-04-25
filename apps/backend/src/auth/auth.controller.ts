import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentAuth } from '../common/auth/current-auth.decorator';
import { successResponse } from '../common/http/api-response';
import type { RequestAuth } from '../common/auth/request-auth.interface';
import { AccessTokenGuard } from './access-token.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 使用轻量元信息接口确认模块已挂载，避免在业务接口未实现前完全无感知。
  @Get('_meta')
  getModuleInfo() {
    return successResponse(this.authService.getModuleInfo());
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return successResponse(await this.authService.register(dto));
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return successResponse(await this.authService.login(dto));
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return successResponse(await this.authService.refresh(dto));
  }

  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto) {
    return successResponse(await this.authService.logout(dto));
  }

  @Post('change-password')
  @UseGuards(AccessTokenGuard)
  async changePassword(
    @CurrentAuth() auth: RequestAuth,
    @Body() dto: ChangePasswordDto,
  ) {
    return successResponse(await this.authService.changePassword(auth, dto));
  }
}
