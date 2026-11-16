const dayMs = 86400000;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (value) => {
  if (!isoDate.test(value || "")) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

export const dateKey = (value) => String(value).slice(0, 10);
export const clockValue = (value) =>
  value ? String(value).match(/(?:T|^)(\d{2}:\d{2})/)?.[1] || null : null;

export function monthDays(month, rows = [], localToday) {
  const [year, index] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, index - 1, 1));
  const count = new Date(Date.UTC(year, index, 0)).getUTCDate();
  const overrides = new Map(rows.map((row) => [dateKey(row.date), row]));
  return {
    offset: first.getUTCDay(),
    days: Array.from({ length: count }, (_, i) => {
      const day = `${month}-${String(i + 1).padStart(2, "0")}`;
      const override = overrides.get(day);
      return {
        date: day,
        number: i + 1,
        override,
        status: override?.status || "Available",
        past: day < localToday,
        today: day === localToday,
      };
    }),
  };
}

export function dateSelection(day, row) {
  const editable = row?.status !== "Booked" ? row : null;
  return {
    from: day,
    to: day,
    status: editable?.status === "Available" ? "Available" : "Blocked",
    startTime: clockValue(editable?.startTime),
    endTime: clockValue(editable?.endTime),
    notes: editable?.notes || "",
    overrideId: editable?.id || null,
  };
}

export function selectedDays(form) {
  if (!validDay(form.from) || !validDay(form.to) || form.to < form.from)
    return 0;
  return (
    Math.round(
      (new Date(`${form.to}T12:00:00Z`) - new Date(`${form.from}T12:00:00Z`)) /
        dayMs,
    ) + 1
  );
}

export function validateAvailability(form, rows, localToday) {
  if (!validDay(form.from) || !validDay(form.to))
    return "Choose a valid start and end date.";
  if (form.from < localToday) return "Choose today or a future date.";
  if (form.to < form.from)
    return "The end date must be on or after the start date.";
  if (selectedDays(form) > 91) return "Choose a date range of up to 91 days.";
  if (
    rows.some(
      (row) =>
        row.status === "Booked" &&
        dateKey(row.date) >= form.from &&
        dateKey(row.date) <= form.to,
    )
  )
    return "This range includes a booked date. Choose dates without existing bookings.";
  if (form.status === "Available") {
    const time = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (
      (form.startTime || form.endTime) &&
      (!time.test(form.startTime || "") ||
        !time.test(form.endTime || "") ||
        form.endTime <= form.startTime)
    )
      return "Set both times, with the end after the start.";
  }
  if (form.notes.length > 500) return "Keep notes within 500 characters.";
  return null;
}

export function availabilityPayload(form) {
  return {
    from: form.from,
    to: form.to,
    status: form.status,
    startTime: form.status === "Available" ? form.startTime || null : null,
    endTime: form.status === "Available" ? form.endTime || null : null,
    notes: form.notes.trim(),
  };
}
