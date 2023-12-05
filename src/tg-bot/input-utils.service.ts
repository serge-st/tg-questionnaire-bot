import { Injectable } from '@nestjs/common';
import { validate as cvValidate } from 'class-validator';
import { StringInputDTO, NumberInputDTO, EmailInputDTO, BooleanInputDTO } from './dto';
import { OptionsInputDTO } from './dto/options-input.dto';

export type InputDataType = keyof InputUtilsService['validate'];

@Injectable()
export class InputUtilsService {
  validate = {
    string: async (input: string): Promise<boolean> => {
      const dto = new StringInputDTO(input);
      const errors = await cvValidate(dto);
      return errors.length === 0;
    },

    email: async (input: string): Promise<boolean> => {
      const dto = new EmailInputDTO(input);
      const errors = await cvValidate(dto);
      return errors.length === 0;
    },

    number: async (input: string): Promise<boolean> => {
      const preParsedInput = this.preParseNumber(input);
      const dto = new NumberInputDTO(preParsedInput);
      const errors = await cvValidate(dto);
      return errors.length === 0;
    },

    boolean: async (input: string): Promise<boolean> => {
      const dto = new BooleanInputDTO(input);
      const errors = await cvValidate(dto);
      return errors.length === 0;
    },

    options: async (input: string, options: string[]): Promise<boolean> => {
      const dto = new OptionsInputDTO(input, options);
      const errors = await cvValidate(dto);
      return errors.length === 0;
    },
  };

  private preParseNumber = (input: string): string => {
    return input.replaceAll(' ', '').replace(',', '.');
  };

  parseNumber = (input: string): number | null => {
    const formattedInput = input.replaceAll(' ', '').replace(',', '.');
    const parsed = parseFloat(formattedInput);
    return isNaN(parsed) ? null : parsed;
  };

  parseBoolean = (input: string): boolean | null => {
    return input === 'true' ? true : input === 'false' ? false : null;
  };
}
