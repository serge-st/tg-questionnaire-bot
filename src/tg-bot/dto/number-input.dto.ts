import { IsNumberString } from 'class-validator';

export class NumberInputDTO {
  @IsNumberString({}, { message: 'The input is not a valid number' })
  input: string;
}
