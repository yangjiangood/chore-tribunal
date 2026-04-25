import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @Length(6, 20)
  currentPassword!: string;

  @IsString()
  @Length(6, 20)
  newPassword!: string;

  @IsString()
  @Length(6, 20)
  confirmPassword!: string;
}
