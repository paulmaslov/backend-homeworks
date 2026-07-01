import { Module } from "@nestjs/common";
import { PostgresqlModule } from "./providers/databases/postgresql/postgresql.module";
import { ConfigsModule } from "./configs/config.module";
import { UsersModule } from "./features/users/users.module";
import { AuthModule } from "./auth/auth.module";

@Module({
    imports: [ConfigsModule, PostgresqlModule, UsersModule, AuthModule],
})
export class AppModule {}
