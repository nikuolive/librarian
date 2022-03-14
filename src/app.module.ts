import { CacheInterceptor, CacheModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MangaChapter } from './manga/entities/manga-chapter.entity';
import { MangaCover } from './manga/entities/manga-cover.entity';
import { MangaPage } from './manga/entities/manga-page.entity';
import { Manga } from './manga/entities/manga.entity';
import { MangaModule } from './manga/manga.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [Manga, MangaChapter, MangaPage, MangaCover],
      keepConnectionAlive: true,
    }),
    MangaModule,
    ScheduleModule.forRoot(),
    TasksModule,
    // CacheModule.register()
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: CacheInterceptor
    // }
  ],
})
export class AppModule {
  constructor(private connection: Connection) { }
}
