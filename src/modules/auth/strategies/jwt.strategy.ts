import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService, private readonly configService: ConfigService) {
    const secret = configService.get('JWT_SECRET', 'secret'); 

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });


    if (!user) {
      throw new UnauthorizedException('Пользователь не найден в базе данных');
    }

    return { userId: payload.sub, username: payload.username };
  }
}