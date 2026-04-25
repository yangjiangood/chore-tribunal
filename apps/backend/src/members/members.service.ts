import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberStatus, Prisma } from '@prisma/client';
import { getWeekIdForTimezone } from '../common/utils/week.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { DisableMemberDto } from './dto/disable-member.dto';
import { ListMembersQueryDto } from './dto/list-members.query';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  getModuleInfo() {
    return {
      module: 'members',
      status: 'crud-implemented',
    };
  }

  async listMembers(familyId: string, query: ListMembersQueryDto) {
    return this.prisma.member.findMany({
      where: {
        familyId,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createMember(familyId: string, dto: CreateMemberDto) {
    const family = await this.prisma.family.findUniqueOrThrow({
      where: {
        id: familyId,
      },
      select: {
        timezone: true,
      },
    });

    try {
      return await this.prisma.member.create({
        data: {
          familyId,
          nickname: dto.nickname,
          avatarType: dto.avatarType,
          avatarUrl: dto.avatarUrl,
          avatarValue: dto.avatarValue,
          cardColor: dto.cardColor,
          joinedWeekId: getWeekIdForTimezone(new Date(), family.timezone),
        },
      });
    } catch (error) {
      this.rethrowConflict(error, '该昵称已存在，请换一个成员昵称');
      throw error;
    }
  }

  async updateMember(familyId: string, memberId: string, dto: UpdateMemberDto) {
    const member = await this.findMemberOrThrow(familyId, memberId);
    const nextData: Prisma.MemberUpdateInput = { ...dto };

    if (
      dto.status === MemberStatus.ACTIVE &&
      member.status === MemberStatus.DISABLED
    ) {
      nextData.leftWeekId = null;
    }

    try {
      return await this.prisma.member.update({
        where: {
          id: memberId,
        },
        data: nextData,
      });
    } catch (error) {
      this.rethrowConflict(error, '该昵称已存在，请换一个成员昵称');
      throw error;
    }
  }

  async disableMember(
    familyId: string,
    memberId: string,
    dto: DisableMemberDto,
  ) {
    void dto;
    const member = await this.findMemberOrThrow(familyId, memberId);

    if (member.status === MemberStatus.DISABLED) {
      return member;
    }

    const family = await this.prisma.family.findUniqueOrThrow({
      where: {
        id: familyId,
      },
      select: {
        currentWeekId: true,
      },
    });

    return this.prisma.member.update({
      where: {
        id: memberId,
      },
      data: {
        status: MemberStatus.DISABLED,
        leftWeekId: family.currentWeekId,
      },
    });
  }

  async deleteMember(familyId: string, memberId: string) {
    await this.findMemberOrThrow(familyId, memberId);

    const eventCount = await this.prisma.taskEvent.count({
      where: {
        familyId,
        memberId,
      },
    });

    if (eventCount > 0) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: '成员已有历史事件，不能直接删除',
      });
    }

    await this.prisma.member.delete({
      where: {
        id: memberId,
      },
    });

    return {
      deleted: true,
      memberId,
    };
  }

  private async findMemberOrThrow(familyId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        familyId,
      },
    });

    if (!member) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: '成员不存在',
      });
    }

    return member;
  }

  private rethrowConflict(error: unknown, message: string) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: 'CONFLICT',
        message,
      });
    }
  }
}
