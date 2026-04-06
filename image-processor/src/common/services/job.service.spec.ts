import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JobService } from './job.service';
import { RedisCacheService } from './cache.service';
import { ImageJobEntity } from '../entities/job.entity';
import { JobStatus } from '../interfaces/job.interface';

describe('JobService', () => {
  let service: JobService;
  let repository: jest.Mocked<any>;
  let cacheService: jest.Mocked<RedisCacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: getRepositoryToken(ImageJobEntity),
          useValue: { update: jest.fn() },
        },
        {
          provide: RedisCacheService,
          useValue: { del: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
    repository = module.get(getRepositoryToken(ImageJobEntity));
    cacheService = module.get(RedisCacheService);
  });

  describe('updateJobStatus', () => {
    it('updates database record with new status', async () => {
      await service.updateJobStatus('job-1', 'user-1', JobStatus.COMPLETED);

      expect(repository.update).toHaveBeenCalledWith('job-1', {
        status: JobStatus.COMPLETED,
      });
    });

    it('invalidates user jobs cache', async () => {
      await service.updateJobStatus('job-1', 'user-1', JobStatus.PROCESSING);

      expect(cacheService.del).toHaveBeenCalledWith('jobs:user:user-1');
    });

    it('merges extra fields into the database update', async () => {
      const results = [
        {
          resizeKey: 'resized/job-1/thumbnail.jpg',
          resizePreset: 'thumbnail',
          resizeDimensions: { width: 150, height: 150 },
          fileSize: 1024,
        },
      ];

      await service.updateJobStatus('job-1', 'user-1', JobStatus.COMPLETED, {
        results,
      } as any);

      expect(repository.update).toHaveBeenCalledWith('job-1', {
        status: JobStatus.COMPLETED,
        results,
      });
    });
  });
});
