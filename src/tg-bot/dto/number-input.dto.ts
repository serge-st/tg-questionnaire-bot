import { IsNumberString } from 'class-validator';

export class NumberInputDTO {
  @IsNumberString({}, { message: 'Input is not a valid number' })
  input: string;
}
