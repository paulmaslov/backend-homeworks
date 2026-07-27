// имя файла, которое генерирует сервер: uuid + расширение
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export const uuidFileName = (extension: string): RegExp =>
    new RegExp(`^${UUID}\\.${extension}$`);
