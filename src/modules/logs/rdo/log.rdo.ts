import { Expose } from 'class-transformer';

export class LogRdo {
  @Expose()
  id: string;

  @Expose()
  type: string;

  @Expose()
  message: string;

  @Expose()
  timestamp: Date;
}