import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ImageController } from './image.controller';
import { ImageService } from '../services/image.service';
import { AuthGuard } from 'src/api/user/auth/auth.guard';
import { JobStatus, ResizePreset } from 'src/common/interfaces/job.interface';
import { ImageJobEntity } from 'src/common/entities/job.entity';

describe('ImageController', () => {
  let controller: ImageController;
  let imageService: jest.Mocked<ImageService>;

  const userId = 'user-123';

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
            getUserJobs: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<ImageController>(ImageController);
    imageService = module.get(ImageService);
  });

  describe('uploadImage', () => {
    it('returns job info on a valid upload', async () => {
      imageService.uploadAndQueue.mockResolvedValue({
        jobUUID: 'uuid-123',
        jobStatus: JobStatus.QUEUED,
      });

      const result = await controller.uploadImage(
        mockFile,
        { presets: [ResizePreset.MEDIUM] },
        userId,
      );

      expect(result).toEqual({ jobUUID: 'uuid-123', jobStatus: JobStatus.QUEUED });
      expect(imageService.uploadAndQueue).toHaveBeenCalledWith(
        mockFile,
        [ResizePreset.MEDIUM],
        userId,
      );
    });

    it('throws BadRequestException when no file is provided', async () => {
      await expect(
        controller.uploadImage(undefined as any, { presets: [ResizePreset.THUMBNAIL] }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when file buffer is empty', async () => {
      const emptyFile = { ...mockFile, buffer: Buffer.alloc(0), size: 0 };

      await expect(
        controller.uploadImage(emptyFile as any, { presets: [ResizePreset.THUMBNAIL] }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when presets are missing', async () => {
      await expect(
        controller.uploadImage(mockFile, {} as any, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUsersJobs', () => {
    it('returns the list of jobs for the current user', async () => {
      const mockJobs = [
        { id: 'job-1', status: JobStatus.COMPLETED },
        { id: 'job-2', status: JobStatus.PROCESSING },
      ] as ImageJobEntity[];

      imageService.getUserJobs.mockResolvedValue(mockJobs);

      const result = await controller.getUsersJobs(userId);

      expect(result).toBe(mockJobs);
      expect(imageService.getUserJobs).toHaveBeenCalledWith(userId);
    });

    it('returns empty array when user has no jobs', async () => {
      imageService.getUserJobs.mockResolvedValue([]);

      const result = await controller.getUsersJobs(userId);

      expect(result).toEqual([]);
    });
  });
});
