"use client";

function formatTodayDate() {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const weekday = dateParts.find((part) => part.type === "weekday")?.value;
  const month = dateParts.find((part) => part.type === "month")?.value;
  const day = dateParts.find((part) => part.type === "day")?.value;

  return (weekday?.toUpperCase() ?? "RUN") + " " + (month ?? "00") + "." + (day ?? "00");
}

// Client leaf: the date must be the DEVICE's local calendar day, so it can't
// come from the server. suppressHydrationWarning: prerendered with the build
// machine's date; hydration swaps in the device's local date.
export function LocalDate() {
  return (
    <p
      suppressHydrationWarning
      className="mt-2 font-rajdhani text-2xl font-bold tracking-[-0.5px] text-text-primary"
    >
      {formatTodayDate()}
    </p>
  );
}
