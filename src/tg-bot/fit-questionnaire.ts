type Question = {
  id: number;
  text: string;
  type: number | string | boolean;
};

type QResponse = {
  id: number;
  data: string | number;
};

export class FitQuestionnaire {
  readonly questions: Question[] = [
    // * STEP 1 - GENERAL DATA
    { id: 1, text: 'Enter your height in cm:', type: 'number' },
    { id: 2, text: 'Enter your weight in kg:', type: 'number' },
    { id: 3, text: 'Enter your age:', type: 'number' },
    { id: 4, text: 'Workout experience in years:', type: 'number' },
    { id: 5, text: 'Health chronic diseases:', type: 'text' },

    // * STEP 2 - PREVIOUS CYCLE
    { id: 6, text: 'Duration:', type: 'text' },
    { id: 7, text: 'Drugs and doses:', type: 'text' },
    { id: 8, text: 'Discribe your results from the last cycle:', type: 'text' },

    // * STEP 3 - PREVIOUS EXPERIENCE
    { id: 9, text: 'This is my first cycle:', type: 'bool' }, // IF YES SKIP 4 AND 5

    // * STEP 4 - PREVIOUS CYCLES
    { id: 10, text: 'How many cycles did you have', type: 'number' },

    // * STEP 5 - YOUR FUTURE CYCLE
    { id: 11, text: 'Choose your goal', type: 'options' },

    // * STEP 6 - VISUAL ASSESMENT
    {
      id: 12,
      text: 'Please send me a picture of your current shape',
      type: 'picture',
    },
  ];

  userId: number;
  responses: QResponse[] = [];
  currentQuestion = 0;
  submittionTime: Date;

  addResponse(id: number, response: string | number): void {
    this.responses.push({ id, data: response });
  }

  getQuestion(): Question {
    return this.questions[this.currentQuestion];
  }

  isComplete() {
    return this.currentQuestion >= this.questions.length;
  }

  finishQuestionnaire(): QResponse[] {
    this.submittionTime = new Date();
    return this.responses;
  }

  constructor(userId: number) {
    this.userId = userId;
  }
}
