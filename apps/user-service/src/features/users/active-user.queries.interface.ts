// для курсорной пагинации, чтобы не перебирать строки
export interface ActiveUsersKeyset {
    readonly age: number;
    readonly id: string;
}

export interface FindActiveUsersParams {
    readonly ageFrom: number;
    readonly ageTo: number;
    readonly limit: number;
    // отсутствует на первой странице
    readonly keyset?: ActiveUsersKeyset;
}

export interface ActiveUserLastAvatar {
    readonly id: string;
    // без домена и папки
    readonly fileName: string;
    readonly createdAt: Date;
}

export interface ActiveUser {
    readonly id: string;
    readonly login: string;
    readonly age: number;
    readonly description: string;
    readonly avatarsCount: number;
    readonly lastAvatar: ActiveUserLastAvatar;
}

export interface ActiveUsersPage {
    readonly rows: ActiveUser[];
    readonly hasMore: boolean;
}

export abstract class IActiveUserQueries {
    abstract find(params: FindActiveUsersParams): Promise<ActiveUsersPage>;
}
