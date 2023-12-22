import { IsString } from 'class-validator';

export class StringInputDTO {
  @IsString({ message: 'The reply must be a string' })
  input: string;

  constructor(input: string) {
    this.input = input;
  }
}
