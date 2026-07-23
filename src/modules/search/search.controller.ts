import { Controller, Get, Query } from '@nestjs/common';
import { SearchService, JobSearchParams, WorkerSearchParams } from './search.service';
import { Public } from '../../common/decorators/roles.decorator';

@Controller('search')
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Public()
  @Get('jobs')
  searchJobs(@Query() params: JobSearchParams) {
    return this.svc.searchJobs(params);
  }

  @Public()
  @Get('workers')
  searchWorkers(@Query() params: WorkerSearchParams) {
    return this.svc.searchWorkers(params);
  }
}
