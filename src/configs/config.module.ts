import { ConfigModule } from "@nestjs/config";
import appConfig from "./app.config";
import { envValidationSchema } from "./env.validation";
import { Module } from "@nestjs/common";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [appConfig],
            validationSchema: envValidationSchema,
            validationOptions: {
                abortEarly: false, // показываем сразу все ошибки, а не только первую
            },
        }),
    ],
})
export class ConfigsModule {}
