import { Injectable } from '@nestjs/common';
import { TelegrafContextWithUser } from './types';
import { Questionnaire, AnswerData, Question } from './questionnaire';
import { InputDataType } from './validation.service';
import questionsRaw from '../../questions.json';

@Injectable()
export class QuestionnaireService {
  getQuestionData(questionnaire: Questionnaire): [InputDataType, string, string | undefined] {
    const question = questionnaire.questions[questionnaire.currentQuestionIndex];
    const { text, placeholder, type } = question;
    return [type, text, placeholder];
  }

  addResponse(response: AnswerData, questionnaire: Questionnaire): void {
    questionnaire.questions[questionnaire.currentQuestionIndex].response = response;
    questionnaire.currentQuestionIndex += 1;
  }

  isQuestionnaireComplete(questionnaire: Questionnaire): boolean {
    return questionnaire.currentQuestionIndex === questionnaire.questions.length;
  }

  startNewSession(ctx: TelegrafContextWithUser): Questionnaire {
    const questions = questionsRaw as Question[];
    const { id: userId, userInfo } = ctx.user;
    const questionnaireData = new Questionnaire(questions, userId, userInfo);
    return questionnaireData;
  }
}
