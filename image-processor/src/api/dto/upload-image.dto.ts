import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { ResizePreset } from 'src/common/interfaces/job.interface';

export class UploadImageDto {
  @IsOptional()
  @IsArray()
  @IsEnum(ResizePreset, { each: true })
  presets?: ResizePreset[];
}
