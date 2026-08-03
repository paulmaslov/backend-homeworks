import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { RefreshToken } from "./refresh-token.model";
import { RefreshTokenRepository } from "./refresh-token.repository";
import { IRefreshTokenRepository } from "./refresh-token.repository.interface";

@Module({
    imports: [SequelizeModule.forFeature([RefreshToken])],
    providers: [
        { provide: IRefreshTokenRepository, useClass: RefreshTokenRepository },
    ],
    exports: [IRefreshTokenRepository],
})
export class RefreshTokenModule {}
