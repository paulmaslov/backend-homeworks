import { HEALTH_PATH } from "../health/health.constants";
import { METRICS_PATH } from "../metrics/metrics.constants";
import { SWAGGER_PATH } from "./setup-swagger";

const SERVICE_PATHS = [
    `/${SWAGGER_PATH}`,
    `/${HEALTH_PATH}/`,
    `/${METRICS_PATH}`,
];

export function isServiceRequest(url: string | undefined): boolean {
    return SERVICE_PATHS.some((path) => url?.startsWith(path) ?? false);
}
