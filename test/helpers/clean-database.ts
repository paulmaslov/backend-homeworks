import {INestApplication} from "@nestjs/common";
import {Sequelize} from "sequelize-typescript";

export async function cleanDatabase(app: INestApplication): Promise<void> {
    const sequelize = app.get(Sequelize);

    // truncate а не destroy чтобы обходить paranoid у таблицы users
    await sequelize.truncate({ cascade: true });
}