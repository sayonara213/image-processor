import { Injectable } from '@nestjs/common';
import { JobStatus } from '../interfaces/job.interface';
import { RedisCacheService } from './cache.service';
import { Repository } from 'typeorm';
import { ImageJobEntity } from '../entities/job.entity';
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
    status: JobStatus,
    extra?: Partial<ImageJobEntity>,
  ) {
    await this.jobRepository.update(jobId, { status, ...extra });
    await this.cacheService.set(jobId, status);
  }
}
