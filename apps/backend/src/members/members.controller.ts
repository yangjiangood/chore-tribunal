import {
  Body,
  Controller,
  Delete,
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
import { CreateMemberDto } from './dto/create-member.dto';
import { DisableMemberDto } from './dto/disable-member.dto';
import { ListMembersQueryDto } from './dto/list-members.query';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('_meta')
  getModuleInfo() {
    return successResponse(this.membersService.getModuleInfo());
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  async listMembers(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ListMembersQueryDto,
  ) {
    return successResponse(
      await this.membersService.listMembers(auth.familyId, query),
    );
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  async createMember(
    @CurrentAuth() auth: RequestAuth,
    @Body() dto: CreateMemberDto,
  ) {
    return successResponse(
      await this.membersService.createMember(auth.familyId, dto),
    );
  }

  @Patch(':memberId')
  @UseGuards(AccessTokenGuard)
  async updateMember(
    @CurrentAuth() auth: RequestAuth,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return successResponse(
      await this.membersService.updateMember(auth.familyId, memberId, dto),
    );
  }

  @Post(':memberId/disable')
  @UseGuards(AccessTokenGuard)
  async disableMember(
    @CurrentAuth() auth: RequestAuth,
    @Param('memberId') memberId: string,
    @Body() dto: DisableMemberDto,
  ) {
    return successResponse(
      await this.membersService.disableMember(auth.familyId, memberId, dto),
    );
  }

  @Delete(':memberId')
  @UseGuards(AccessTokenGuard)
  async deleteMember(
    @CurrentAuth() auth: RequestAuth,
    @Param('memberId') memberId: string,
  ) {
    return successResponse(
      await this.membersService.deleteMember(auth.familyId, memberId),
    );
  }
}
