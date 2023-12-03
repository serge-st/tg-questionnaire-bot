import { IsString } from 'class-validator';

export class StringInputDTO {
  @IsString({ message: 'The input is not a string' })
  input: string;
}