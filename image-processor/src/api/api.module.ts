import { Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageJobEntity } from 'src/common/entities/job.entity';
import { ImageController } from './controllers/image.controller';
import { ImageService } from './services/image.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    CommonModule,
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
  providers: [ImageService],
  exports: [ImageService],
  controllers: [ImageController],
})
export class ApiModule {}
