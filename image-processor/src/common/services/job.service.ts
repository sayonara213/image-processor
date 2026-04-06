import { Injectable } from '@nestjs/common';
import { RedisCacheService } from './cache.service';
import { Repository } from 'typeorm';
import { ImageJobEntity } from '../entities/job.entity';
import { JobStatus } from '../interfaces/job.interface';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(ImageJobEntity)
    private readonly jobRepository: Repository<ImageJobEntity>,
    private readonly cacheService: RedisCacheService,
  ) {}

  async updateJobStatus(
    jobId: string,
    userId: string,
    status: JobStatus,
    extraFields?: Partial<ImageJobEntity>,
  ) {
    await this.jobRepository.update(jobId, { status, ...extraFields });
    await this.cacheService.del(`jobs:user:${userId}`);
  }
}
