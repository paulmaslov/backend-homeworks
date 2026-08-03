import { ApiProperty } from "@nestjs/swagger";

import { MAX_USER_AGE, MIN_USER_AGE } from "@/features/users/user.constants";
import { User } from "@/features/users/user.model";

export class UserResponseDto {
    @ApiProperty({
        format: "uuid",
    })
    readonly id: string;

    @ApiProperty({ maxLength: 50, example: "john" })
    readonly login: string;

    @ApiProperty({
        format: "email",
        maxLength: 255,
        example: "john@example.com",
    })
    readonly email: string;

    @ApiProperty({ minimum: MIN_USER_AGE, maximum: MAX_USER_AGE, example: 25 })
    readonly age: number;

    @ApiProperty({
        type: String,
        nullable: true,
        maxLength: 1000,
        example: "Cool guy, frontend dev",
    })
    readonly description: string | null;

    constructor(user: User) {
        this.id = user.id;
        this.login = user.login;
        this.email = user.email;
        this.age = user.age;
        this.description = user.description;
    }
}
