import { CreateUserDto } from "@/features/users/dto/create-user.dto";

const baseUser: CreateUserDto = {
    login: "test_user",
    email: "test@example.com",
    password: "strongPassw0rd",
    age: 25,
};

// ключи - только из dto, значения - любые
export type UserOverrides = Partial<Record<keyof CreateUserDto, unknown>>;

export const buildUser = (overrides: UserOverrides = {}) => ({
    ...baseUser,
    ...overrides,
});
