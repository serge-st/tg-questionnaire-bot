import { InputDataType } from './input-utils.service';

type Question = {
  id: number;
  text: string;
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
    { id: 1, text: 'Please enter your email', type: 'email' },
    { id: 2, text: 'Please enter your height in cm', type: 'number' },
    { id: 3, text: 'Please enter your weight in kg', type: 'number' },
    { id: 4, text: 'Please enter your age', type: 'number' },
    {
      id: 5,
      text: 'What is your workout experience in years',
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

  getQuestion(): Question {
    return this.questions[this.currentQuestionIndex];
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
