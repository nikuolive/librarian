/* eslint-disable no-useless-constructor */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  Response,
  StreamableFile,
  Query,
  Request,
} from '@nestjs/common';
import { MangaService } from './manga.service';
import { UpdateMangaDto } from './dto/update-manga.dto';
import { readFile, stat } from 'fs';
import { Response as Res, Request as Req } from 'express';
import { promisify } from 'util';
import * as etag from 'etag';
import { joinPathWithEnv } from 'src/utils';
import { ScanOptionsDto } from './dto/scan-options.dto';

@Controller('manga')
export class MangaController {
  constructor(private readonly mangaService: MangaService) {}

  @Get()
  findAll(@Query('page') page: number) {
    if (page === undefined) {
      throw new BadRequestException('No query provided');
    }
    return this.mangaService.findManga(page);
  }

  @Post('scan')
  scan(@Body() scanOptionsDto: ScanOptionsDto) {
    if (scanOptionsDto) {
      return this.mangaService.scan(scanOptionsDto);
    } else {
      return this.mangaService.scan();
    }
  }

  @Post('scan-chapter/:id')
  scanChapter(@Param('id') id: number, @Body() scanOptionsDto: ScanOptionsDto) {
    if (scanOptionsDto) {
      this.mangaService.scanChapter(id, scanOptionsDto);
    } else {
      this.mangaService.scanChapter(id);
    }
  }

  @Post('scan-page/:id')
  scanPage(@Param('id') id: number) {
    this.mangaService.scanPage(id);
  }

  @Post('scan-cover/:id')
  scanCover(@Param('id') id: number) {
    this.mangaService.scanCover(id);
  }

  @Get('manga-chapter/:id')
  getPage(@Param('id') id: number) {
    return this.mangaService.scanPage(id);
  }

  @Get(':id')
  findMangaChapter(@Param('id') id: number) {
    return this.mangaService.findMangaChapter(id);
  }

  @Get(':mangaId/:chapterId')
  getMangaPages(
    @Param('mangaId') mangaId: string,
    @Param('chapterId') chapterId: string,
  ) {
    return this.mangaService.findMangaPages(+mangaId, +chapterId);
  }

  @Get(':mangaId/cover/:coverId')
  async getCoverPage(
    @Response({ passthrough: true }) res: Res,
    @Request() req: Req,
    @Param('mangaId') mangaId: number,
    @Param('coverId') coverId: number,
  ) {
    const page = await this.mangaService.findCoverPage(+mangaId, +coverId);

    if (page) {
      const file = await promisify(readFile)(joinPathWithEnv(page.path));
      const tag = etag(file);
      const statP = await promisify(stat)(joinPathWithEnv(page.path));
      res.set({
        'Content-Type': 'image/' + page.path.slice(-3),
        'Content-Length': statP.size,
        'Content-Disposition': 'inline',
        // 'Cache-Control': 'max-age=604800, public',
        ETag: tag,
      });
      if (req.headers['if-none-match'] === tag) {
        res.status(304);
        return;
      }
      return new StreamableFile(file);
    } else {
      throw new BadRequestException();
    }
  }

  @Get(':mangaId/:chapterId/:pageNumber')
  async getMangaPage(
    @Response({ passthrough: true }) res: Res,
    @Request() req: Req,
    @Param('mangaId') mangaId: string,
    @Param('chapterId') chapterId: string,
    @Param('pageNumber') pageNumber: string,
  ) {
    const page = await this.mangaService.findPage(
      +mangaId,
      +chapterId,
      +pageNumber,
    );

    if (page) {
      const file = await promisify(readFile)(joinPathWithEnv(page.path));
      const tag = etag(file);
      const statP = await promisify(stat)(joinPathWithEnv(page.path));
      res.set({
        'Content-Type': 'image/' + page.path.slice(-3),
        'Content-Length': statP.size,
        'Content-Disposition': 'inline',
        // 'Cache-Control': 'max-age=604800, public',
        ETag: tag,
      });
      if (req.headers['if-none-match'] === tag) {
        res.status(304);
        return;
      }
      return new StreamableFile(file);
    } else {
      throw new BadRequestException();
    }
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMangaDto: UpdateMangaDto) {
    return this.mangaService.update(+id, updateMangaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mangaService.remove(+id);
  }
}
