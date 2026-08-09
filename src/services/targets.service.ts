export {
  getTargetCategories,
  saveTargetCategory,
  removeTargetCategory,
  getTargetTypes,
  saveTargetType,
  removeTargetType,
} from "@/services/targets/targets-catalog.service";

export {
  getTargetTemplates,
  saveTargetTemplate,
  removeTargetTemplate,
} from "@/services/targets/targets-templates.service";

export {
  getTargets,
  getTarget,
  exportTargetsCsv,
} from "@/services/targets/targets-query.service";

export { assignTarget } from "@/services/targets/targets-assign.service";

export {
  recalculateTargetProgress,
  updateTarget,
  removeTarget,
} from "@/services/targets/targets-mutations.service";

export { getTargetDashboard } from "@/services/targets/targets-dashboard.service";

export { getDelayedCenter } from "@/services/targets/targets-delayed.service";

export {
  getTargetWarnings,
  sendTargetWarning,
  acknowledgeTargetWarning,
} from "@/services/targets/targets-warnings.service";

export { getEmployeeTargetPerformance } from "@/services/targets/targets-performance.service";
