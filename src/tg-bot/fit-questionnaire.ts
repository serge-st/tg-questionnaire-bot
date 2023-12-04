import { InputDataType } from './input-utils.service';

type Question = {
  id: number;
  text: string;
  placeholder?: string;
  type: InputDataType;
};

type AnswerData = number | string | boolean | 'skipped';

type Answer = {
  questionId: Question['id'];
  data: AnswerData;
};

export class FitQuestionnaire {
  readonly questions: Question[] = [
    // * STEP 1 - GENERAL DATA
    {
      id: 1,
      text: 'Please enter your email',
      placeholder: 'E.g.: me@domain.com',
      type: 'email',
    },
    {
      id: 2,
      text: 'Please enter your height in cm',
      placeholder: 'E.g.: 175',
      type: 'number',
    },
    {
      id: 3,
      text: 'Please enter your weight in kg',
      placeholder: 'E.g.: 83',
      type: 'number',
    },
    {
      id: 4,
      text: 'Please enter your age',
      placeholder: 'E.g.: 25',
      type: 'number',
    },
    {
      id: 5,
      text: 'What is your workout experience in years',
      placeholder: 'E.g.: 3',
      type: 'number',
    },
    { id: 6, text: 'Do you have any health chronic diseases', type: 'boolean' },
    { id: 7, text: 'What kind of health chronic diseases?', type: 'string' },
  ];

  userId: number; // Telegram user id
  responses: Answer[] = [];
  currentQuestionIndex = 0;
  submittionTime: Date;

  addResponse(questionId: number, response: AnswerData): void {
    this.responses.push({ questionId, data: response });
  }

  getQuestionData(): [string, string | undefined] {
    const question = this.questions[this.currentQuestionIndex];
    const { text, placeholder } = question;
    return [text, placeholder];
  }

  isComplete() {
    return this.currentQuestionIndex === this.questions.length;
  }

  finishQuestionnaire(): Answer[] {
    this.submittionTime = new Date();
    return this.responses;
  }

  constructor(userId: number) {
    this.userId = userId;
  }
}
