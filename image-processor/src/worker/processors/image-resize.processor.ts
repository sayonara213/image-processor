import { Injectable, OnModuleInit } from '@nestjs/common';
import { StorageService } from 'src/common/services/storage.service';
import { NotificationService } from 'src/common/services/notifications.service';
import { QueueService } from 'src/common/services/queue.service';
import {
  ImageJobPayload,
  ImageJobResult,
  JobStatus,
  ResizeMap,
} from 'src/common/interfaces/job.interface';
import { JobService } from 'src/common/services/job.service';
import sharp from 'sharp';
import { AppLogger } from 'src/common/services/logger.service';

@Injectable()
export class ImageResizeProcessor implements OnModuleInit {
  constructor(
    private readonly queueService: QueueService,
    private readonly storageService: StorageService,
    private readonly notificationService: NotificationService,
    private readonly jobService: JobService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ImageResizeProcessor.name);
  }

  async poll() {
    while (true) {
      try {
        const message = await this.queueService.receiveMessage();
        if (message?.Body) {
          const job = JSON.parse(message.Body) as ImageJobPayload;
          await this.processJob(job);
          await this.queueService.deleteMessage(message);
        }
      } catch (error) {
        console.log(error);
      }
    }
  }
  async processJob(job: ImageJobPayload) {
    this.logger.log('Processing job', {
      jobId: job.id,
      presets: job.presets,
    });

    await this.jobService.updateJobStatus(job.id, job.userId, JobStatus.PROCESSING);
    try {
      const originalImage = await this.storageService.download(job.originalKey);
      const presets = Array.isArray(job.presets) ? job.presets : [job.presets];
      const processedImages = await Promise.all(
        presets.map(async (preset) => {
          const { data, info } = await sharp(originalImage)
            .resize(ResizeMap[preset].width, ResizeMap[preset].height, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 85 })
            .toBuffer({ resolveWithObject: true });

          const key = `resized/${job.id}/${preset}.jpg`;

          return {
            upload: { key, body: data, contentType: 'image/jpeg' },
            result: {
              resizeKey: key,
              resizePreset: preset,
              resizeDimensions: { width: info.width, height: info.height },
              fileSize: info.size,
            } as ImageJobResult,
          };
        }),
      );

      await this.storageService.uploadBatch(
        processedImages.map((p) => p.upload),
      );

      const results = processedImages.map((p) => p.result);
      await this.jobService.updateJobStatus(job.id, job.userId, JobStatus.COMPLETED, { results });
      await this.notificationService.notifyJobComplete(job.id, results);
    } catch (error) {
      await this.jobService.updateJobStatus(job.id, job.userId, JobStatus.FAILED);
      await this.notificationService.notifyJobFailed(job.id, error);
      this.logger.error('Job failed', error as Error, { jobId: job.id });
    }
  }

  onModuleInit() {
    this.poll();
  }
}
