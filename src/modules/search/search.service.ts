import { Injectable, Logger } from '@nestjs/common';

export interface JobSearchParams {
  q?: string;
  categoryId?: string;
  district?: string;
  minSalary?: number;
  maxSalary?: number;
  workMode?: string;
  jobType?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface WorkerSearchParams {
  q?: string;
  skillId?: string;
  district?: string;
  availabilityMode?: string;
  openToWork?: boolean;
  minExperience?: number;
  language?: string;
  trustBadge?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
}

/**
 * SearchService wraps Elasticsearch.
 * When ES is unavailable (e.g. dev with no ES cluster) it returns empty results
 * gracefully instead of crashing the server.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private esClient: any = null;

  constructor() {
    this.initEs();
  }

  private initEs() {
    try {
      // Dynamically require @elastic/elasticsearch so the app starts even if
      // the package is missing (e.g. restricted network on first install).
      const { Client } = require('@elastic/elasticsearch');
      this.esClient = new Client({
        node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
      });
      this.logger.log('Elasticsearch client initialised');
    } catch {
      this.logger.warn('Elasticsearch not available — search returns empty results');
    }
  }

  async searchJobs(params: JobSearchParams) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;

    if (!this.esClient) return { data: [], meta: { page, limit, total: 0 } };

    try {
      const res = await this.esClient.search({
        index: 'leo_jobs',
        from: (page - 1) * limit,
        size: limit,
        query: this.buildJobQuery(params),
      });
      const hits = res.hits;
      return {
        data: hits.hits.map((h: any) => ({ id: h._id, ...h._source })),
        meta: { page, limit, total: hits.total?.value || 0 },
      };
    } catch (err) {
      this.logger.error('ES job search failed', err);
      return { data: [], meta: { page, limit, total: 0 } };
    }
  }

  async searchWorkers(params: WorkerSearchParams) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;

    if (!this.esClient) return { data: [], meta: { page, limit, total: 0 } };

    try {
      const res = await this.esClient.search({
        index: 'leo_workers',
        from: (page - 1) * limit,
        size: limit,
        query: { bool: { must: [{ term: { openToWork: true } }] } },
      });
      const hits = res.hits;
      return {
        data: hits.hits.map((h: any) => ({ id: h._id, ...h._source })),
        meta: { page, limit, total: hits.total?.value || 0 },
      };
    } catch (err) {
      this.logger.error('ES worker search failed', err);
      return { data: [], meta: { page, limit, total: 0 } };
    }
  }

  async indexJob(job: Record<string, unknown>): Promise<void> {
    if (!this.esClient) return;
    try {
      await this.esClient.index({ index: 'leo_jobs', id: job['id'] as string, document: job });
    } catch (err) {
      this.logger.error(`Failed to index job ${job['id']}`, err);
    }
  }

  async indexWorker(worker: Record<string, unknown>): Promise<void> {
    if (!this.esClient) return;
    try {
      await this.esClient.index({ index: 'leo_workers', id: worker['id'] as string, document: worker });
    } catch (err) {
      this.logger.error(`Failed to index worker ${worker['id']}`, err);
    }
  }

  async deleteDocument(index: string, id: string): Promise<void> {
    if (!this.esClient) return;
    try {
      await this.esClient.delete({ index, id });
    } catch (err) {
      this.logger.warn(`ES delete failed for ${index}/${id}`, err);
    }
  }

  private buildJobQuery(params: JobSearchParams) {
    const must: any[] = [{ term: { status: 'active' } }];
    const filter: any[] = [];
    if (params.q) must.push({ multi_match: { query: params.q, fields: ['title^3', 'description'] } });
    if (params.categoryId) filter.push({ term: { categoryId: params.categoryId } });
    if (params.district) filter.push({ term: { district: params.district } });
    if (params.workMode) filter.push({ term: { workMode: params.workMode } });
    return { bool: { must, filter } };
  }
}
