import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Questionnaire } from './questionnaire';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get(userId: number): Promise<Questionnaire | null> {
    const previousData = await this.cacheManager.get<string>(userId.toString());
    if (!previousData) return null;
    const questionnaireData = JSON.parse(previousData) as Questionnaire;
    return questionnaireData;
  }

  async set(userId: number, questionnaireData: Questionnaire): Promise<void> {
    await this.cacheManager.set(userId.toString(), JSON.stringify(questionnaireData));
  }

  async delete(userId: number): Promise<void> {
    await this.cacheManager.del(userId.toString());
  }
}
