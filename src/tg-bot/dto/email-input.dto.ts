import { IsEmail } from 'class-validator';

export class EmailInputDTO {
  @IsEmail({}, { message: 'Please provide a valid email' })
  input: string;

  constructor(input: string) {
    this.input = input;
  }
}
