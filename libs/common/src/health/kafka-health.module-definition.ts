import { ConfigurableModuleBuilder } from "@nestjs/common";

export interface KafkaHealthModuleOptions {
    clientId: string;
    brokers: string[];
}

export const {
    ConfigurableModuleClass: KafkaHealthConfigurableModule,
    MODULE_OPTIONS_TOKEN: KAFKA_HEALTH_MODULE_OPTIONS,
} = new ConfigurableModuleBuilder<KafkaHealthModuleOptions>().build();
