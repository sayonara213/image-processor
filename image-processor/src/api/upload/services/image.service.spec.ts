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

  const userId = 'user-123';

  const mockFile = {
    originalname: 'test.jpg',
    buffer: Buffer.from('test'),
    mimetype: 'image/jpeg',
    size: 4,
  } as Express.Multer.File;

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
            findBy: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: { upload: jest.fn() },
        },
        {
          provide: RedisCacheService,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
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
    beforeEach(() => {
      repository.create.mockReturnValue({ id: 'uuid', userId, status: JobStatus.QUEUED });
      repository.save.mockResolvedValue(undefined);
      storageService.upload.mockResolvedValue(undefined);
      queueService.sendMessage.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);
    });

    it('uploads file to S3 with correct key pattern', async () => {
      await service.uploadAndQueue(mockFile, [ResizePreset.THUMBNAIL], userId);

      expect(storageService.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^originals\/.+\/test\.jpg$/),
        mockFile.buffer,
        mockFile.mimetype,
      );
    });

    it('saves job to database with userId and QUEUED status', async () => {
      await service.uploadAndQueue(mockFile, [ResizePreset.THUMBNAIL], userId);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          originalFilename: 'test.jpg',
          status: JobStatus.QUEUED,
        }),
      );
      expect(repository.save).toHaveBeenCalled();
    });

    it('sends message to queue with file presets', async () => {
      await service.uploadAndQueue(mockFile, [ResizePreset.MEDIUM], userId);

      expect(queueService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ presets: [ResizePreset.MEDIUM] }),
      );
    });

    it('invalidates user jobs cache after queuing', async () => {
      await service.uploadAndQueue(mockFile, [ResizePreset.THUMBNAIL], userId);

      expect(redisService.del).toHaveBeenCalledWith(`jobs:user:${userId}`);
    });

    it('returns jobUUID and QUEUED status', async () => {
      const result = await service.uploadAndQueue(mockFile, [ResizePreset.THUMBNAIL], userId);

      expect(result.jobStatus).toBe(JobStatus.QUEUED);
      expect(typeof result.jobUUID).toBe('string');
      expect(result.jobUUID.length).toBeGreaterThan(0);
    });
  });

  describe('getUserJobs', () => {
    const mockJobs = [
      { id: 'job-1', status: JobStatus.COMPLETED },
      { id: 'job-2', status: JobStatus.PROCESSING },
    ] as ImageJobEntity[];

    it('returns cached jobs without hitting the database', async () => {
      redisService.get.mockResolvedValue(mockJobs);

      const result = await service.getUserJobs(userId);

      expect(result).toBe(mockJobs);
      expect(repository.findBy).not.toHaveBeenCalled();
    });

    it('falls back to database on cache miss and caches the result', async () => {
      redisService.get.mockResolvedValue(null);
      repository.findBy.mockResolvedValue(mockJobs);

      const result = await service.getUserJobs(userId);

      expect(result).toBe(mockJobs);
      expect(repository.findBy).toHaveBeenCalledWith({ userId });
      expect(redisService.set).toHaveBeenCalledWith(
        `jobs:user:${userId}`,
        mockJobs,
        60,
      );
    });

    it('returns empty array when user has no jobs', async () => {
      redisService.get.mockResolvedValue(null);
      repository.findBy.mockResolvedValue([]);

      const result = await service.getUserJobs(userId);

      expect(result).toEqual([]);
    });
  });
});
