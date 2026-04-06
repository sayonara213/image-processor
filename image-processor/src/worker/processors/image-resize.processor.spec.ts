import { Test, TestingModule } from '@nestjs/testing';
import { ImageResizeProcessor } from './image-resize.processor';
import { QueueService } from 'src/common/services/queue.service';
import { StorageService } from 'src/common/services/storage.service';
import { NotificationService } from 'src/common/services/notifications.service';
import { JobService } from 'src/common/services/job.service';
import { AppLogger } from 'src/common/services/logger.service';
import { JobStatus, ResizePreset } from 'src/common/interfaces/job.interface';

const mockSharpInstance = {
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
};

jest.mock('sharp', () => ({
  __esModule: true,
  default: jest.fn(() => mockSharpInstance),
}));

describe('ImageResizeProcessor', () => {
  let processor: ImageResizeProcessor;
  let storageService: jest.Mocked<StorageService>;
  let notificationService: jest.Mocked<NotificationService>;
  let jobService: jest.Mocked<JobService>;

  const mockJob = {
    id: 'job-uuid',
    userId: 'user-123',
    originalKey: 'originals/job-uuid/photo.jpg',
    presets: [ResizePreset.THUMBNAIL],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageResizeProcessor,
        {
          provide: QueueService,
          useValue: { receiveMessage: jest.fn(), deleteMessage: jest.fn() },
        },
        {
          provide: StorageService,
          useValue: { download: jest.fn(), uploadBatch: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: { notifyJobComplete: jest.fn(), notifyJobFailed: jest.fn() },
        },
        {
          provide: JobService,
          useValue: { updateJobStatus: jest.fn() },
        },
        {
          provide: AppLogger,
          useValue: { setContext: jest.fn(), log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
      ],
    }).compile();

    processor = module.get<ImageResizeProcessor>(ImageResizeProcessor);
    storageService = module.get(StorageService);
    notificationService = module.get(NotificationService);
    jobService = module.get(JobService);

    storageService.download.mockResolvedValue(Buffer.from('image-data'));
    storageService.uploadBatch.mockResolvedValue(undefined);
    jobService.updateJobStatus.mockResolvedValue(undefined);
    notificationService.notifyJobComplete.mockResolvedValue(undefined);
    notificationService.notifyJobFailed.mockResolvedValue(undefined);

    mockSharpInstance.toBuffer.mockResolvedValue({
      data: Buffer.from('resized'),
      info: { width: 100, height: 100, size: 512 },
    });
  });

  describe('processJob', () => {
    it('marks job as PROCESSING then COMPLETED on success', async () => {
      await processor.processJob(mockJob);

      const calls = jobService.updateJobStatus.mock.calls;
      expect(calls[0]).toEqual([mockJob.id, mockJob.userId, JobStatus.PROCESSING]);
      expect(calls[1][0]).toBe(mockJob.id);
      expect(calls[1][1]).toBe(mockJob.userId);
      expect(calls[1][2]).toBe(JobStatus.COMPLETED);
    });

    it('uploads resized image to correct S3 key', async () => {
      await processor.processJob(mockJob);

      expect(storageService.uploadBatch).toHaveBeenCalledWith([
        expect.objectContaining({
          key: `resized/${mockJob.id}/${ResizePreset.THUMBNAIL}.jpg`,
          contentType: 'image/jpeg',
        }),
      ]);
    });

    it('sends completion notification with results', async () => {
      await processor.processJob(mockJob);

      expect(notificationService.notifyJobComplete).toHaveBeenCalledWith(
        mockJob.id,
        expect.arrayContaining([
          expect.objectContaining({
            resizePreset: ResizePreset.THUMBNAIL,
            resizeKey: `resized/${mockJob.id}/${ResizePreset.THUMBNAIL}.jpg`,
          }),
        ]),
      );
    });

    it('marks job as FAILED and notifies on processing error', async () => {
      storageService.download.mockRejectedValue(new Error('S3 download failed'));

      await processor.processJob(mockJob);

      expect(jobService.updateJobStatus).toHaveBeenCalledWith(mockJob.id, mockJob.userId, JobStatus.FAILED);
      expect(notificationService.notifyJobFailed).toHaveBeenCalledWith(
        mockJob.id,
        expect.any(Error),
      );
      expect(notificationService.notifyJobComplete).not.toHaveBeenCalled();
    });

    it('handles single preset passed as non-array', async () => {
      const singlePresetJob = {
        ...mockJob,
        presets: ResizePreset.MEDIUM as unknown as ResizePreset[],
      };

      await processor.processJob(singlePresetJob);

      expect(storageService.uploadBatch).toHaveBeenCalled();
      expect(jobService.updateJobStatus).toHaveBeenCalledWith(
        mockJob.id,
        mockJob.userId,
        JobStatus.COMPLETED,
        expect.anything(),
      );
    });

    it('processes multiple presets in one job', async () => {
      const multiPresetJob = {
        ...mockJob,
        presets: [ResizePreset.THUMBNAIL, ResizePreset.MEDIUM, ResizePreset.LARGE],
      };

      await processor.processJob(multiPresetJob);

      const uploadCall = storageService.uploadBatch.mock.calls[0][0];
      expect(uploadCall).toHaveLength(3);
    });
  });
});
