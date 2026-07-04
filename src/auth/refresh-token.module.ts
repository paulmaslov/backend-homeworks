import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { RefreshToken } from "./refresh-token.model";
import { IRefreshTokenRepository } from "./refresh-token.repository.interface";
import { RefreshTokenRepository } from "./refresh-token.repository";

@Module({
    imports: [SequelizeModule.forFeature([RefreshToken])],
    providers: [
        { provide: IRefreshTokenRepository, useClass: RefreshTokenRepository },
    ],
    exports: [IRefreshTokenRepository],
})
export class RefreshTokenModule {}
