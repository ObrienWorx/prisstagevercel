// Centralised date formatting. All site-facing dates render in Australian
// Eastern time so they don't drift a day on the UTC server.
const TZ = 'Australia/Sydney';

// "29 June 2026"
export function fmtDate(d?: string | Date | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
}

// "29 Jun 2026"
export function fmtDateShort(d?: string | Date | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ });
}

// "29 Jun, 07:42 PM"
export function fmtDateTime(d?: string | Date | null) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ });
}

// "YYYY-MM-DD" in Sydney time, for <input type="date">
export function toDateInput(d?: string | Date | null) {
  return d ? new Date(d).toLocaleDateString('en-CA', { timeZone: TZ }) : '';
}

// Today's date as "YYYY-MM-DD" in Sydney time
export function todayInput() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

// "YYYY-MM-DDTHH:mm" in the BROWSER's local timezone, for <input type="datetime-local">.
// (Scheduling is entered in the admin's own local time; the browser converts to UTC on save.)
export function toLocalDateTimeInput(d?: string | Date | null) {
  if (!d) return '';
  const dt = new Date(d);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`;
}
