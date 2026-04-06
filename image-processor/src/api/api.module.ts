import { Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageJobEntity } from 'src/common/entities/job.entity';
import { ConfigService } from '@nestjs/config';
import { ImageController } from './upload/controllers/image.controller';
import { ImageService } from './upload/services/image.service';
import { AuthModule } from './user/auth/auth.module';
import { UsersModule } from './user/users/users.module';
import { UsersEntity } from './user/users/users.entity';
import { AppLogger } from 'src/common/services/logger.service';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    UsersModule,
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
    TypeOrmModule.forFeature([ImageJobEntity]),
  ],
  providers: [ImageService, AppLogger],
  exports: [ImageService],
  controllers: [ImageController],
})
export class ApiModule {}
