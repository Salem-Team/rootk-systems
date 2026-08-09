import { addDays, formatISO, parseISO } from "date-fns";
import { MOCK_TODAY } from "@/lib/mock-date";

export function dayOffset(days: number): string {
  return formatISO(addDays(parseISO(MOCK_TODAY), days), {
    representation: "date",
  });
}
