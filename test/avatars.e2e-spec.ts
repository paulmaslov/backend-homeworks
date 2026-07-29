import { INestApplication, Logger } from "@nestjs/common";
import { getModelToken } from "@nestjs/sequelize";

import { Avatar } from "@/features/avatars/avatar.model";
import { IAvatarRepository } from "@/features/avatars/avatar.repository.interface";
import {
    AVATARS_FOLDER,
    MAX_ACTIVE_AVATARS,
    MAX_AVATAR_SIZE_BYTES,
} from "@/features/avatars/avatars.constants";
import { AvatarResponseDto } from "@/features/avatars/dto/avatar-response.dto";
import { IFileService } from "@/providers/files/files.adapter";
import { UploadException } from "@/providers/files/s3/exceptions/upload.exception";
import { uuidFileName } from "@/providers/files/testing/file-name-pattern";

import { api, API_PREFIX } from "./helpers/api";
import { buildImage, buildNotAnImage } from "./helpers/build-image";
import { cleanDatabase } from "./helpers/clean-database";
import { createTestApp } from "./helpers/create-test-app";
import { registerUser } from "./helpers/register-user";
import {
    cleanBucket,
    getPublicUrl,
    listObjectKeys,
    readObject,
} from "./helpers/s3";

const AVATARS_URL = `${API_PREFIX}/users/me/avatars`;
// заведомо несуществующий идентификатор
const UNKNOWN_UUID = "00000000-0000-4000-8000-000000000000";

describe("Avatars (e2e)", () => {
    let app: INestApplication;
    // чтобы проверять бд
    let avatarModel: typeof Avatar;

    beforeAll(async () => {
        app = await createTestApp();
        avatarModel = app.get<typeof Avatar>(getModelToken(Avatar));
    });

    beforeEach(async () => {
        await cleanDatabase(app);
        await cleanBucket(app);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await app?.close();
    });

    const uploadAvatar = (
        accessToken: string,
        buffer: Buffer = buildImage(),
        options: { filename?: string; contentType?: string } = {},
    ) => {
        return api(app)
            .post(AVATARS_URL)
            .set("Authorization", `Bearer ${accessToken}`)
            .attach("file", buffer, {
                filename: options.filename ?? "avatar.png",
                contentType: options.contentType ?? "image/png",
            });
    };

    const deleteAvatar = (accessToken: string, avatarId: string) => {
        return api(app)
            .delete(`${AVATARS_URL}/${avatarId}`)
            .set("Authorization", `Bearer ${accessToken}`);
    };

    const uploadAndGetId = async (accessToken: string): Promise<string> => {
        const response = await uploadAvatar(accessToken).expect(201);

        return (response.body as AvatarResponseDto).id;
    };

    describe("POST /users/me/avatars - negative tests", () => {
        it("Returns 401 without access token", async () => {
            await api(app)
                .post(AVATARS_URL)
                .attach("file", buildImage(), {
                    filename: "avatar.png",
                    contentType: "image/png",
                })
                .expect(401);
        });

        it("Returns 401 with invalid access token", async () => {
            await uploadAvatar("not-a-real-token").expect(401);
        });

        it("Returns 400 when no file is attached", async () => {
            const { accessToken } = await registerUser(app);

            await api(app)
                .post(AVATARS_URL)
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(400);
        });

        it("Returns 400 when the field carries text instead of a file", async () => {
            const { accessToken } = await registerUser(app);

            await api(app)
                .post(AVATARS_URL)
                .set("Authorization", `Bearer ${accessToken}`)
                .field("file", "just a string")
                .expect(400);
        });

        // шлем файл в поле аватар, а не в поле файл
        it("Returns 400 when the file is sent under an unexpected field name", async () => {
            const { accessToken } = await registerUser(app);

            await api(app)
                .post(AVATARS_URL)
                .set("Authorization", `Bearer ${accessToken}`)
                .attach("avatar", buildImage(), {
                    filename: "avatar.png",
                    contentType: "image/png",
                })
                .expect(400);
        });

        it("Returns 415 for a disallowed mime type", async () => {
            const { accessToken } = await registerUser(app);

            await uploadAvatar(accessToken, buildNotAnImage(), {
                filename: "doc.pdf",
                contentType: "application/pdf",
            }).expect(415);
        });

        it("Returns 415 when the content does not match the declared type", async () => {
            const { accessToken } = await registerUser(app);

            // заявлен png, внутри произвольные байты
            await uploadAvatar(accessToken, buildNotAnImage()).expect(415);
        });

        it("Returns 415 when a real png is declared as a jpeg", async () => {
            const { accessToken } = await registerUser(app);

            await uploadAvatar(accessToken, buildImage("image/png"), {
                filename: "avatar.jpg",
                contentType: "image/jpeg",
            }).expect(415);
        });

        it("Writes nothing to the database or the bucket when the pipe rejects", async () => {
            const { accessToken } = await registerUser(app);

            await uploadAvatar(accessToken, buildNotAnImage()).expect(415);

            const rows = await avatarModel.findAll({ paranoid: false });
            const keys = await listObjectKeys(app);

            expect(rows).toHaveLength(0);
            expect(keys).toHaveLength(0);
        });

        it("Returns 413 when the file is over the size limit", async () => {
            const { accessToken } = await registerUser(app);

            const tooLarge = Buffer.alloc(MAX_AVATAR_SIZE_BYTES + 1024);
            buildImage().copy(tooLarge);

            await uploadAvatar(accessToken, tooLarge).expect(413);
        });

        it("Returns 409 when the active limit is reached", async () => {
            const { accessToken } = await registerUser(app);

            for (let i = 0; i < MAX_ACTIVE_AVATARS; i++) {
                await uploadAvatar(accessToken).expect(201);
            }

            await uploadAvatar(accessToken).expect(409);
        });

        it("Does not create a row when the storage fails", async () => {
            const { accessToken } = await registerUser(app);

            // если минио упал, не должно быть записи в дб
            const fileService = app.get(IFileService);
            jest.spyOn(fileService, "uploadFile").mockRejectedValueOnce(
                new UploadException("storage is down"),
            );

            await uploadAvatar(accessToken).expect(503);

            const rows = await avatarModel.findAll({ paranoid: false });

            expect(rows).toHaveLength(0);
        });

        it("Removes the uploaded object when the row cannot be created", async () => {
            const { accessToken } = await registerUser(app);

            // мокаем ситуацию, когда запись в бд не прошла,
            // проверяем, что сирота из бакета удалится
            const avatarRepository = app.get(IAvatarRepository);
            jest.spyOn(avatarRepository, "create").mockRejectedValueOnce(
                new Error("db is down"),
            );
            // специально роняем бд не выводим ошибку осознанно,
            // чтобы она не засоряла вывод тестов
            jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});

            await uploadAvatar(accessToken).expect(500);

            const rows = await avatarModel.findAll({ paranoid: false });
            const keys = await listObjectKeys(app);

            expect(rows).toHaveLength(0);
            expect(keys).toHaveLength(0);
        });
    });

    describe("POST /users/me/avatars - positive tests", () => {
        it("Returns 201 when all data is correct", async () => {
            const { accessToken } = await registerUser(app);

            const response = await uploadAvatar(accessToken).expect(201);
            const body = response.body as Record<string, unknown>;

            expect(Object.keys(body).sort()).toEqual([
                "createdAt",
                "id",
                "url",
            ]);
        });

        it("Stores only the file name in the database, without a domain", async () => {
            const { accessToken } = await registerUser(app);

            await uploadAvatar(accessToken).expect(201);

            const [row] = await avatarModel.findAll();

            expect(row.fileName).toMatch(uuidFileName("png"));
            expect(row.fileName).not.toContain("/");
            expect(row.fileName).not.toContain("http");
        });

        it("Puts the object into the avatars folder of the bucket", async () => {
            const { accessToken } = await registerUser(app);

            await uploadAvatar(accessToken).expect(201);

            const [row] = await avatarModel.findAll();
            const keys = await listObjectKeys(app);

            expect(keys).toEqual([`${AVATARS_FOLDER}/${row.fileName}`]);
        });

        it("Stores the bytes and the content type unchanged", async () => {
            const { accessToken } = await registerUser(app);
            const source = buildImage("image/png", 2048);

            await uploadAvatar(accessToken, source).expect(201);

            const [row] = await avatarModel.findAll();
            const stored = await readObject(
                app,
                `${AVATARS_FOLDER}/${row.fileName}`,
            );

            expect(stored.body).toEqual(source);
            // без content type браузер отдаст картинку на скачивание без показа
            expect(stored.contentType).toBe("image/png");
        });

        it("Serves the returned url anonymously", async () => {
            const { accessToken } = await registerUser(app);
            const source = buildImage();

            const response = await uploadAvatar(accessToken, source).expect(
                201,
            );
            const { url } = response.body as AvatarResponseDto;

            // проверяем, что браузер сможет показать картинку
            const fetched = await fetch(url);
            const downloaded = Buffer.from(await fetched.arrayBuffer());

            expect(fetched.status).toBe(200);
            expect(fetched.headers.get("content-type")).toBe("image/png");
            expect(downloaded).toEqual(source);
        });

        // проверяем, что нельзя перебрать все объекты бакета
        it("Does not expose the bucket listing anonymously", async () => {
            const { accessToken } = await registerUser(app);

            await uploadAvatar(accessToken).expect(201);

            const listing = await fetch(`${getPublicUrl(app)}/`);

            expect(listing.status).toBe(403);
        });

        it("Builds the url from the configured public url and folder", async () => {
            const { accessToken } = await registerUser(app);

            const response = await uploadAvatar(accessToken).expect(201);
            const body = response.body as AvatarResponseDto;

            const [row] = await avatarModel.findAll();

            expect(body.url).toBe(
                `${getPublicUrl(app)}/${AVATARS_FOLDER}/${row.fileName}`,
            );
        });

        it("Ignores the client file name when naming the object", async () => {
            const { accessToken } = await registerUser(app);

            await uploadAvatar(accessToken, buildImage(), {
                filename: "../../evil.php",
            }).expect(201);

            const [key] = await listObjectKeys(app);

            expect(key.startsWith(`${AVATARS_FOLDER}/`)).toBe(true);
            expect(key.endsWith(".png")).toBe(true);
            expect(key).not.toContain("evil");
            expect(key).not.toContain("..");
        });

        it("Takes the extension from the mime type, not from the file name", async () => {
            const { accessToken } = await registerUser(app);

            // в имени файла ошибка - в нём png, а по факту и в заголовке jpeg
            await uploadAvatar(accessToken, buildImage("image/jpeg"), {
                filename: "avatar.png",
                contentType: "image/jpeg",
            }).expect(201);

            const [row] = await avatarModel.findAll();
            const stored = await readObject(
                app,
                `${AVATARS_FOLDER}/${row.fileName}`,
            );

            expect(row.mimeType).toBe("image/jpeg");
            expect(row.fileName.endsWith(".jpg")).toBe(true);
            expect(stored.contentType).toBe("image/jpeg");
        });

        it("Records the upload time and the owner", async () => {
            const { accessToken } = await registerUser(app);

            await uploadAvatar(accessToken).expect(201);

            const [row] = await avatarModel.findAll();

            expect(row.createdAt).toBeInstanceOf(Date);
            expect(typeof row.userId).toBe("string");
        });

        it("Allows exactly the maximum number of active avatars", async () => {
            const { accessToken } = await registerUser(app);

            for (let i = 0; i < MAX_ACTIVE_AVATARS; i++) {
                await uploadAvatar(accessToken).expect(201);
            }

            const rows = await avatarModel.findAll();
            const keys = await listObjectKeys(app);

            expect(rows).toHaveLength(MAX_ACTIVE_AVATARS);
            expect(keys).toHaveLength(MAX_ACTIVE_AVATARS);
        });

        it("Gives every upload a distinct name", async () => {
            const { accessToken } = await registerUser(app);

            await uploadAvatar(accessToken).expect(201);
            await uploadAvatar(accessToken).expect(201);

            const keys = await listObjectKeys(app);

            // одинаковое имя перезаписало бы предыдущий объект
            expect(new Set(keys).size).toBe(2);
        });

        it("Applies the limit per user, not globally", async () => {
            const first = await registerUser(app, {
                login: "first_owner",
                email: "first@example.com",
            });
            const second = await registerUser(app, {
                login: "second_owner",
                email: "second@example.com",
            });

            for (let i = 0; i < MAX_ACTIVE_AVATARS; i++) {
                await uploadAvatar(first.accessToken).expect(201);
            }

            // у второго пользователя свой лимит
            await uploadAvatar(second.accessToken).expect(201);
        });
    });

    describe("DELETE /users/me/avatars/:id - negative tests", () => {
        it("Returns 401 without access token", async () => {
            await api(app).delete(`${AVATARS_URL}/${UNKNOWN_UUID}`).expect(401);
        });

        it("Returns 400 when the id is not a uuid", async () => {
            const { accessToken } = await registerUser(app);

            await deleteAvatar(accessToken, "not-a-uuid").expect(400);
        });

        it("Returns 404 for an unknown avatar", async () => {
            const { accessToken } = await registerUser(app);

            await deleteAvatar(accessToken, UNKNOWN_UUID).expect(404);
        });

        it("Returns 404 when deleting another user's avatar", async () => {
            const owner = await registerUser(app, {
                login: "avatar_owner",
                email: "owner@example.com",
            });
            const stranger = await registerUser(app, {
                login: "the_stranger",
                email: "stranger@example.com",
            });

            const avatarId = await uploadAndGetId(owner.accessToken);

            await deleteAvatar(stranger.accessToken, avatarId).expect(404);

            // аватарка владельца осталась активной
            const stillActive = await avatarModel.findByPk(avatarId);

            expect(stillActive).not.toBeNull();
        });

        it("Returns 404 on repeated deletion", async () => {
            const { accessToken } = await registerUser(app);

            const avatarId = await uploadAndGetId(accessToken);

            await deleteAvatar(accessToken, avatarId).expect(204);
            await deleteAvatar(accessToken, avatarId).expect(404);
        });
    });

    describe("DELETE /users/me/avatars/:id - positive tests", () => {
        it("Returns 204 and keeps the row with deletedAt set", async () => {
            const { accessToken } = await registerUser(app);

            const avatarId = await uploadAndGetId(accessToken);

            await deleteAvatar(accessToken, avatarId).expect(204);

            const active = await avatarModel.findByPk(avatarId);
            const withDeleted = await avatarModel.findByPk(avatarId, {
                paranoid: false,
            });

            expect(active).toBeNull();
            expect(withDeleted).not.toBeNull();
            expect(withDeleted?.deletedAt).toBeInstanceOf(Date);
        });

        it("Frees a slot for a new upload", async () => {
            const { accessToken } = await registerUser(app);

            const ids: string[] = [];
            for (let i = 0; i < MAX_ACTIVE_AVATARS; i++) {
                ids.push(await uploadAndGetId(accessToken));
            }

            await uploadAvatar(accessToken).expect(409);

            await deleteAvatar(accessToken, ids[0]).expect(204);

            await uploadAvatar(accessToken).expect(201);
        });

        // файл остается в бакете после удаления
        it("Keeps the object in the bucket after a soft delete", async () => {
            const { accessToken } = await registerUser(app);

            const avatarId = await uploadAndGetId(accessToken);
            const keysBefore = await listObjectKeys(app);

            await deleteAvatar(accessToken, avatarId).expect(204);

            const keysAfter = await listObjectKeys(app);

            expect(keysAfter).toEqual(keysBefore);
        });
    });
});
