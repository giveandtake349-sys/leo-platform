import { Controller, Get, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Public } from '../../common/decorators/roles.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Public()
  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Public()
  @Get(':id/skills')
  findSkills(@Param('id') id: string) {
    return this.svc.findSkillsByCategory(id);
  }
}
