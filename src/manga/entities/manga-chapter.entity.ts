import { Manga } from 'src/manga/entities/manga.entity';
import {
  Column, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn,
} from 'typeorm';
import { Entity } from 'typeorm/decorator/entity/Entity';
import { MangaPage } from './manga-page.entity';

@Entity('manga_chapter')
export class MangaChapter {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    path: string;

    @Column({ name: 'chapter_number' })
    chapterNumber: number;

    @Column({ name: 'volume_number' })
    volumeNumber: number;

    @Column({ name: 'is_volume' })
    isVolume: boolean;

    @ManyToOne(() => Manga, (manga) => manga.mangaChapter)
    @JoinColumn({ name: 'manga_id' })
    manga: Manga;

    @OneToMany(() => MangaPage, (MangaPage) => MangaPage.mangaChapter)
    mangaPage: MangaPage[];
}
