import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import {
  addEvidenceLink,
  EVIDENCE_LINKS_MAX,
  resolveTaskEvidence,
  validateTaskEvidence,
} from "@/lib/task-evidence";
import { updateWorkTaskStatus } from "@/services/work.service";
import type { WorkTask } from "@/types/work";

/** Owns link/notes draft state and completion submission for the evidence dialog. */
export function useTaskCompletionEvidence({
  task,
  open,
  onOpenChange,
  onCompleted,
}: {
  task: WorkTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: (task: WorkTask) => void;
}) {
  const { t } = useTranslation();
  const [links, setLinks] = useState<string[]>([]);
  const [linkDraft, setLinkDraft] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !task) return;
    const existing = resolveTaskEvidence(task);
    setLinks(existing.links);
    setNotes(existing.notes);
    setLinkDraft("");
    setLinkError(null);
    setBusy(false);
    setTouched(false);
  }, [open, task]);

  const requireLinks = Boolean(task?.requireEvidenceLinks);
  /** Notes are always mandatory when an employee marks Done. */
  const requireNotes = true;

  const validation = useMemo(() => {
    if (!task) return { ok: true as const };
    return validateTaskEvidence(task, { links, notes });
  }, [task, links, notes]);

  function tryAddLink(raw = linkDraft) {
    const result = addEvidenceLink(links, raw);
    if (result.error === "invalid") {
      setLinkError(t("workEvidence.linkInvalid"));
      return;
    }
    if (result.error === "duplicate") {
      setLinkError(t("workEvidence.linkDuplicate"));
      return;
    }
    if (result.error === "limit") {
      setLinkError(t("workEvidence.linkLimit", { max: EVIDENCE_LINKS_MAX }));
      return;
    }
    setLinks(result.links);
    setLinkDraft("");
    setLinkError(null);
  }

  function onLinkKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      tryAddLink();
    }
  }

  function removeLink(link: string) {
    setLinks((prev) => prev.filter((x) => x !== link));
  }

  async function submit() {
    if (!task) return;
    setTouched(true);

    let nextLinks = links;
    if (linkDraft.trim()) {
      const added = addEvidenceLink(links, linkDraft);
      if (added.error) {
        setLinkError(
          added.error === "duplicate"
            ? t("workEvidence.linkDuplicate")
            : added.error === "limit"
              ? t("workEvidence.linkLimit", { max: EVIDENCE_LINKS_MAX })
              : t("workEvidence.linkInvalid")
        );
        if (requireLinks && links.length === 0) {
          toast.error(t("workEvidence.validationLinks"));
          return;
        }
      } else {
        nextLinks = added.links;
        setLinks(added.links);
        setLinkDraft("");
        setLinkError(null);
      }
    }

    const check = validateTaskEvidence(task, { links: nextLinks, notes });
    if (!check.ok) {
      toast.error(
        check.code === "notes"
          ? t("workEvidence.validationNotes")
          : check.code === "links"
            ? t("workEvidence.validationLinks")
            : t("workEvidence.validationBoth")
      );
      return;
    }

    setBusy(true);
    const res = await updateWorkTaskStatus(task.id, "completed", {
      links: nextLinks,
      notes: notes.trim(),
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    toast.success(t("workEvidence.submitted"));
    onCompleted(res.data);
    onOpenChange(false);
  }

  return {
    links,
    linkDraft,
    setLinkDraft,
    notes,
    setNotes,
    busy,
    touched,
    linkError,
    setLinkError,
    requireLinks,
    requireNotes,
    validation,
    tryAddLink,
    onLinkKeyDown,
    removeLink,
    submit,
  };
}
