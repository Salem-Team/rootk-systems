import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function parseNum(raw: string, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function PolicyNumberField({
  id,
  label,
  value,
  step = 0.25,
  min = 0,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  step?: number;
  min?: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step={step}
        min={min}
        disabled={disabled}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseNum(e.target.value, 0))}
      />
    </div>
  );
}
