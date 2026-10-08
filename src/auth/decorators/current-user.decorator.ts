import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { CurrentUserData } from "@/common/interfaces/current-user.interface";

export const CurrentUser = createParamDecorator(
    (
        data: keyof CurrentUserData | undefined,
        ctx: ExecutionContext,
    ): CurrentUserData | string => {
        const request = ctx
            .switchToHttp()
            .getRequest<{ user: CurrentUserData }>();
        const user: CurrentUserData = request.user;

        return data ? user[data] : user;
    },
);
