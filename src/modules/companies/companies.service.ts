import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyEntity } from './entities/company.entity';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/create-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(CompanyEntity) private repo: Repository<CompanyEntity>,
  ) {}

  async create(userId: string, dto: CreateCompanyDto): Promise<CompanyEntity> {
    const exists = await this.repo.findOne({ where: { userId } });
    if (exists) throw new ConflictException('Company profile already exists');
    const company = this.repo.create({ ...dto, userId });
    return this.repo.save(company);
  }

  async findById(id: string): Promise<CompanyEntity> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Company not found');
    return c;
  }

  async findByUserId(userId: string): Promise<CompanyEntity> {
    const c = await this.repo.findOne({ where: { userId } });
    if (!c) throw new NotFoundException('Company not found');
    return c;
  }

  async update(userId: string, dto: UpdateCompanyDto): Promise<CompanyEntity> {
    const c = await this.findByUserId(userId);
    Object.assign(c, dto);
    return this.repo.save(c);
  }

  async updateLogo(userId: string, logoUrl: string): Promise<void> {
    const c = await this.findByUserId(userId);
    await this.repo.update(c.id, { logoUrl });
  }
}
