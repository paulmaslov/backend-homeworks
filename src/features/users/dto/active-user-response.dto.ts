import { buildAvatarUrl } from "@/features/avatars/avatar-url";
import { ActiveUser } from "@/features/users/active-user.queries.interface";

export class LastAvatarResponseDto {
    readonly id: string;
    readonly url: string;
    readonly createdAt: Date;
}

export class ActiveUserResponseDto {
    readonly id: string;
    readonly login: string;
    readonly age: number;
    readonly description: string;
    readonly avatarsCount: number;
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
    readonly data: ActiveUserResponseDto[];
    // null означает, что это последняя страница
    readonly nextCursor: string | null;

    constructor(data: ActiveUserResponseDto[], nextCursor: string | null) {
        this.data = data;
        this.nextCursor = nextCursor;
    }
}
