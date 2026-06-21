import { Expose } from 'class-transformer';

export class ImportBatchRdo {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  type: string;

  @Expose()
  status: string;

  @Expose()
  productsCount: number;

  @Expose()
  targetSiteIds: string[];

  @Expose()
  createdAt: Date;
}