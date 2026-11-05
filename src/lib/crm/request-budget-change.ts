/** What changed when a lead's request and/or budget is saved. */

export type RequestBudgetChange = {
  request?: { from: string; to: string };
  budget?: { from: string; to: string };
};

const CLIP = 500;

function clip(value: string): string {
  const text = value.trim();
  if (!text) return "—";
  return text.length > CLIP ? `${text.slice(0, CLIP - 1)}…` : text;
}

export function requestBudgetChange(input: {
  previousRequest: string;
  previousBudget: string;
  nextRequest?: string;
  nextBudget?: string;
  requestTouched: boolean;
  budgetTouched: boolean;
}): RequestBudgetChange | null {
  const change: RequestBudgetChange = {};
  if (input.requestTouched) {
    const from = input.previousRequest.trim();
    const to = (input.nextRequest ?? "").trim();
    if (from !== to) change.request = { from, to };
  }
  if (input.budgetTouched) {
    const from = input.previousBudget.trim();
    const to = (input.nextBudget ?? "").trim();
    if (from !== to) change.budget = { from, to };
  }
  if (!change.request && !change.budget) return null;
  return change;
}

export function describeRequestBudgetChange(change: RequestBudgetChange): {
  title: string;
  description: string;
  previousValue: string;
  newValue: string;
} {
  const description: string[] = [];
  const previous: string[] = [];
  const next: string[] = [];

  if (change.request) {
    description.push(
      `Request: ${clip(change.request.from)} → ${clip(change.request.to)}`
    );
    previous.push(`Request: ${clip(change.request.from)}`);
    next.push(`Request: ${clip(change.request.to)}`);
  }
  if (change.budget) {
    description.push(
      `Budget: ${clip(change.budget.from)} → ${clip(change.budget.to)}`
    );
    previous.push(`Budget: ${clip(change.budget.from)}`);
    next.push(`Budget: ${clip(change.budget.to)}`);
  }

  const title =
    change.request && change.budget
      ? "Request and budget updated"
      : change.request
        ? "Request updated"
        : "Budget updated";

  return {
    title,
    description: description.join("\n"),
    previousValue: previous.join("\n"),
    newValue: next.join("\n"),
  };
}
