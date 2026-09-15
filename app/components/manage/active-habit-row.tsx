"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TargetPicker } from "./target-picker";
import { type ManageHabit } from "./types";
import {
  HABIT_NAME_MAX_LENGTH,
  validateHabitName,
  validateWeeklyTarget,
} from "./validation";

type ActiveHabitRowProps = {
  habit: ManageHabit;
};

export function ActiveHabitRow({ habit }: ActiveHabitRowProps) {
  const router = useRouter();
  const [name, setName] = useState(habit.name);
  const [targetPerWeek, setTargetPerWeek] = useState(habit.target_per_week);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const isPending = isSaving || isArchiving;
  const isTask = habit.kind === "task";
  const hasChanges =
    name.trim() !== habit.name ||
    (!isTask && targetPerWeek !== habit.target_per_week);

  async function saveHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nameResult = validateHabitName(name);
    const targetResult = validateWeeklyTarget(targetPerWeek);

    if (nameResult.error || (!isTask && targetResult.error)) {
      setErrorMessage(nameResult.error ?? (!isTask ? targetResult.error : null));
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("habits")
        .update(
          isTask
            ? { name: nameResult.value }
            : { name: nameResult.value, target_per_week: targetPerWeek },
        )
        .eq("id", habit.id)
        .eq("is_archived", false);

      if (error) {
        console.error("Supabase habit update failed", {
          code: error.code,
          habitId: habit.id,
          message: error.message,
          nameLength: nameResult.value.length,
          targetPerWeek,
        });
        setErrorMessage("UPDATE FAILED - RETRY");
        return;
      }

      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown habit update error.";
      console.error("Supabase habit update failed", {
        habitId: habit.id,
        message,
      });
      setErrorMessage("UPDATE FAILED - RETRY");
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveHabit() {
    if (isPending) {
      return;
    }

    setIsArchiving(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("habits")
        .update({ is_archived: true })
        .eq("id", habit.id)
        .eq("is_archived", false);

      if (error) {
        console.error("Supabase habit archive failed", {
          code: error.code,
          habitId: habit.id,
          message: error.message,
        });
        setErrorMessage("ARCHIVE FAILED - RETRY");
        return;
      }

      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown habit archive error.";
      console.error("Supabase habit archive failed", {
        habitId: habit.id,
        message,
      });
      setErrorMessage("ARCHIVE FAILED - RETRY");
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <article
      aria-label={"Active protocol " + habit.name}
      className="rounded-[4px] border border-white/[0.06] bg-white/[0.02] px-[14px] py-3"
    >
      <form className="flex flex-col gap-3" onSubmit={saveHabit}>
        <div className="flex flex-col gap-2">
          <label
            className="font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-cyan"
            htmlFor={"habit-name-" + habit.id}
          >
            Protocol
          </label>
          <input
            aria-label={"Rename " + habit.name}
            className="min-h-12 rounded-[4px] border border-cyan-divider bg-ground px-4 font-rajdhani text-base font-bold uppercase tracking-[0.5px] text-text-primary outline-none transition focus:border-cyan disabled:cursor-not-allowed disabled:text-text-muted"
            disabled={isPending}
            id={"habit-name-" + habit.id}
            maxLength={HABIT_NAME_MAX_LENGTH}
            name="name"
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </div>

        {isTask ? null : (
          <TargetPicker
            id={"weekly-target-" + habit.id}
            isDisabled={isPending}
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

        <div className="grid grid-cols-2 gap-2">
          <button
            className="min-h-11 rounded-[4px] border border-cyan-divider px-3 font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-cyan transition hover:border-cyan disabled:cursor-not-allowed disabled:text-text-muted"
            disabled={isPending || !hasChanges}
            type="submit"
          >
            {isSaving ? "SAVING" : "SAVE"}
          </button>
          <button
            className="min-h-11 rounded-[4px] border border-cyan-divider px-3 font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-text-dim transition hover:border-cyan hover:text-cyan disabled:cursor-not-allowed disabled:text-text-muted"
            disabled={isPending}
            onClick={archiveHabit}
            type="button"
          >
            {isArchiving ? "ARCHIVING" : "ARCHIVE"}
          </button>
        </div>
      </form>
    </article>
  );
}
