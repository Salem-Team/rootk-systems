import { copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
copyFileSync(
  join(root, "shared", "phone-normalize.ts"),
  join(root, "backend", "src", "lib", "phone-normalize.ts")
);
