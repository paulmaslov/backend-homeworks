import { ApiProperty } from "@nestjs/swagger";

import { buildAvatarUrl } from "@/features/avatars/avatar-url";
import { ActiveUser } from "@/features/users/active-user.queries.interface";
import { MAX_USER_AGE, MIN_USER_AGE } from "@/features/users/user.constants";

export class LastAvatarResponseDto {
    @ApiProperty({ format: "uuid" })
    readonly id: string;

    @ApiProperty({
        format: "uri",
        example: "https://cdn.example.com/profiles/8f3c1a2b.jpg",
    })
    readonly url: string;

    @ApiProperty({ format: "date-time" })
    readonly createdAt: Date;
}

export class ActiveUserResponseDto {
    @ApiProperty({ format: "uuid" })
    readonly id: string;

    @ApiProperty({ maxLength: 50, example: "john" })
    readonly login: string;

    @ApiProperty({ minimum: MIN_USER_AGE, maximum: MAX_USER_AGE, example: 25 })
    readonly age: number;

    @ApiProperty({ maxLength: 1000, example: "Cool guy, frontend dev" })
    readonly description: string;

    @ApiProperty({ description: "Number of active avatars", example: 4 })
    readonly avatarsCount: number;

    @ApiProperty({ type: LastAvatarResponseDto })
    readonly lastAvatar: LastAvatarResponseDto;

    constructor(user: ActiveUser, publicUrl: string) {
        this.id = user.id;
        this.login = user.login;
        this.age = user.age;
        this.description = user.description;
        this.avatarsCount = user.avatarsCount;
        this.lastAvatar = {
            id: user.lastAvatar.id,
            url: buildAvatarUrl(publicUrl, user.lastAvatar.fileName),
            createdAt: user.lastAvatar.createdAt,
        };
    }
}

export class ActiveUsersPageResponseDto {
    @ApiProperty({ type: [ActiveUserResponseDto] })
    readonly data: ActiveUserResponseDto[];

    // null означает, что это последняя страница
    @ApiProperty({
        type: String,
        nullable: true,
        description: "Next page token, null means this is the last page",
        example: "eyJhZ2UiOjI3LCJpZCI6IjBmNGQyYzNlIn0=",
    })
    readonly nextCursor: string | null;

    constructor(data: ActiveUserResponseDto[], nextCursor: string | null) {
        this.data = data;
        this.nextCursor = nextCursor;
    }
}
