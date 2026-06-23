import { Expose } from 'class-transformer';

export class UserRdo {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  createdAt: Date;
}