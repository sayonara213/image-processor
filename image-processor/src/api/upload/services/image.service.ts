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

  async uploadAndQueue(
    file: Express.Multer.File,
    presets: ResizePreset[],
    userId: string,
  ) {
    const jobUUID = randomUUID();
    const s3Key = `originals/${jobUUID}/${file.originalname}`;
    await this.storageService.upload(s3Key, file.buffer, file.mimetype);

    const job = this.repository.create({
      id: jobUUID,
      userId,
      originalFilename: file.originalname,
      originalKey: s3Key,
      status: JobStatus.QUEUED,
    });

    await this.repository.save(job);

    await this.queueService.sendMessage({
      ...job,
      presets: presets,
    });

    await this.redisService.del(`jobs:user:${userId}`);

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

  async getUserJobs(userId: string): Promise<ImageJobEntity[]> {
    const cacheKey = `jobs:user:${userId}`;
    const cachedRes = await this.redisService.get<ImageJobEntity[]>(cacheKey);

    if (cachedRes) return cachedRes;

    const jobs = await this.repository.findBy({ userId });

    await this.redisService.set(cacheKey, jobs, 60);

    return jobs;
  }
}
