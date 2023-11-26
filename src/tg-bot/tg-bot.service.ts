import { Injectable } from '@nestjs/common';

@Injectable()
export class TgBotService {
  getHello() {
    console.log('hello');
  }
}
