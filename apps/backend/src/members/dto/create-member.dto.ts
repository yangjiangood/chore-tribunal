import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMemberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  nickname!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  avatarType!: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  avatarValue?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  cardColor!: string;
}
