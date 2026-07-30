export class BalanceResponseDto {
    readonly balance: string;

    constructor(balance: string) {
        this.balance = balance;
    }
}
