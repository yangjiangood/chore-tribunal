import { Equals } from 'class-validator';

export class DisableMemberDto {
  @Equals(true, {
    message: '停用成员前必须明确确认',
  })
  confirm!: true;
}
