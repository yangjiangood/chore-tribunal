import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  accountName!: string;

  @IsString()
  @Length(6, 20)
  password!: string;

  @IsString()
  @Length(6, 20)
  confirmPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  familyName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  timezone!: string;
}
