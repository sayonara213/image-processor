import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ImageJobEntity } from 'src/common/entities/job.entity';
import { JobStatus, ResizePreset } from 'src/common/interfaces/job.interface';
import { RedisCacheService } from 'src/common/services/cache.service';
import { QueueService } from 'src/common/services/queue.service';
import { StorageService } from 'src/common/services/storage.service';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ImageService {
  constructor(
    @InjectRepository(ImageJobEntity)
    private readonly repository: Repository<ImageJobEntity>,
    private readonly storageService: StorageService,
    private readonly redisService: RedisCacheService,
    private readonly queueService: QueueService,
  ) {}

  async uploadAndQueue(file: Express.Multer.File, presets: ResizePreset[]) {
    const jobUUID = randomUUID();
    const s3Key = `originals/${jobUUID}/${file.originalname}`;
    await this.storageService.upload(s3Key, file.buffer, file.mimetype);

    const job = this.repository.create({
      id: jobUUID,
      originalFilename: file.originalname,
      originalKey: s3Key,
      status: JobStatus.QUEUED,
    });

    await this.repository.save(job);

    await this.queueService.sendMessage({
      jobId: jobUUID,
      originalKey: s3Key,
      resizePreset: presets,
    });

    await this.redisService.set(jobUUID, JobStatus.QUEUED);

    return { jobUUID, jobStatus: JobStatus.QUEUED };
  }

  async getJobStatus(jobUUID: string) {
    const cachedRes = await this.redisService.get<string>(jobUUID);

    if (!cachedRes) {
      const res = await this.repository.findOneBy({ id: jobUUID });
      return res?.status;
    }

    return cachedRes;
  }
}
