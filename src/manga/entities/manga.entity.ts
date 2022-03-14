import { Column, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Entity } from "typeorm/decorator/entity/Entity";
import { MangaChapter } from "./manga-chapter.entity";
import { MangaCover } from "./manga-cover.entity";

@Entity('manga_collection')
export class Manga {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    path: string;

    @OneToMany(() => MangaChapter, mangaChapter => mangaChapter.manga)
    mangaChapter: MangaChapter[];

    @OneToMany(() => MangaCover, mangaCover => mangaCover.manga)
    mangaCover: MangaCover[];
}
