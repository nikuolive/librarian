import { MangaCoverDto } from "./manga-cover.dto";

export class MangaDto {
    id: number;
    title: string;
    cover: MangaCoverDto[];
}
