import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilsService {
  getCurrentUTCDateTime(): string {
    const now = new Date();
    return (
      now.getUTCDate().toString().padStart(2, '0') +
      '-' +
      (now.getUTCMonth() + 1).toString().padStart(2, '0') +
      '-' +
      now.getUTCFullYear() +
      '_' +
      now.getUTCHours().toString().padStart(2, '0') +
      ':' +
      now.getUTCMinutes().toString().padStart(2, '0') +
      ':' +
      now.getUTCSeconds().toString().padStart(2, '0') +
      'UTC'
    );
  }
}
