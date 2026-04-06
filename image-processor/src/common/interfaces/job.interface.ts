import { ImageJobEntity } from '../entities/job.entity';

export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ResizePreset {
  THUMBNAIL = 'thumbnail',
  MEDIUM = 'medium',
  LARGE = 'large',
}

interface Dimensions {
  width: number;
  height: number;
}

export const ResizeMap: Record<ResizePreset, Dimensions> = {
  [ResizePreset.THUMBNAIL]: { width: 150, height: 150 },
  [ResizePreset.MEDIUM]: { width: 800, height: 600 },
  [ResizePreset.LARGE]: { width: 1920, height: 1080 },
};

export interface ImageJobPayload extends ImageJobEntity {
  presets: ResizePreset[];
}

export interface ImageJobResult {
  resizeKey: string;
  resizePreset: ResizePreset;
  resizeDimensions: Dimensions;
  fileSize: number;
}
