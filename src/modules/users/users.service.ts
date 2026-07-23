import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { IsOptional, IsEnum } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(['bn', 'en'])
  preferredLanguage?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private repo: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    await this.repo.update(id, dto as Partial<UserEntity>);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { deletedAt: new Date(), status: 'deleted' });
  }
}
