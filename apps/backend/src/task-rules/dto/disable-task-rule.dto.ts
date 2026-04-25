import { Equals } from 'class-validator';

export class DisableTaskRuleDto {
  @Equals(true, {
    message: '停用规则前必须明确确认',
  })
  confirm!: true;
}
