import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LogType } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { fillDto } from '../../common/utils/fillDto.js';
import { LogsService } from '../logs/logs.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponseRdo } from './rdo/auth-response.rdo.js';
import { UserRdo } from './rdo/user.rdo.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly logsService: LogsService,
    private readonly configService: ConfigService
  ) {}

  async onModuleInit() {
    await this.ensureDefaultUser();
  }

  private async ensureDefaultUser() {
    const defaultUsername = this.configService.get('DEFAULT_ADMIN_USERNAME', 'admin');
    const defaultPassword = this.configService.get('DEFAULT_ADMIN_PASSWORD', 'admin');

    const existingUser = await this.prisma.user.findFirst();

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(
        defaultPassword,
        this.SALT_ROUNDS,
      );
      await this.prisma.user.create({
        data: {
          username: defaultUsername,
          password: hashedPassword,
        },
      });
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseRdo> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      await this.logsService.create({
        type: LogType.warning,
        message: `Неудачная попытка входа: пользователь ${dto.username} не найден`,
      });
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      await this.logsService.create({
        type: LogType.warning,
        message: `Неудачная попытка входа для пользователя ${dto.username}`,
      });
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const payload = { sub: user.id, username: user.username };

    const secret = (this.jwtService as any).options?.secret || 'НЕИЗВЕСТНО';

    const accessToken = this.jwtService.sign(payload);

    await this.logsService.create({
      type: LogType.info,
      message: `Пользователь ${user.username} вошел в систему`,
    });

    return fillDto(AuthResponseRdo, {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Пользователь не найден');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      await this.logsService.create({
        type: LogType.warning,
        message: `Неудачная попытка смены пароля для пользователя ${user.username}`,
      });
      throw new UnauthorizedException('Текущий пароль неверен');
    }

    const hashedNewPassword = await bcrypt.hash(
      dto.newPassword,
      this.SALT_ROUNDS,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    await this.logsService.create({
      type: LogType.success,
      message: `Пароль изменен для пользователя ${user.username}`,
    });
  }

  async getProfile(userId: string): Promise<UserRdo> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Пользователь не найден');
    }

    return fillDto(UserRdo, user);
  }
}
