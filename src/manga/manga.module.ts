import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { Manga } from './entities/manga.entity';
import { MangaChapter } from './entities/manga-chapter.entity';
import { MangaPage } from './entities/manga-page.entity';
import { MangaCover } from './entities/manga-cover.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Manga, MangaChapter, MangaPage, MangaCover])],
  controllers: [MangaController],
  providers: [MangaService],
})
export class MangaModule {}
