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
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiConflictResponse,
    ApiConsumes,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOperation,
    ApiParam,
    ApiPayloadTooLargeResponse,
    ApiTags,
    ApiUnauthorizedResponse,
    ApiUnsupportedMediaTypeResponse,
} from "@nestjs/swagger";

import { ApiCommonResponses } from "@/auth/decorators/api-common-responses.decorator";
import { CurrentUser } from "@/auth/decorators/current-user.decorator";
import { AccessTokenGuard } from "@/auth/guards/access-token.guard";
import { ErrorResponseDto } from "@/common/dto/error-response.dto";
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
@ApiCommonResponses()
@ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: "Not authenticated",
})
@UseGuards(AccessTokenGuard)
@Controller("users/me/avatars")
export class AvatarsController {
    constructor(private readonly avatarService: AvatarService) {}

    @ApiOperation({ summary: "Upload an avatar for the authenticated user" })
    @ApiConsumes("multipart/form-data")
    @ApiBody({ type: UploadAvatarDto })
    @ApiCreatedResponse({ type: AvatarResponseDto })
    @ApiBadRequestResponse({
        type: ErrorResponseDto,
        description: "File is required",
    })
    @ApiPayloadTooLargeResponse({
        type: ErrorResponseDto,
        description: "File is too large",
    })
    @ApiUnsupportedMediaTypeResponse({
        type: ErrorResponseDto,
        description: "Only jpeg and png are allowed",
    })
    @ApiConflictResponse({
        type: ErrorResponseDto,
        description: `Active avatars limit is ${MAX_ACTIVE_AVATARS}`,
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
    @ApiParam({ name: "id", format: "uuid", description: "Avatar identifier" })
    @ApiNoContentResponse({ description: "Avatar deleted" })
    @ApiBadRequestResponse({
        type: ErrorResponseDto,
        description: "Invalid avatar id",
    })
    @ApiNotFoundResponse({
        type: ErrorResponseDto,
        description: "Avatar not found",
    })
    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(
        @CurrentUser("userId") userId: string,
        @Param("id", ParseUUIDPipe) avatarId: string,
    ): Promise<void> {
        await this.avatarService.remove(userId, avatarId);
    }
}
