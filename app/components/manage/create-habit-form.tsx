"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KindPicker } from "./kind-picker";
import { TargetPicker } from "./target-picker";
import { type HabitKind } from "./types";
import {
  HABIT_NAME_MAX_LENGTH,
  validateHabitName,
  validateWeeklyTarget,
} from "./validation";

export function CreateHabitForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<HabitKind>("daily");
  const [targetPerWeek, setTargetPerWeek] = useState(4);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nameResult = validateHabitName(name);
    const targetResult = validateWeeklyTarget(targetPerWeek);

    if (nameResult.error || (kind !== "task" && targetResult.error)) {
      setErrorMessage(
        nameResult.error ?? (kind !== "task" ? targetResult.error : null),
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.from("habits").insert({
        name: nameResult.value,
        kind,
        // A task has no weekly target; 1 satisfies the DB's 1-7 backstop and
        // is never rendered for kind=task.
        target_per_week: kind === "task" ? 1 : targetPerWeek,
      });

      if (error) {
        console.error("Supabase habit create failed", {
          code: error.code,
          message: error.message,
          nameLength: nameResult.value.length,
          targetPerWeek,
        });
        setErrorMessage("CREATE FAILED - RETRY");
        return;
      }

      setName("");
      setKind("daily");
      setTargetPerWeek(4);
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown habit create error.";
      console.error("Supabase habit create failed", { message });
      setErrorMessage("CREATE FAILED - RETRY");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      aria-label="Create protocol"
      className="rounded-[4px] border border-cyan-divider bg-surface p-4"
      onSubmit={createHabit}
    >
      <p className="font-orbitron text-[10px] font-bold uppercase tracking-[3px] text-cyan">
        NEW PROTOCOL
      </p>
      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label
            className="font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-cyan"
            htmlFor="create-habit-name"
          >
            Protocol Name
          </label>
          <input
            className="min-h-12 rounded-[4px] border border-cyan-divider bg-ground px-4 font-rajdhani text-lg font-semibold uppercase tracking-[0.5px] text-text-primary outline-none transition placeholder:text-text-muted focus:border-cyan disabled:cursor-not-allowed disabled:text-text-muted"
            disabled={isSubmitting}
            id="create-habit-name"
            maxLength={HABIT_NAME_MAX_LENGTH}
            name="name"
            onChange={(event) => setName(event.target.value)}
            placeholder="MEDITATE"
            required
            value={name}
          />
        </div>

        <KindPicker
          id="create-kind"
          isDisabled={isSubmitting}
          onChange={setKind}
          value={kind}
        />

        {kind === "task" ? null : (
          <TargetPicker
            id="create-weekly-target"
            isDisabled={isSubmitting}
            label="Weekly Target"
            onChange={setTargetPerWeek}
            value={targetPerWeek}
          />
        )}

        {errorMessage ? (
          <p
            className="font-rajdhani text-[13px] font-semibold uppercase tracking-[0.5px] text-error"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <button
          className="min-h-12 rounded-[4px] border border-cyan bg-cyan px-4 font-orbitron text-xs font-bold uppercase tracking-[3px] text-ground transition hover:bg-ground hover:text-cyan disabled:cursor-not-allowed disabled:border-cyan-divider disabled:bg-ground disabled:text-text-muted"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "UPLOADING" : "UPLOAD"}
        </button>
      </div>
    </form>
  );
}
