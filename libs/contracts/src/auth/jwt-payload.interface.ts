export interface JwtPayload {
    sub: string;
}

export interface VerifiedJwtPayload extends JwtPayload {
    exp?: number;
}
