import { IsString } from 'class-validator';
import { IsOneOfOptions } from 'tg-bot/common/decorators';

export class OptionsInputDTO {
  @IsString({ message: 'The reply must be a string' })
  @IsOneOfOptions('options', { message: 'The reply must be one of the options' })
  input: string;

  @IsString({ each: true, message: 'Each option must be a string' })
  options: string[];

  constructor(input: string, options: string[]) {
    this.input = input;
    this.options = options;
  }
}
