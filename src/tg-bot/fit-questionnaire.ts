import { InputDataType } from './utils.service';

export type Question = {
  text: string;
  responseKey: string;
  placeholder?: string;
  type: InputDataType;
  response?: AnswerData;
  options?: Option[];
};

export type Option = {
  label: string;
  value: AnswerData;
};

export type AnswerData = number | string | boolean | 'skipped';

export class FitQuestionnaire {
  readonly questions: Question[] = [
    // * STEP 1 - GENERAL DATA
    { text: 'Do you have any health chronic diseases', type: 'boolean', responseKey: 'hasChronicDiseases' },
    {
      text: 'Please enter your email',
      responseKey: 'email',
      placeholder: 'E.g.: me@domain.com',
      type: 'email',
    },
    {
      text: 'Please enter your height in cm',
      responseKey: 'height',
      placeholder: 'E.g.: 175',
      type: 'number',
    },
    {
      text: 'Choose concept:',
      responseKey: 'concept',
      type: 'options',
      options: [
        { label: 'Concept of minimalism', value: 'minimalism' },
        { label: 'Hardcore', value: 'hardcore' },
        { label: 'Something in between', value: 'average' },
      ],
    },
    // {
    //   text: 'Please enter your weight in kg',
    //   responseKey: 'weight',
    //   placeholder: 'E.g.: 83',
    //   type: 'number',
    // },
    // {
    //   text: 'Please enter your age',
    //   responseKey: 'age',
    //   placeholder: 'E.g.: 25',
    //   type: 'number',
    // },
    // {
    //   text: 'What is your workout experience in years',
    //   responseKey: 'workoutExperience',
    //   placeholder: 'E.g.: 3',
    //   type: 'number',
    // },
    { text: 'What kind of health chronic diseases?', type: 'string', responseKey: 'chronicDiseases' },
  ];

  userId: number; // Telegram user id
  userInfo: string | null;
  currentQuestionIndex = 0;
  submittionTime: Date;

  constructor(userId: number, userInfo: string | null = null) {
    this.userId = userId;
    this.userInfo = userInfo;
  }
}
