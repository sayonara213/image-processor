import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from 'src/common/common.module';
import { ImageJobEntity } from 'src/common/entities/job.entity';
import { ImageResizeProcessor } from './processors/image-resize.processor';
import { LoggerModule } from 'nestjs-pino';
import { AppLogger } from 'src/common/services/logger.service';
import { UsersEntity } from 'src/api/user/users/users.entity';

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
                labels: { app: 'image-processor', service: 'worker' }, // use 'worker' for the worker module
              },
              level: 'info',
            },
          ],
        },
      },
    }),
    CommonModule,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow('DB_HOST'),
        port: Number(config.getOrThrow('DB_PORT')),
        username: config.getOrThrow('DB_USERNAME'),
        password: config.getOrThrow('DB_PASSWORD'),
        database: config.getOrThrow('DB_DATABASE'),
        entities: [ImageJobEntity, UsersEntity],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([ImageJobEntity, UsersEntity]),
  ],
  providers: [ImageResizeProcessor, AppLogger],
})
export class WorkerModule {}
