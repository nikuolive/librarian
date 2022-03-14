import {
  Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Entity } from 'typeorm/decorator/entity/Entity';
import { MangaChapter } from './manga-chapter.entity';

@Entity('manga_page')
export class MangaPage {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    path: string;

    @Column({ name: 'page_number' })
    pageNumber: number;

    @ManyToOne(() => MangaChapter, (mangaChapter) => mangaChapter.mangaPage)
    @JoinColumn({ name: 'manga_chapter_id' })
    mangaChapter: MangaChapter;
}
