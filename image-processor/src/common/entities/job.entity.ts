import {
  Entity,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ImageJobResult, JobStatus } from '../interfaces/job.interface';
import { UsersEntity } from 'src/api/user/users/users.entity';

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

  @Column()
  userId: string;

  @ManyToOne(() => UsersEntity, (user) => user.jobs)
  @JoinColumn({ name: 'userId' })
  user: UsersEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
