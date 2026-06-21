import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

@Injectable()
export class FilesService {
  private readonly uploadPath = resolve(process.cwd(), 'uploads');

  constructor() {
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  saveFile(file: Express.Multer.File): string {
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = file.originalname.split('.').pop();
    const filename = `${uniqueSuffix}.${ext}`;
    const filePath = join(this.uploadPath, filename);

    writeFileSync(filePath, file.buffer);

    return `/uploads/${filename}`;
  }


  deleteFile(filePath: string): void {
    if (!filePath) return;

    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const fullPath = resolve(process.cwd(), cleanPath);

    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  }
}