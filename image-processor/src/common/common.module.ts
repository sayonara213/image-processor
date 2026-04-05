import { ConfigModule } from '@nestjs/config';
import { RedisCacheService } from './services/cache.service';
import { NotificationService } from './services/notifications.service';
import { StorageService } from './services/storage.service';
import { Global, Module } from '@nestjs/common';
import { QueueService } from './services/queue.service';
import { JobService } from './services/job.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageJobEntity } from './entities/job.entity';

@Global()
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([ImageJobEntity])],
  providers: [
    RedisCacheService,
    NotificationService,
    StorageService,
    QueueService,
    JobService,
  ],
  exports: [
    RedisCacheService,
    NotificationService,
    StorageService,
    QueueService,
    JobService,
  ],
})
export class CommonModule {}
