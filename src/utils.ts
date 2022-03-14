export function joinPathWithEnv(str: string) {
    return `${process.env.MANGA_STORAGE_PATH}/${str}`;
}
