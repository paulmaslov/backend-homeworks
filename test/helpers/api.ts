import { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types";

export const api = (app: INestApplication) =>
    request(app.getHttpServer() as App);

export const API_PREFIX = "/api/v1";
