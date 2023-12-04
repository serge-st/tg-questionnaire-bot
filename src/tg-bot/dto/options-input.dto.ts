import { IsString } from 'class-validator';
import { IsOneOfOptions } from 'tg-bot/decorators';

export class OptionsInputDTO {
  @IsString({ message: 'The input must be a string' })
  @IsOneOfOptions('options', { message: 'Input must be one of the options' })
  input: string;

  @IsString({ each: true, message: 'Each option must be a string' })
  options: string[];

  constructor(input: string, options: string[]) {
    this.input = input;
    this.options = options;
  }
}

// import { IsString, ValidateIf } from 'class-validator';

// export class OptionsInputDTO {
//   @IsString({ message: 'The input must be a string' })
//   input: string;

//   @ValidateIf((dto) => {
//     console.log('dto', dto);
//     return Array.isArray(dto.options) && dto.options.length > 0;
//   })
//   @IsString({ each: true, message: 'Each option must be a string' })
//   options: string[];

//   constructor(input: string, options: string[]) {
//     this.input = input;
//     this.options = options;
//   }
// }
