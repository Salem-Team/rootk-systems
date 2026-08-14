import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Skip global JWT auth (login, refresh, health, etc.). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
