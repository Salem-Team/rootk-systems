import type { AppUser } from "@/types";

/** Admin-facing login account row (includes last admin-set password when known). */
export interface UserLoginAccount extends AppUser {
  /** Last password set by an admin; null if unknown or user changed it themselves. */
  loginPassword: string | null;
}
