import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ApiModule } from './api/api.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        transport: {
          targets: [
            {
              target: 'pino-pretty',
              options: { colorize: true },
              level: 'debug',
            },
            {
              target: 'pino-loki',
              options: {
                host: process.env.LOKI_HOST || 'http://localhost:3100',
                labels: { app: 'image-processor', service: 'api' }, // use 'worker' for the worker module
              },
              level: 'info',
            },
          ],
        },
      },
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    ApiModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
