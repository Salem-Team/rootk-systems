import type { WorkTask } from "@/types/work";
import type { SeedOf } from "@/types/seed";

import { workTasksSeed1 } from "./work/tasks-1";
import { workTasksSeed2 } from "./work/tasks-2";
import { workMeetingsSeed } from "./work/meetings";

export const workTasksSeed: SeedOf<WorkTask>[] = [
  ...workTasksSeed1,
  ...workTasksSeed2,
];

export { workMeetingsSeed };
export { workTasksSeed1, workTasksSeed2 };
