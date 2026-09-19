import { type HabitKind } from "./types";

type KindPickerProps = {
  id: string;
  value: HabitKind;
  isDisabled?: boolean;
  onChange: (kind: HabitKind) => void;
};

const kindOptions: { value: HabitKind; label: string }[] = [
  { value: "task", label: "TASK" },
  { value: "daily", label: "DAILY" },
  { value: "weekly", label: "WEEKLY" },
];

export function KindPicker({
  id,
  value,
  isDisabled = false,
  onChange,
}: KindPickerProps) {
  return (
    <fieldset className="flex flex-col gap-2" disabled={isDisabled}>
      <legend
        className="font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-cyan"
        id={id + "-label"}
      >
        Type
      </legend>
      <div
        aria-labelledby={id + "-label"}
        className="grid grid-cols-3 gap-1"
        role="group"
      >
        {kindOptions.map((option) => (
          <button
            aria-pressed={value === option.value}
            className={[
              "min-h-11 min-w-0 rounded-[4px] border px-0 font-orbitron text-[11px] font-bold uppercase tracking-[0px] transition disabled:cursor-not-allowed",
              value === option.value
                ? "border-cyan bg-cyan text-ground"
                : "border-cyan-divider bg-ground text-text-dim hover:border-cyan hover:text-cyan",
            ].join(" ")}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
