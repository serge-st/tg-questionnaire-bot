import { IsBooleanString } from 'class-validator';

export class BooleanInputDTO {
  @IsBooleanString({ message: 'Input is not a boolean' })
  input: string;
}
