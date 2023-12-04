import { IsBooleanString } from 'class-validator';

export class BooleanInputDTO {
  @IsBooleanString({ message: 'The input is not a boolean' })
  input: string;

  constructor(input: string) {
    this.input = input;
  }
}
