import {
  Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Entity } from 'typeorm/decorator/entity/Entity';
import { Manga } from './manga.entity';

@Entity('manga_cover')
export class MangaCover {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    path: string;

    @Column()
    title: string;

    @Column({ name: 'cover_number' })
    coverNumber: number;

    @ManyToOne(() => Manga, (manga) => manga.mangaChapter)
    @JoinColumn({ name: 'manga_id' })
    manga: Manga;
}
