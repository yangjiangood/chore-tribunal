import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RevertEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  undoToken!: string;
}
