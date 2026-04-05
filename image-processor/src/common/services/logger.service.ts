import { Injectable, Scope } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger {
  private context: string = '';

  constructor(private readonly pino: PinoLogger) {}

  setContext(context: string) {
    this.pino.setContext(context);
    this.context = context;
  }

  log(message: string, data?: Record<string, any>) {
    this.pino.info({ ...data }, message);
  }

  error(message: string, error?: Error, data?: Record<string, any>) {
    this.pino.error({ ...data, err: error, stack: error?.stack }, message);
  }

  warn(message: string, data?: Record<string, any>) {
    this.pino.warn({ ...data }, message);
  }

  debug(message: string, data?: Record<string, any>) {
    this.pino.debug({ ...data }, message);
  }
}
