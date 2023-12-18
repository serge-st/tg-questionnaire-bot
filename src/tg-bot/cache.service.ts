import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { QuestionnaireData } from 'tg-bot/types';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get(userId: number): Promise<QuestionnaireData | null> {
    const previousData = await this.cacheManager.get<string>(userId.toString());
    if (!previousData) return null;
    const questionnaireData = JSON.parse(previousData) as QuestionnaireData;
    return questionnaireData;
  }

  async set(userId: number, questionnaireData: QuestionnaireData): Promise<void> {
    await this.cacheManager.set(userId.toString(), JSON.stringify(questionnaireData));
  }

  async delete(userId: number): Promise<void> {
    await this.cacheManager.del(userId.toString());
  }
}
