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
    { id: 1, text: 'Enter your height in cm:', type: 'number' },
    { id: 2, text: 'Enter your weight in kg:', type: 'number' },
    { id: 3, text: 'Enter your age:', type: 'number' },
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
