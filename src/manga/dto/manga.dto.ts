import { MangaCoverDto } from "./manga-cover.dto";

export class MangaDto {
    id: number;
    title: string;
    description = "";
    author = "";
    artist = "";
    cover: MangaCoverDto[];
}
