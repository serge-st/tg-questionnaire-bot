import { IsString } from 'class-validator';

export class StringInputDTO {
  @IsString({ message: 'Input is not a string' })
  input: string;
}
