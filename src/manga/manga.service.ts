import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { extname, parse } from 'node:path';
import { joinPathWithEnv } from 'src/utils';
import { Connection } from 'typeorm';
import { Repository } from 'typeorm/repository/Repository';
import { MangaChapterDto } from './dto/manga-chapter.dto';
import { MangaDto } from './dto/manga.dto';
import { UpdateMangaDto } from './dto/update-manga.dto';
import { MangaChapter } from './entities/manga-chapter.entity';
import { MangaCover } from './entities/manga-cover.entity';
import { MangaPage } from './entities/manga-page.entity';
import { Manga } from './entities/manga.entity';
import { ScanOptions } from './options/scan-options';

@Injectable()
export class MangaService {
  constructor(
    @InjectRepository(Manga)
    private mangaRepository: Repository<Manga>,
    @InjectRepository(MangaChapter)
    private mangaChapterRepository: Repository<MangaChapter>,
    @InjectRepository(MangaPage)
    private mangaPageRepository: Repository<MangaPage>,
    @InjectRepository(MangaCover)
    private mangaCoverRepository: Repository<MangaCover>,
    private connection: Connection,
  ) {}

  async findAll() {
    return { manga: await this.mangaRepository.find() };
  }

  async findManga(page: number) {
    const limit = 10;
    const searchPage = page - 1;
    const mangaList = await this.mangaRepository.find({
      skip: limit * searchPage,
      take: limit,
    });
    const count = await this.mangaRepository.count();
    const list = [];
    console.log(mangaList)
    for (const manga of mangaList) {
      const coverList = await this.mangaCoverRepository.find({
        where: { manga: manga.id },
      });
      // eslint-disable-next-line
      const cover = coverList.map((cover) => {
        return (({ path, coverNumber, manga, ...o }) => o)(cover);
      });
      const dto: MangaDto = new MangaDto()
      dto.id = manga.id
      dto.title = manga.title
      dto.cover = cover
      list.push(dto);
    }
    return { manga: list, totalPages: Math.max(Math.ceil(count / 10), 1), page: page };
  }

  findOne(id: number) {
    return this.mangaRepository.findOne(id);
  }

  async findMangaChapter(id: number) {
    console.log(id);
    const manga = await this.mangaRepository.findOne(id);

    const chapters = await this.mangaChapterRepository.find({
      where: { manga: manga.id },
      order: { volumeNumber: 'ASC', chapterNumber: 'ASC' },
    });

    console.log(chapters);

    const list = [];

    for (const chapter of chapters) {
      const chapterDto: MangaChapterDto = { ...chapter, pages: 0 };
      const pages = await this.mangaPageRepository.count({
        relations: ['mangaChapter'],
        where: { mangaChapter: chapter.id },
      });
      chapterDto.pages = pages;
      list.push(chapterDto);
    }

    return list;
  }

  async findMangaPages(mangaId: number, chapterId: number) {
    const manga = await this.mangaRepository.findOne(mangaId);

    const chapter = await this.mangaChapterRepository.findOne({
      where: { manga: manga.id, id: chapterId },
    });

    const pages = await this.mangaPageRepository.find({
      relations: ['mangaChapter'],
      where: { mangaChapter: chapter.id },
    });

    return { total_pages: pages.length, pages: pages };
  }

  async findPage(mangaId: number, chapterId: number, pageNumber: number) {
    const pages = await this.findMangaPages(mangaId, chapterId);

    const page = pages.pages.find((x) => x.pageNumber === pageNumber);
    console.log(page);
    if (page) {
      return page;
    }
    return null;
  }

  async findCoverPage(mangaId: number, coverId: number) {
    const manga = await this.mangaRepository.findOne(mangaId);

    const cover = await this.mangaCoverRepository.findOne({
      where: { manga: manga.id, id: coverId },
    });

    console.log('HERE');
    if (cover) {
      return cover;
    }
    return null;
  }

  async scan(options: ScanOptions = { rescan: false }) {
    const path = process.env.MANGA_STORAGE_PATH;
    if (path === '') throw new InternalServerErrorException('Path is not set');
    const files = await readdir(path);
    try {
      for (const file of files) {
        const mangaExists = await this.mangaRepository.findOne({ title: file });
        if (!mangaExists) {
          const tempManga = new Manga();
          tempManga.title = file;
          tempManga.path = `${file}`;

          const saved = await this.mangaRepository.save(tempManga);
          console.log(saved);
          let mangaId = -1;
          let manga = null;

          const mangaExist = await this.mangaRepository.findOne({
            title: tempManga.title,
          });
          if (!mangaExist) {
            manga = await this.mangaRepository.save(tempManga);
            mangaId = manga.id;
          } else {
            mangaId = mangaExist.id;
          }

          if (options.scan) {
            if ((mangaExist && options.rescan) || manga) {
              this.scanChapter(mangaId, options);
            }
          }
        }
      }
    } catch {
      throw BadRequestException;
    }
  }

  async scanChapter(id: number, options: ScanOptions = { rescan: false }) {
    const manga = await this.mangaRepository.findOne({ id: id });
    console.log(manga);
    if (manga) {
      const path = manga.path;
      const files = await readdir(joinPathWithEnv(path), {
        withFileTypes: true,
      });
      try {
        for (const file of files) {
          if (extname(file.name) === '.cbz') {
            const filename = `${joinPathWithEnv(path)}/${
              parse(file.name).name
            }`;
            const filebase = `${joinPathWithEnv(path)}/${
              parse(file.name).base
            }`;
            const folderExist = existsSync(filename);
            if (folderExist) continue;
            console.log(filename);
            console.log(filebase);
            exec(
              `unzip -d "${filename}" "${filebase}"`,
              (error, stdout, stderr) => {
                if (error) {
                  console.log(`error: ${error.message}`);
                  return;
                }
                if (stderr) {
                  console.log(`stderr: ${stderr}`);
                  return;
                }
                if (stdout) {
                  console.log(`stdout: ${stdout}`);
                  this.createChapter(
                    path,
                    parse(file.name).name,
                    manga,
                    options,
                  );
                }
              },
            );
          } else if (
            file.isDirectory() &&
            file.name.toLocaleLowerCase() !== 'covers'
          ) {
            this.createChapter(path, file.name, manga, options);
          }
        }
      } catch {
        throw BadRequestException;
      }
    }
  }

  async createChapter(path, file, manga, options) {
    const tempChapter = new MangaChapter();
    const volumeNumberRegex = /v\d+/gi;
    const volumeNumberMatch = file.match(volumeNumberRegex);
    const chapterNumberRegex = /\d+\s+\(/g;
    const chapterNumberMatch = file.match(chapterNumberRegex);

    if (volumeNumberMatch) {
      tempChapter.volumeNumber = Number(volumeNumberMatch[0].slice(1));
      tempChapter.title = volumeNumberMatch[0];
      tempChapter.isVolume = true;
      tempChapter.manga = manga;
      tempChapter.path = `${path}/${file}`;
    } else if (chapterNumberMatch) {
      tempChapter.chapterNumber = Number(chapterNumberMatch[0].slice(-2));
      tempChapter.title = chapterNumberMatch[0].slice(-2);
      tempChapter.isVolume = false;
      tempChapter.manga = manga;
      tempChapter.path = `${path}/${file}`;
    }
    console.log('-----------temp-chapter----------');
    console.log(tempChapter);

    let chapterId = -1;
    let chapter = null;

    const chapterExist = await this.mangaChapterRepository.findOne({
      title: tempChapter.title,
      manga: manga,
    });
    if (!chapterExist) {
      chapter = await this.mangaChapterRepository.save(tempChapter);
      console.log('-----------saved-chapter----------');
      console.log(chapter);
      chapterId = chapter.id;
    } else {
      chapterId = chapterExist.id;
    }

    if (options.scan) {
      if ((chapterExist && options.rescan) || chapter) {
        this.scanPage(chapterId);
      }
    }
  }

  async scanCover(id: number) {
    const manga = await this.mangaRepository.findOne({ id: id });
    console.log(manga);
    if (manga) {
      const path = manga.path;
      const files = await readdir(joinPathWithEnv(path), {
        withFileTypes: true,
      });

      try {
        for (const file of files) {
          if (
            file.isDirectory() &&
            file.name.toLocaleLowerCase() === 'covers'
          ) {
            console.log(`${path}/${file.name}`);
            const coverFiles = await readdir(
              joinPathWithEnv(`${path}/${file.name}`),
              {
                withFileTypes: true,
              },
            );

            try {
              let counter = 0;
              for (const coverFile of coverFiles) {
                const cover = new MangaCover();
                cover.coverNumber = ++counter;
                cover.path = `${path}/${file.name}/${coverFile.name}`;
                cover.title = coverFile.name;
                cover.manga = manga;
                console.log(`${cover.coverNumber}`);
                await this.mangaCoverRepository.save(cover);
              }
            } catch (err) {
              console.log(err);
              throw BadRequestException;
            }
          }
        }
      } catch {
        throw BadRequestException;
      }
    }
  }

  // async scanCoverPage(id: number) {
  //   const mangaChapter = await this.mangaChapterRepository.findOne({ id: id });
  //   if (mangaChapter) {
  //     const path = mangaChapter.path;
  //     const files = await readdir(path, { withFileTypes: true });
  //     try {
  //       let pageNumber = 1;
  //       for (const file of files) {
  //         const page = new MangaPage();
  //         page.pageNumber = pageNumber;
  //         page.path = `${path}/${file.name}`;
  //         page.mangaChapter = mangaChapter;
  //         await this.mangaPageRepository.save(page);
  //         pageNumber++;
  //       }
  //     } catch {
  //       throw new BadRequestException();
  //     }
  //   }
  // }

  async scanPage(id: number) {
    const mangaChapter = await this.mangaChapterRepository.findOne({ id: id });
    console.log(mangaChapter)
    if (mangaChapter) {
      const path = mangaChapter.path;
      const files = await readdir(joinPathWithEnv(path), {
        withFileTypes: true,
      });
      try {
        let pageNumber = 1;
        for (const file of files) {
          if (
            file.isDirectory() &&
            file.name.toLocaleLowerCase() !== 'covers'
          ) {

            const newPath = `${path}/${file.name}`
            console.log(joinPathWithEnv(newPath))
            const files2 = await readdir(joinPathWithEnv(newPath), {
              withFileTypes: true,
            });
            for (const file2 of files2) {
              this.createPage(
                file2,
                pageNumber++,
                newPath,
                mangaChapter,
              );
            }
          } else {
            this.createPage(file, pageNumber++, path, mangaChapter);
          }
        }
      } catch {
        throw new BadRequestException();
      }
    }
  }

  async createPage(file, pageNumber, path, mangaChapter) {
    console.log(file);
    const tempPage = new MangaPage();
    tempPage.pageNumber = pageNumber;
    tempPage.path = `${path}/${file.name}`;
    tempPage.mangaChapter = mangaChapter;
    await this.mangaPageRepository.save(tempPage);
    let page = null;

    const pageExist = await this.mangaPageRepository.findOne({
      path: tempPage.path,
      mangaChapter: tempPage.mangaChapter,
    });
    if (!pageExist) {
      page = await this.mangaChapterRepository.save(tempPage);
    }
  }

  getTitleFromFolderName(name: string): string {
    const realTitle = name;
    return realTitle;
  }

  update(id: number, updateMangaDto: UpdateMangaDto) {
    return `This action updates a #${id} manga`;
  }

  remove(id: number) {
    return `This action removes a #${id} manga`;
  }
}
