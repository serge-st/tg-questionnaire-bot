import { IsEmail } from 'class-validator';

export class EmailInputDTO {
  @IsEmail({}, { message: 'Input is not a valid email' })
  input: string;
}
