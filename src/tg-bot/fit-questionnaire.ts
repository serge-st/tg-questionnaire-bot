import { InputDataType } from './utils.service';

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
  skipIf?: Record<string, boolean>;
};

export type Option = {
  label: string;
  value: AnswerData;
};

export type AnswerData = number | string | boolean | 'skipped';

export class FitQuestionnaire {
  readonly questions: Question[] = [
    // * STEP 1 - GENERAL DATA
    {
      text: 'Please enter your email',
      responseKey: 'Email',
      placeholder: 'E.g.: me@domain.com',
      type: 'email',
    },
    {
      text: 'Please enter your height in cm',
      responseKey: 'Height',
      placeholder: 'E.g.: 175',
      type: 'number',
    },
    {
      text: 'Please enter your weight in kg',
      responseKey: 'Weight',
      placeholder: 'E.g.: 83',
      type: 'number',
    },
    {
      text: 'Please enter your age',
      responseKey: 'Age',
      placeholder: 'E.g.: 25',
      type: 'number',
    },
    {
      text: 'What is your workout experience in years',
      responseKey: 'Workout Experience',
      placeholder: 'E.g.: 3',
      type: 'number',
    },
    { text: 'Do you have any health chronic diseases?', type: 'boolean', responseKey: 'Has Chronic Diseases' },
    {
      skipIf: { 'Has Chronic Diseases': false },
      text: 'What kind of health chronic diseases?',
      type: 'string',
      responseKey: 'Chronic Diseases',
    },
    // * STEP 2 - PREVIOUS EXPERIENCE
    { text: 'Is this your first cycle?', type: 'boolean', responseKey: 'Is First Cycle' },
    {
      skipIf: { 'Is First Cycle': false },
      text: 'Choose concept:',
      responseKey: 'Concept',
      type: 'options',
      options: [
        { label: 'Concept of minimalism', value: 'minimalism' },
        { label: 'Hardcore', value: 'hardcore' },
        { label: 'Something in between', value: 'average' },
      ],
      preMessage: {
        text: 'Please read the article where you can learn about 3 possible concepts of building a plan for the first cycle:',
        link: {
          placeholder: 'Link to the article',
          url: 'https://telegra.ph/THREE-CONCEPTS-ON-WHAT-THE-FIRST-CYCLE-OF-STEROIDS-SHOULD-BE-11-28',
        },
      },
    },
    {
      skipIf: { 'Is First Cycle': true },
      text: 'How long was your previous cycle?',
      type: 'string',
      responseKey: 'Previous Cycle Duration',
    },
    {
      skipIf: { 'Is First Cycle': true },
      text: 'What drugs and in what doses did you use?',
      type: 'string',
      responseKey: 'Previous Cycle Drugs',
    },
    {
      skipIf: { 'Is First Cycle': true },
      text: 'Describe your results from the previous cycle',
      type: 'string',
      responseKey: 'Previous Cycle Results',
    },
    {
      skipIf: { 'Is First Cycle': true },
      text: 'Choose your goal:',
      type: 'options',
      responseKey: 'Goal',
      options: [
        { label: 'Bulk', value: 'bulk' },
        { label: 'Clean Bulk', value: 'clean bulk' },
        { label: 'Weight Cutting', value: 'cut' },
        { label: 'Endurance', value: 'endurance' },
        { label: 'Recovery after an injury', value: 'recovery' },
      ],
    },
    // * STEP 3 - VISUAL ASSESSMENT
    {
      text: 'Please, send a picture of your current shape',
      responseKey: 'Current Shape',
      type: 'picture',
    },
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
