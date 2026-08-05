import type { BaseEntity } from "@/types";

/** Raw seed row before audit fields are applied. */
export type SeedOf<T extends BaseEntity> = Omit<T, keyof BaseEntity>;
