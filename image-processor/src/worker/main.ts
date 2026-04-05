import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.useLogger(app.get(Logger));

  console.log('Worker started — polling SQS');
}

bootstrap();
