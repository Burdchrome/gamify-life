import { WEEKLY_TARGET_MAX, WEEKLY_TARGET_MIN } from "./validation";

type TargetPickerProps = {
  id: string;
  label: string;
  value: number;
  isDisabled?: boolean;
  onChange: (value: number) => void;
};

const targetValues = Array.from(
  { length: WEEKLY_TARGET_MAX - WEEKLY_TARGET_MIN + 1 },
  (_, index) => WEEKLY_TARGET_MIN + index,
);

export function TargetPicker({
  id,
  label,
  value,
  isDisabled = false,
  onChange,
}: TargetPickerProps) {
  return (
    <fieldset className="flex flex-col gap-2" disabled={isDisabled}>
      <legend
        className="font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-cyan"
        id={id + "-label"}
      >
        {label}
      </legend>
      <div
        aria-labelledby={id + "-label"}
        className="grid grid-cols-7 gap-1"
        role="group"
      >
        {targetValues.map((targetValue) => (
          <button
            aria-pressed={value === targetValue}
            className={[
              "min-h-11 min-w-0 rounded-[4px] border px-0 font-orbitron text-[11px] font-bold uppercase tracking-[0px] transition disabled:cursor-not-allowed",
              value === targetValue
                ? "border-cyan bg-cyan text-ground"
                : "border-cyan-divider bg-ground text-text-dim hover:border-cyan hover:text-cyan",
            ].join(" ")}
            key={targetValue}
            onClick={() => onChange(targetValue)}
            type="button"
          >
            {targetValue}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
