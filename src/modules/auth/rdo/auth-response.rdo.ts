import { Expose } from 'class-transformer';
import { UserRdo } from './user.rdo';

export class AuthResponseRdo {
  @Expose()
  accessToken: string;

  @Expose()
  user: UserRdo;
}