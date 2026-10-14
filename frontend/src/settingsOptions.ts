import type { Settings } from "./api";

// Варианты для сегментированных переключателей. Ключи совпадают с TONES/LENGTHS/STRICTNESS в space/rag.py
export const TONE_OPTIONS: { value: Settings["tone"]; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "neutral", label: "Neutral" },
  { value: "formal", label: "Formal" },
];

export const LENGTH_OPTIONS: { value: Settings["length"]; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "detailed", label: "Detailed" },
];

export const STRICTNESS_OPTIONS: { value: Settings["strictness"]; label: string }[] = [
  { value: "strict", label: "Document only" },
  { value: "explain", label: "Explain terms" },
];

export function describeSettings(settings: Settings): string {
  const tone = TONE_OPTIONS.find((o) => o.value === settings.tone)?.label ?? settings.tone;
  const length = LENGTH_OPTIONS.find((o) => o.value === settings.length)?.label ?? settings.length;
  const strictness = STRICTNESS_OPTIONS.find((o) => o.value === settings.strictness)?.label ?? settings.strictness;
  return `${tone}, ${length.toLowerCase()} answers, ${strictness.toLowerCase()}${settings.use_lora ? ", LoRA on" : ""}`;
}
