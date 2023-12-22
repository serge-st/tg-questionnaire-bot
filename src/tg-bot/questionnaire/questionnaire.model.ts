import { InputDataType } from 'tg-bot/validation';

export type Question = {
  text: string;
  responseKey: string;
  placeholder?: string;
  type: InputDataType;
  response?: AnswerData;
  options?: Option[];
  preMessage?: {
    text: string;
    link?: {
      placeholder: string;
      url: string;
    };
  };
  skipIf?: Record<Question['responseKey'], boolean>;
};

export type Option = {
  label: string;
  value: AnswerData;
};

export type AnswerData = number | string | boolean | 'skipped';

export class Questionnaire {
  questions: Question[];
  userId: number; // Telegram user id
  userInfo: string; // TG username or first_name + ?last_name
  currentQuestionIndex = 0;

  constructor(questions: Question[], userId: number, userInfo: string | null = null) {
    this.questions = questions;
    this.userId = userId;
    this.userInfo = userInfo;
  }
}
