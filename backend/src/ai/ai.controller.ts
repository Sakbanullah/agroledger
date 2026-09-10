import {
  BadRequestException,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
  ) {}

  @Get('test')
  testConnection() {
    return this.aiService.testConnection();
  }

  @Post('scan/rubber-note')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },

      fileFilter: (
        req,
        file,
        callback,
      ) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
        ];

        if (
          !allowedMimeTypes.includes(
            file.mimetype,
          )
        ) {
          return callback(
            new BadRequestException(
              'File harus berupa JPG, PNG, atau WebP',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  scanRubberNote(
    @UploadedFile()
    file: {
      buffer: Buffer;
      mimetype: string;
    },
  ) {
    if (!file) {
      throw new BadRequestException(
        'File gambar wajib diupload',
      );
    }

    return this.aiService.scanRubberNote(
      file.buffer,
      file.mimetype,
    );
  }
}