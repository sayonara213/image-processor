import {
  Entity,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  PrimaryColumn,
} from 'typeorm';
import { ImageJobResult, JobStatus } from '../interfaces/job.interface';

@Entity('image_jobs')
export class ImageJobEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  originalFilename: string;

  @Column()
  originalKey: string;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.QUEUED })
  status: JobStatus;

  @Column({ type: 'jsonb', nullable: true })
  results: ImageJobResult[] | null;

  @Column({ nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
