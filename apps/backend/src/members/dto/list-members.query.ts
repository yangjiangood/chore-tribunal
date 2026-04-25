import { IsEnum, IsOptional } from 'class-validator';
import { MemberStatus } from '@prisma/client';

export class ListMembersQueryDto {
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;
}
