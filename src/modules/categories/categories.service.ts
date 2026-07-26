import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from './entities/category.entity';
import { SkillEntity } from './entities/skill.entity';

const CATEGORIES_41 = [
  'Tourist and Restaurants', 'Drivers', 'Labors', 'Sales and Marketing', 'Engineering',
  'Accounting', 'Craftsmen', 'Administration', 'Construction', 'Technicians',
  'Customer Service', 'Medicine and Nursing', 'Employees', 'Delivery', 'Beauty care',
  'Guard & Security', 'Data Entry', 'Designer', 'Cleaning Workers', 'Misc Jobs',
  'AC Technicians', 'Education and Teaching', 'Partnership', 'Information Technology',
  'Tailors', 'Housemaids', 'Garden and Landscaping', 'Human Resources', 'Secretarial',
  'Programming', 'Law', 'Fitness', 'Audio Visual', 'Fine Arts', 'Public Relations',
  'Web Designers', 'Ticketing & Tourism', 'Child Care', 'Fashion', 'Translators', 'Editors',
];

@Injectable()
export class CategoriesService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(CategoryEntity) private catRepo: Repository<CategoryEntity>,
    @InjectRepository(SkillEntity) private skillRepo: Repository<SkillEntity>,
  ) {}

  async onApplicationBootstrap() {
    for (let i = 0; i < CATEGORIES_41.length; i++) {
      const name = CATEGORIES_41[i];
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const existing = await this.catRepo.findOne({ where: { slug } });
      if (!existing) {
        await this.catRepo.save(
          this.catRepo.create({ name, slug, sortOrder: i + 1 }),
        );
      }
    }
  }

  findAll(): Promise<CategoryEntity[]> {
    return this.catRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  findSkillsByCategory(categoryId: string): Promise<SkillEntity[]> {
    return this.skillRepo.find({ where: { categoryId } });
  }
}
