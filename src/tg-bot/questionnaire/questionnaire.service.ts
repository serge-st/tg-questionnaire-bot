import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegrafContextWithUser } from 'tg-bot/common/types';
import { InputDataType } from 'tg-bot/validation';
import { Questionnaire, AnswerData, Question } from './questionnaire.model';

export type QuestionnaireCompletionReport = [string, string, string];

@Injectable()
export class QuestionnaireService {
  constructor(private readonly configService: ConfigService) {}

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
    const questions = this.configService.get('tg-bot.questions') as Question[];
    const { id: userId, userInfo } = ctx.user;
    const questionnaireData = new Questionnaire(questions, userId, userInfo);
    return questionnaireData;
  }

  shouldSkip(questionnaire: Questionnaire): boolean {
    const question = questionnaire.questions[questionnaire.currentQuestionIndex];
    const { skipIf } = question;
    if (!skipIf) return false;
    const [entries] = Object.entries(skipIf);
    const [key, value] = entries;
    const { questions } = questionnaire;
    const result = questions.find((q) => q.responseKey === key && q.response === String(value));
    if (!result) return false;
    return true;
  }

  async getQuestionnareCompletionReport(questionnaire: Questionnaire): Promise<QuestionnaireCompletionReport> {
    const { userInfo } = questionnaire;

    const date = new Date();
    const adminSurveyCompleteText = this.configService.get('tg-bot.messages.adminSurveycomplete');

    const responseHeader = `${date}\n${adminSurveyCompleteText}\n${userInfo}\n\n`;
    const responseBody = questionnaire.questions
      .filter((q) => q.type !== 'picture' && q.response !== 'skipped')
      .map((q) => `*${q.responseKey}:*\n${q.response}`)
      .join('\n\n');

    // currently can handle only 1 picture per questionnaire
    const { response: responsePictureId } = questionnaire.questions.find(
      (q) => q.type === 'picture' && q.response !== 'skipped',
    );

    if (typeof responsePictureId !== 'string') throw new Error('Error processing picture response');
    return [responseHeader, responseBody, responsePictureId];
  }
}
