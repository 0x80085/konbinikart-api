import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  @Cron('45 * * * * *') // Runs every 45 seconds
  handleCron() {
    console.log('Cron job executed');
  }
}
