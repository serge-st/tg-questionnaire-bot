import { IsEmail } from 'class-validator';

export class EmailInputDTO {
  @IsEmail({}, { message: 'The input is not a valid email' })
  input: string;

  constructor(input: string) {
    this.input = input;
  }
}
