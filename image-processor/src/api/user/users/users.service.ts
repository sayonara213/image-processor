import { Injectable } from '@nestjs/common';
import { UsersEntity } from './users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersEntity)
    private readonly repository: Repository<UsersEntity>,
  ) {}

  async findOne(email: string): Promise<UsersEntity | null> {
    return await this.repository.findOneBy({ email: email });
  }

  async create(email: string, hash: string) {
    const user = this.repository.create({ email: email, password: hash });
    await this.repository.insert(user);
  }
}
