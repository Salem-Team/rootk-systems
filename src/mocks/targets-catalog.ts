import { enrichWithAudit } from "@/lib/entity";
import type { TargetCategory, TargetTemplate, TargetType } from "@/types";

const ACTOR = "user-admin";

export const targetCategoriesSeed: TargetCategory[] = [
  enrichWithAudit(
    {
      id: "tcat-sales",
      name: "Sales",
      color: "#0F766E",
      icon: "Handshake",
      description: "Revenue and pipeline activity",
      active: true,
      sortOrder: 1,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "tcat-dev",
      name: "Development",
      color: "#082868",
      icon: "Code2",
      description: "Engineering delivery targets",
      active: true,
      sortOrder: 2,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "tcat-mkt",
      name: "Marketing",
      color: "#B45309",
      icon: "Megaphone",
      description: "Campaigns and content",
      active: true,
      sortOrder: 3,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "tcat-support",
      name: "Customer Support",
      color: "#0369A1",
      icon: "Headphones",
      description: "Service quality and response",
      active: true,
      sortOrder: 4,
    },
    ACTOR
  ),
];

export const targetTypesSeed: TargetType[] = [
  enrichWithAudit(
    {
      id: "ttype-calls",
      categoryId: "tcat-sales",
      name: "Calls",
      description: "Outbound sales calls",
      unit: "calls",
      taskTitleTemplate: "Call #{n}",
      active: true,
      sortOrder: 1,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "ttype-meetings",
      categoryId: "tcat-sales",
      name: "Meetings",
      description: "Client meetings",
      unit: "meetings",
      taskTitleTemplate: "Meeting #{n}",
      active: true,
      sortOrder: 2,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "ttype-followups",
      categoryId: "tcat-sales",
      name: "Follow Ups",
      description: "Follow-up actions",
      unit: "follow-ups",
      taskTitleTemplate: "Follow Up #{n}",
      active: true,
      sortOrder: 3,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "ttype-bugs",
      categoryId: "tcat-dev",
      name: "Bug Fixes",
      description: "Resolved bugs",
      unit: "bugs",
      taskTitleTemplate: "Bug Fix #{n}",
      active: true,
      sortOrder: 1,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "ttype-prs",
      categoryId: "tcat-dev",
      name: "Pull Requests",
      description: "Merged pull requests",
      unit: "PRs",
      taskTitleTemplate: "Pull Request #{n}",
      active: true,
      sortOrder: 2,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "ttype-posts",
      categoryId: "tcat-mkt",
      name: "Published Posts",
      description: "Published content pieces",
      unit: "posts",
      taskTitleTemplate: "Publish Post #{n}",
      active: true,
      sortOrder: 1,
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "ttype-organic-ads",
      categoryId: "tcat-mkt",
      name: "Organic Ads",
      description: "Published organic advertisements",
      unit: "ads",
      taskTitleTemplate: "Organic Ad #{n}",
      active: true,
      sortOrder: 2,
      metadata: { organicAds: true },
    },
    ACTOR
  ),
];

export const targetTemplatesSeed: TargetTemplate[] = [
  enrichWithAudit(
    {
      id: "ttpl-sales-daily",
      categoryId: "tcat-sales",
      name: "Sales Daily Target",
      description: "Standard daily sales activity pack",
      active: true,
      items: [
        {
          id: "tti-1",
          companyId: "",
          templateId: "ttpl-sales-daily",
          typeId: "ttype-calls",
          quantity: 10,
          unit: "calls",
          weight: 1,
          sortOrder: 0,
        },
        {
          id: "tti-2",
          companyId: "",
          templateId: "ttpl-sales-daily",
          typeId: "ttype-followups",
          quantity: 5,
          unit: "follow-ups",
          weight: 1,
          sortOrder: 1,
        },
        {
          id: "tti-3",
          companyId: "",
          templateId: "ttpl-sales-daily",
          typeId: "ttype-meetings",
          quantity: 2,
          unit: "meetings",
          weight: 2,
          sortOrder: 2,
        },
      ],
    },
    ACTOR
  ),
  enrichWithAudit(
    {
      id: "ttpl-organic-ads-weekly",
      categoryId: "tcat-mkt",
      name: "Weekly Organic Ads",
      description: "Standard weekly organic advertising quota",
      active: true,
      items: [
        {
          id: "tti-organic-ads",
          companyId: "",
          templateId: "ttpl-organic-ads-weekly",
          typeId: "ttype-organic-ads",
          quantity: 5,
          unit: "ads",
          weight: 1,
          sortOrder: 0,
        },
      ],
    },
    ACTOR
  ),
];
