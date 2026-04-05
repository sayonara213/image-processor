import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImageService } from '../services/image.service';
import { UploadImageDto } from '../dto/upload-image.dto';

@Controller('image')
export class ImageController {
  constructor(private readonly imagesService: ImageService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype?.startsWith('image/')) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadImageDto,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!file.buffer || file.size === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    if (!dto.presets) {
      throw new BadRequestException('Presets are required');
    }

    const job = await this.imagesService.uploadAndQueue(file, dto.presets);

    return {
      ...job,
    };
  }

  @Get(':jobId')
  async getJobStatus(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.imagesService.getJobStatus(jobId);
  }
}
