import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { AccessTokenConfigurableModule } from "./access-token.module-definition";
import { AccessTokenVerifier } from "./access-token.verifier";

@Global()
@Module({
    imports: [JwtModule.register({})],
    providers: [AccessTokenVerifier],
    exports: [AccessTokenVerifier],
})
export class AccessTokenModule extends AccessTokenConfigurableModule {}
