import { InputDataType } from '../utils.service';

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

export type QuestionnaireData = {
  questions: Question[];
  userId: number; // Telegram user id
  userInfo: string | null;
  currentQuestionIndex: number;
  submittionTime: Date;
};
