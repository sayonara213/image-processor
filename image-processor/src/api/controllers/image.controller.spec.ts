import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ImageController } from './image.controller';
import { ImageService } from '../services/image.service';
import { JobStatus, ResizePreset } from 'src/common/interfaces/job.interface';

describe('ImageController', () => {
  let controller: ImageController;
  let imageService: jest.Mocked<ImageService>;

  const mockFile = {
    originalname: 'photo.jpg',
    buffer: Buffer.from('data'),
    mimetype: 'image/jpeg',
    size: 4,
  } as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageController],
      providers: [
        {
          provide: ImageService,
          useValue: {
            uploadAndQueue: jest.fn(),
            getJobStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ImageController>(ImageController);
    imageService = module.get(ImageService);
  });

  describe('uploadImage', () => {
    it('returns job info on a valid upload', async () => {
      imageService.uploadAndQueue.mockResolvedValue({
        jobUUID: 'uuid-123',
        jobStatus: JobStatus.QUEUED,
      });

      const result = await controller.uploadImage(mockFile, { presets: [ResizePreset.MEDIUM] });

      expect(result).toEqual({ jobUUID: 'uuid-123', jobStatus: JobStatus.QUEUED });
      expect(imageService.uploadAndQueue).toHaveBeenCalledWith(mockFile, [ResizePreset.MEDIUM]);
    });

    it('throws BadRequestException when no file is provided', async () => {
      await expect(
        controller.uploadImage(undefined as any, { presets: [ResizePreset.THUMBNAIL] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when file buffer is empty', async () => {
      const emptyFile = { ...mockFile, buffer: Buffer.alloc(0), size: 0 };

      await expect(
        controller.uploadImage(emptyFile as any, { presets: [ResizePreset.THUMBNAIL] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when presets are missing', async () => {
      await expect(
        controller.uploadImage(mockFile, {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getJobStatus', () => {
    it('returns the job status from the service', async () => {
      imageService.getJobStatus.mockResolvedValue(JobStatus.COMPLETED);

      const result = await controller.getJobStatus('uuid-123');

      expect(result).toBe(JobStatus.COMPLETED);
      expect(imageService.getJobStatus).toHaveBeenCalledWith('uuid-123');
    });
  });
});
