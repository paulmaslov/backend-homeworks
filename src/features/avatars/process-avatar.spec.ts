import sharp, { Sharp } from "sharp";

import {
    AVATAR_OUTPUT_MIME_TYPE,
    AVATAR_SIZE_PX,
} from "@/features/avatars/avatars.constants";
import { processAvatar } from "@/features/avatars/process-avatar";

// orientation 6 - "повернуть на 90"
const EXIF_ORIENTATION_ROTATED = 6;

const createImage = (width: number, height: number): Sharp =>
    sharp({
        create: {
            width,
            height,
            channels: 3,
            background: { r: 10, g: 120, b: 200 },
        },
    });

describe("processAvatar", () => {
    describe("Negative tests", () => {
        it("Throws when the image exceeds the input pixel limit", async () => {
            // 56 млн пикселей при весе png около 160 КБ:
            // лимит на размер файла такую картинку не отсекает
            const bomb = await createImage(8000, 7000).png().toBuffer();

            await expect(processAvatar(bomb)).rejects.toThrow(/pixel limit/);
        });

        it("Throws error when the buffer is not an image", async () => {
            const junk = Buffer.alloc(1024);
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(
                junk,
            );

            await expect(processAvatar(junk)).rejects.toThrow();
        });
    });

    describe("Positive tests", () => {
        it("Resizes a large image down to the target size", async () => {
            const result = await processAvatar(
                await createImage(2000, 1200).png().toBuffer(),
            );

            expect(result.width).toBe(AVATAR_SIZE_PX);
            expect(result.height).toBe(AVATAR_SIZE_PX);
        });

        it("Returns webp regardless of the input format", async () => {
            const result = await processAvatar(
                await createImage(800, 800).jpeg().toBuffer(),
            );

            expect(result.mimeType).toBe(AVATAR_OUTPUT_MIME_TYPE);
            expect(result.size).toBe(result.buffer.length);

            const meta = await sharp(result.buffer).metadata();

            expect(meta.format).toBe("webp");
        });

        it("Keeps the original size when the image is smaller than the target", async () => {
            const result = await processAvatar(
                await createImage(64, 64).png().toBuffer(),
            );

            expect(result.width).toBe(64);
            expect(result.height).toBe(64);
        });

        it("Applies the exif orientation before resizing", async () => {
            const input = await createImage(400, 200)
                .withMetadata({ orientation: EXIF_ORIENTATION_ROTATED })
                .jpeg()
                .toBuffer();

            const result = await processAvatar(input);

            // стороны поменялись местами - значит поворот применился до ресайза
            expect(result.width).toBe(200);
            expect(result.height).toBe(400);
        });

        it("Drops the source metadata", async () => {
            const input = await createImage(800, 800)
                .withMetadata({ orientation: EXIF_ORIENTATION_ROTATED })
                .jpeg()
                .toBuffer();

            // страхуемся от того, что метаданных не было изначально
            // и тест проходит впустую
            expect((await sharp(input).metadata()).exif).toBeDefined();

            const meta = await sharp(
                (await processAvatar(input)).buffer,
            ).metadata();

            expect(meta.exif).toBeUndefined();
            expect(meta.hasProfile).toBe(false);
        });
    });
});
