import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from 'src/common/common.module';
import { ImageJobEntity } from 'src/common/entities/job.entity';
import { ImageResizeProcessor } from './processors/image-resize.processor';

@Module({
  imports: [
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
        entities: [ImageJobEntity],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([ImageJobEntity]),
  ],
  providers: [ImageResizeProcessor],
})
export class WorkerModule {}
