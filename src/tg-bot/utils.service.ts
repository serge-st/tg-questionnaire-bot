import { Injectable } from '@nestjs/common';
import { validate as cvValidate } from 'class-validator';
import { AnswerData } from 'tg-bot/types';
import { StringInputDTO, NumberInputDTO, EmailInputDTO, BooleanInputDTO, OptionsInputDTO } from 'tg-bot/dto';
import { FitQuestionnaire } from './fit-questionnaire';

export type InputDataType = keyof UtilsService['validate'];
export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

@Injectable()
export class UtilsService {
  validate = {
    string: async (input: string): Promise<ValidationResult> => {
      const dto = new StringInputDTO(input);
      return await this.getValidationResult<StringInputDTO>(dto);
    },

    email: async (input: string): Promise<ValidationResult> => {
      const dto = new EmailInputDTO(input);
      return this.getValidationResult<EmailInputDTO>(dto);
    },

    number: async (input: string): Promise<ValidationResult> => {
      const preParsedInput = this.preParseNumber(input);
      const dto = new NumberInputDTO(preParsedInput);
      return await this.getValidationResult<NumberInputDTO>(dto);
    },

    boolean: async (input: string): Promise<ValidationResult> => {
      const dto = new BooleanInputDTO(input);
      return await this.getValidationResult<BooleanInputDTO>(dto);
    },

    options: async (input: string, options: string[]): Promise<ValidationResult> => {
      const dto = new OptionsInputDTO(input, options);
      return await this.getValidationResult<OptionsInputDTO>(dto);
    },

    picture: async (input: string): Promise<ValidationResult> => {
      if (input) {
        return { isValid: false, errors: ['Please sent a picture'] };
      }
      return { isValid: true, errors: [] };
    },
  };

  async getValidationResult<T extends object>(dto: T): Promise<ValidationResult> {
    const errors = await cvValidate(dto);
    return {
      isValid: errors.length === 0,
      errors: errors.flatMap((error) => Object.values(error.constraints)),
    };
  }

  private preParseNumber = (input: string): string => {
    return input.replaceAll(' ', '').replace(',', '.');
  };

  getQuestionData(questionnaire: FitQuestionnaire): [InputDataType, string, string | undefined] {
    const question = questionnaire.questions[questionnaire.currentQuestionIndex];
    const { text, placeholder, type } = question;
    return [type, text, placeholder];
  }

  addResponse(response: AnswerData, questionnaire: FitQuestionnaire): void {
    questionnaire.questions[questionnaire.currentQuestionIndex].response = response;
    questionnaire.currentQuestionIndex += 1;
  }

  isQuestionnaireComplete(questionnaire: FitQuestionnaire): boolean {
    return questionnaire.currentQuestionIndex === questionnaire.questions.length;
  }

  // TODO: add check if message function to check for:
  // context ('message' in currentUpdate).
}
