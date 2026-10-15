import { ConfigurableModuleBuilder } from "@nestjs/common";

export interface AccessTokenModuleOptions {
    publicKey: string;
}

export const {
    ConfigurableModuleClass: AccessTokenConfigurableModule,
    MODULE_OPTIONS_TOKEN: ACCESS_TOKEN_MODULE_OPTIONS,
} = new ConfigurableModuleBuilder<AccessTokenModuleOptions>().build();
