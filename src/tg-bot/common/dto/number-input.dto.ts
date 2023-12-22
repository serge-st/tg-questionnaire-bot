import { IsNumberString } from 'class-validator';

export class NumberInputDTO {
  @IsNumberString({}, { message: 'The reply must be a number' })
  input: string;

  constructor(input: string) {
    this.input = input;
  }
}
