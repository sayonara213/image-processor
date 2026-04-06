import { IsEmail } from 'class-validator';
import { ImageJobEntity } from 'src/common/entities/job.entity';
import { Entity, Column, OneToMany } from 'typeorm';
import { PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class UsersEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column({ nullable: true })
  username: string;

  @Column()
  password: string;

  @OneToMany(() => ImageJobEntity, (job) => job.user)
  jobs: ImageJobEntity[];
}
