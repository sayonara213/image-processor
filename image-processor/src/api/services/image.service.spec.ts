import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ImageService } from './image.service';
import { ImageJobEntity } from 'src/common/entities/job.entity';
import { JobStatus, ResizePreset } from 'src/common/interfaces/job.interface';
import { RedisCacheService } from 'src/common/services/cache.service';
import { QueueService } from 'src/common/services/queue.service';
import { StorageService } from 'src/common/services/storage.service';

describe('ImageService', () => {
  let service: ImageService;
  let repository: jest.Mocked<any>;
  let storageService: jest.Mocked<StorageService>;
  let redisService: jest.Mocked<RedisCacheService>;
  let queueService: jest.Mocked<QueueService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageService,
        {
          provide: getRepositoryToken(ImageJobEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOneBy: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: { upload: jest.fn() },
        },
        {
          provide: RedisCacheService,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
        {
          provide: QueueService,
          useValue: { sendMessage: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ImageService>(ImageService);
    repository = module.get(getRepositoryToken(ImageJobEntity));
    storageService = module.get(StorageService);
    redisService = module.get(RedisCacheService);
    queueService = module.get(QueueService);
  });

  describe('uploadAndQueue', () => {
    const mockFile = {
      originalname: 'test.jpg',
      buffer: Buffer.from('test'),
      mimetype: 'image/jpeg',
      size: 4,
    } as Express.Multer.File;

    beforeEach(() => {
      repository.create.mockReturnValue({ id: 'uuid', status: JobStatus.QUEUED });
      repository.save.mockResolvedValue(undefined);
      storageService.upload.mockResolvedValue(undefined);
      queueService.sendMessage.mockResolvedValue(undefined);
      redisService.set.mockResolvedValue(undefined);
    });

    it('uploads file to S3 with correct key pattern', async () => {
      await service.uploadAndQueue(mockFile, [ResizePreset.THUMBNAIL]);

      expect(storageService.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^originals\/.+\/test\.jpg$/),
        mockFile.buffer,
        mockFile.mimetype,
      );
    });

    it('saves job to database with QUEUED status', async () => {
      await service.uploadAndQueue(mockFile, [ResizePreset.THUMBNAIL]);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          originalFilename: 'test.jpg',
          status: JobStatus.QUEUED,
        }),
      );
      expect(repository.save).toHaveBeenCalled();
    });

    it('sends message to queue with correct payload', async () => {
      const result = await service.uploadAndQueue(mockFile, [ResizePreset.MEDIUM]);

      expect(queueService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: result.jobUUID,
          resizePreset: [ResizePreset.MEDIUM],
        }),
      );
    });

    it('caches job status in Redis', async () => {
      const result = await service.uploadAndQueue(mockFile, [ResizePreset.THUMBNAIL]);

      expect(redisService.set).toHaveBeenCalledWith(result.jobUUID, JobStatus.QUEUED);
    });

    it('returns jobUUID and QUEUED status', async () => {
      const result = await service.uploadAndQueue(mockFile, [ResizePreset.THUMBNAIL]);

      expect(result.jobStatus).toBe(JobStatus.QUEUED);
      expect(typeof result.jobUUID).toBe('string');
      expect(result.jobUUID.length).toBeGreaterThan(0);
    });
  });

  describe('getJobStatus', () => {
    it('returns cached status without hitting the database', async () => {
      redisService.get.mockResolvedValue(JobStatus.PROCESSING);

      const result = await service.getJobStatus('some-uuid');

      expect(result).toBe(JobStatus.PROCESSING);
      expect(repository.findOneBy).not.toHaveBeenCalled();
    });

    it('falls back to database on cache miss', async () => {
      redisService.get.mockResolvedValue(null);
      repository.findOneBy.mockResolvedValue({ status: JobStatus.COMPLETED });

      const result = await service.getJobStatus('some-uuid');

      expect(result).toBe(JobStatus.COMPLETED);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'some-uuid' });
    });

    it('returns undefined when job not found in cache or db', async () => {
      redisService.get.mockResolvedValue(null);
      repository.findOneBy.mockResolvedValue(null);

      const result = await service.getJobStatus('missing-uuid');

      expect(result).toBeUndefined();
    });
  });
});
