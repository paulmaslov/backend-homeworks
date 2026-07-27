import {
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
    ApiBearerAuth,
    ApiBody,
    ApiConflictResponse,
    ApiConsumes,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOperation,
    ApiPayloadTooLargeResponse,
    ApiTags,
    ApiUnauthorizedResponse,
    ApiUnsupportedMediaTypeResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "@/auth/decorators/current-user.decorator";
import { AccessTokenGuard } from "@/auth/guards/access-token.guard";
import { ImageFileValidationPipe } from "@/common/pipes/image-file-validation.pipe";
import { AvatarService } from "@/features/avatars/avatar.service";
import {
    ALLOWED_AVATAR_MIME_TYPES,
    AVATAR_FIELD_NAME,
    MAX_ACTIVE_AVATARS,
    MAX_AVATAR_SIZE_BYTES,
} from "@/features/avatars/avatars.constants";
import { AvatarResponseDto } from "@/features/avatars/dto/avatar-response.dto";
import { UploadAvatarDto } from "@/features/avatars/dto/upload-avatar.dto";

@ApiTags("avatars")
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller("users/me/avatars")
export class AvatarsController {
    constructor(private readonly avatarService: AvatarService) {}

    @ApiOperation({ summary: "Upload an avatar for the authenticated user" })
    @ApiConsumes("multipart/form-data")
    @ApiBody({ type: UploadAvatarDto })
    @ApiCreatedResponse({ type: AvatarResponseDto })
    @ApiUnauthorizedResponse({ description: "Not authenticated" })
    @ApiPayloadTooLargeResponse({ description: "File is too large" })
    @ApiUnsupportedMediaTypeResponse({
        description: "Only jpeg and png are allowed",
    })
    @ApiConflictResponse({
        description: `Active avatars limit is ${MAX_ACTIVE_AVATARS}`,
    })
    @Post()
    @UseInterceptors(
        FileInterceptor(AVATAR_FIELD_NAME, {
            limits: { fileSize: MAX_AVATAR_SIZE_BYTES, files: 1 },
        }),
    )
    async upload(
        @CurrentUser("userId") userId: string,
        @UploadedFile(
            new ImageFileValidationPipe({
                maxSizeBytes: MAX_AVATAR_SIZE_BYTES,
                mimeTypes: ALLOWED_AVATAR_MIME_TYPES,
            }),
        )
        file: Express.Multer.File,
    ): Promise<AvatarResponseDto> {
        return this.avatarService.upload(userId, file);
    }

    @ApiOperation({
        summary: "Soft delete one of the authenticated user's avatars",
    })
    @ApiNoContentResponse({ description: "Avatar deleted" })
    @ApiUnauthorizedResponse({ description: "Not authenticated" })
    @ApiNotFoundResponse({ description: "Avatar not found" })
    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(
        @CurrentUser("userId") userId: string,
        @Param("id", ParseUUIDPipe) avatarId: string,
    ): Promise<void> {
        await this.avatarService.remove(userId, avatarId);
    }
}
