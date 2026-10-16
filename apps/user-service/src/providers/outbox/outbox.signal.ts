import { Injectable } from "@nestjs/common";

// досрочно заставляем relay отправить сообщение из аутбокса в кафку
@Injectable()
export class OutboxSignal {
    private wake?: () => void;

    notify(): void {
        this.wake?.();
    }

    wait(ms: number): Promise<void> {
        return new Promise((resolve) => {
            const done = (): void => {
                clearTimeout(timer);
                this.wake = undefined;
                resolve();
            };

            const timer = setTimeout(done, ms);

            this.wake = done;
        });
    }
}
