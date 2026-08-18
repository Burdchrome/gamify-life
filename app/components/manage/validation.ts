// Single source for the form-boundary limits. The DB constraints in
// supabase/migrations/ mirror these values as the backstop.
export const HABIT_NAME_MAX_LENGTH = 100;
export const WEEKLY_TARGET_MIN = 1;
export const WEEKLY_TARGET_MAX = 7;

export function validateHabitName(name: string) {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return { value: trimmedName, error: "Protocol name is required." };
  }

  if (trimmedName.length > HABIT_NAME_MAX_LENGTH) {
    return {
      value: trimmedName,
      error: `Protocol name must be ${HABIT_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { value: trimmedName, error: null };
}

export function validateWeeklyTarget(target: number) {
  if (
    !Number.isInteger(target) ||
    target < WEEKLY_TARGET_MIN ||
    target > WEEKLY_TARGET_MAX
  ) {
    return {
      value: target,
      error: `Weekly target must be a whole number from ${WEEKLY_TARGET_MIN} to ${WEEKLY_TARGET_MAX}.`,
    };
  }

  return { value: target, error: null };
}
