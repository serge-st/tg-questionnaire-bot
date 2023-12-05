import { InputDataType } from './input-utils.service';

export type Question = {
  text: string;
  placeholder?: string;
  type: InputDataType;
  response?: AnswerData;
};

export type AnswerData = number | string | boolean | 'skipped';

// type Answer = {
//   questionId: Question['id'];
//   data: AnswerData;
// };

export class FitQuestionnaire {
  readonly questions: Question[] = [
    // * STEP 1 - GENERAL DATA
    {
      text: 'Please enter your email',
      placeholder: 'E.g.: me@domain.com',
      type: 'email',
    },
    {
      text: 'Please enter your height in cm',
      placeholder: 'E.g.: 175',
      type: 'number',
    },
    {
      text: 'Please enter your weight in kg',
      placeholder: 'E.g.: 83',
      type: 'number',
    },
    {
      text: 'Please enter your age',
      placeholder: 'E.g.: 25',
      type: 'number',
    },
    {
      text: 'What is your workout experience in years',
      placeholder: 'E.g.: 3',
      type: 'number',
    },
    // { text: 'Do you have any health chronic diseases', type: 'boolean' },
    { text: 'What kind of health chronic diseases?', type: 'string' },
  ];

  userId: number; // Telegram user id
  currentQuestionIndex = 0;
  submittionTime: Date;

  // addResponse(response: AnswerData): void {
  //   // TODO: probably parse data
  //   this.questions[this.currentQuestionIndex].response = response;
  //   this.currentQuestionIndex += 1;
  // }

  // getQuestionData(): [InputDataType, string, string | undefined] {
  //   const question = this.questions[this.currentQuestionIndex];
  //   const { text, placeholder, type } = question;
  //   return [type, text, placeholder];
  // }

  // TODO: Move the rest of the methods out of this class
  isComplete() {
    return this.currentQuestionIndex === this.questions.length;
  }

  finishQuestionnaire() {
    this.submittionTime = new Date();
    // TODO: create a final report
  }

  constructor(userId: number) {
    this.userId = userId;
  }
}
