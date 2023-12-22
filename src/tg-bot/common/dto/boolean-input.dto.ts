import { IsBooleanString } from 'class-validator';

export class BooleanInputDTO {
  @IsBooleanString({ message: 'The reply must be "true" or "false"' })
  input: string;

  constructor(input: string) {
    this.input = input;
  }
}
