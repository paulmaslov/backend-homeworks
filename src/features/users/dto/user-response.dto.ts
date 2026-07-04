import { User } from "@/features/users/user.model";

export class UserResponseDto {
    readonly id: string;
    readonly login: string;
    readonly email: string;
    readonly age: number;
    readonly description: string | null;

    constructor(user: User) {
        this.id = user.id;
        this.login = user.login;
        this.email = user.email;
        this.age = user.age;
        this.description = user.description;
    }
}
